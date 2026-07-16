-- ============================================================
-- ⚠️  NÃO RODE ESTE ARQUIVO INTEIRO — é documentação do schema
-- que já existe em produção no projeto Supabase "resilcon-relatorios"
-- (aumfhrqrnudmprvmvesb), no schema "public". A migration de
-- classificação diária (seção 2 abaixo) já foi aplicada em 2026-07-16.
-- ============================================================

-- Tabelas existentes (schema public), criadas numa conversa anterior:

-- colaboradores
--   id uuid, nome text, departamento text, supervisor text,
--   status text, cpf text, created_at timestamptz,
--   tipo_colaborador text ('efetivo' | 'estagiario')  <- adicionada em 2026-07-16

-- neocode_diario
--   id uuid, colaborador_id uuid, data date,
--   distracao interval, neutro interval, produtivo interval,
--   ausencias interval, atividades interval, aproveitaveis interval,
--   total interval, resultado interval,
--   inicio time, fim time, created_at timestamptz

-- tarefas_gclick
--   id uuid, colaborador_id uuid, data date, hora time,
--   categoria text, inscricao text, cliente text, sistema text,
--   departamento text, tarefa text, duracao interval, created_at timestamptz

-- performance_gclick
--   id uuid, colaborador_id uuid, data_referencia date,
--   qtd_total int, qtd_abertas int, qtd_atrasadas int, qtd_pendentes int,
--   qtd_realizadas int, qtd_concluidas_meta int, qtd_concluidas_fora_meta int,
--   qtd_concluidas_fora_prazo int, qtd_dispensadas int,
--   pct_aberto numeric, pct_atraso numeric, pct_entregue_meta numeric,
--   pct_entregue_fora_meta numeric, pct_entregue_fora_prazo numeric,
--   pct_dispensada numeric, created_at timestamptz

-- ponto_diario
--   id uuid, colaborador_id uuid, data date,
--   horas_trabalhadas interval, created_at timestamptz

-- ============================================================
-- Seção 2 — Migration de classificação diária (JÁ APLICADA)
-- Regras (fornecidas pelo usuário, baseadas na fórmula da planilha):
--   - Jornada: 9h (seg-qui), 8h (sex), já líquidas de almoço
--   - Estagiário: jornada fixa de 6h todos os dias
--   - LM (lançamento mínimo) = 85% da jornada esperada
--   - Tolerância "acima da jornada" = jornada esperada * 1.02
--   - Fórmula original (Excel):
--     =SE(C6=0;"SEM LANÇAMENTO";
--       SE(G6="ESTAGIARIO";
--         SE(E(C6>0;C6<$F$2);"ABAIXO DO LM";
--           SE(C6>$F$1*1,02;"ACIMA DA JORNADA";"OK"));
--         SE(E(C6>0;C6<$C$2);"ABAIXO DO LM";
--           SE(C6>$C$1*1,02;"ACIMA DA JORNADA";"OK"))))
-- ============================================================

alter table public.colaboradores
  add column if not exists tipo_colaborador text not null default 'efetivo'
  check (tipo_colaborador in ('efetivo', 'estagiario'));

create or replace view public.vw_resumo_diario as
select
    c.id as colaborador_id,
    c.nome,
    c.departamento,
    c.supervisor,
    c.status,
    d.data,
    p.horas_trabalhadas,
    n.produtivo,
    n.distracao,
    n.ausencias,
    n.resultado,
    n.inicio,
    n.fim,
    coalesce(t.total_gclick, '00:00:00'::interval) as total_gclick,
    c.tipo_colaborador,
    j.jornada_esperada,
    j.lm_esperado,
    case
        when p.horas_trabalhadas is null or p.horas_trabalhadas = '00:00:00'::interval
            then 'SEM LANCAMENTO'
        when j.jornada_esperada is null
            then null
        when p.horas_trabalhadas > '00:00:00'::interval and p.horas_trabalhadas < j.lm_esperado
            then 'ABAIXO DO LM'
        when p.horas_trabalhadas > j.jornada_esperada * 1.02
            then 'ACIMA DA JORNADA'
        else 'OK'
    end as classificacao
from colaboradores c
cross join (
    select distinct ponto_diario.data from ponto_diario
    union
    select distinct neocode_diario.data from neocode_diario
) d
left join ponto_diario p on p.colaborador_id = c.id and p.data = d.data
left join neocode_diario n on n.colaborador_id = c.id and n.data = d.data
left join (
    select tarefas_gclick.colaborador_id, tarefas_gclick.data,
           sum(tarefas_gclick.duracao) as total_gclick
    from tarefas_gclick
    group by tarefas_gclick.colaborador_id, tarefas_gclick.data
) t on t.colaborador_id = c.id and t.data = d.data
cross join lateral (
    select
        jornada_esperada,
        jornada_esperada * 0.85 as lm_esperado
    from (
        select
            case
                when c.tipo_colaborador = 'estagiario' then interval '6 hours'
                when extract(dow from d.data) = 5 then interval '8 hours'
                when extract(dow from d.data) in (1,2,3,4) then interval '9 hours'
                else null::interval
            end as jornada_esperada
    ) x
) j
where c.status = 'ativo';

-- Nota técnica importante: CREATE OR REPLACE VIEW não permite renomear ou
-- reordenar colunas já existentes — só permite ADICIONAR colunas no final
-- da lista. Por isso as 14 colunas originais ficam intactas na mesma ordem,
-- e as novas (tipo_colaborador, jornada_esperada, lm_esperado, classificacao)
-- vêm depois. Se precisar adicionar mais colunas no futuro, sempre no final.

-- Segurança (confirmada em 2026-07-16, continua válida após a migration):
--   - RLS habilitado em todas as 5 tabelas
--   - Única policy em cada uma: "leitura publica", comando SELECT, roles {public}
--   - Sem policies de INSERT/UPDATE/DELETE para anon — só leitura
--   - Testado com a publishable key: GET /rest/v1/vw_resumo_diario → HTTP 200

-- ============================================================
-- Seção 3 — Justificativas dos gestores (JÁ APLICADA em 2026-07-16)
-- Tabela append-only: cada justificativa é uma linha nova (nunca
-- UPDATE/DELETE), então funciona como histórico/auditoria natural.
-- A view sempre traz a justificativa MAIS RECENTE por colaborador/dia.
-- ============================================================

create table if not exists public.justificativas_diarias (
    id uuid primary key default gen_random_uuid(),
    colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
    data date not null,
    justificativa text not null,
    gestor_nome text,
    criado_em timestamptz not null default now()
);

create index if not exists idx_justificativas_colab_data
    on public.justificativas_diarias (colaborador_id, data);

alter table public.justificativas_diarias enable row level security;

create policy "leitura publica" on public.justificativas_diarias
    for select using (true);

-- Sem autenticação individual, não dá pra restringir QUEM pode gravar
-- (a política abaixo permite insert de qualquer requisição com a
-- publishable key, que já é visível no index.html). O gestor digita o
-- próprio nome no formulário — não é uma identidade verificada, é só
-- atribuição informal. NÃO existe policy de UPDATE/DELETE: ninguém
-- consegue alterar ou apagar uma justificativa já registrada, só
-- adicionar uma nova (por isso funciona como log de auditoria).
create policy "insercao publica" on public.justificativas_diarias
    for insert with check (true);

-- vw_resumo_diario ganhou 3 colunas no final:
--   ultima_justificativa, ultima_justificativa_gestor, ultima_justificativa_em
-- (via left join lateral pegando o registro mais recente por colaborador/dia)

-- Testado em 2026-07-16: POST com a publishable key retorna 23503
-- (foreign key violation) para colaborador_id inexistente — confirma que
-- a RLS deixa passar o insert (erro é de integridade referencial, não
-- de permissão). GET na view continua HTTP 200.

-- Pendências:
--   - Popular tipo_colaborador = 'estagiario' pros colaboradores certos
--     (hoje todo mundo cai no default 'efetivo')
--   - Se no futuro quiser saber COM CERTEZA qual gestor registrou cada
--     justificativa (em vez de um nome digitado livremente), o caminho é
--     trocar a senha única compartilhada por login individual (Supabase Auth)

-- ============================================================
-- Seção 4 — Correção da classificação (JÁ APLICADA em 2026-07-16)
-- BUG encontrado: a Seção 2 implementou a fórmula usando
-- p.horas_trabalhadas (Tangerino/ponto) como o "C6" da fórmula original.
-- Errado -- releitura da planilha real confirmou que a coluna C da aba GTS
-- é "Total GCLICK", não "Horas Tangerino" (essa é a coluna D). A fórmula
-- sempre comparou o TOTAL GCLICK contra jornada/LM, nunca o Tangerino.
-- Sintoma: colaboradores com Tangerino "estourado" (ex.: esqueceu de bater
-- saída) apareciam como "ACIMA DA JORNADA" mesmo com G-Click normal (caso
-- real: Lucas Alcantara Frazao, Tangerino 09:38:00 vs G-Click 08:03:01 --
-- deveria ser "OK", estava "ACIMA DA JORNADA").
-- Correção: troca o valor testado no CASE de p.horas_trabalhadas para
-- coalesce(t.total_gclick, '00:00:00'). horas_trabalhadas continua exposta
-- na view (coluna de referência), só não entra mais na classificação.
-- ============================================================

create or replace view public.vw_resumo_diario as
select
    c.id as colaborador_id,
    c.nome,
    c.departamento,
    c.supervisor,
    c.status,
    d.data,
    p.horas_trabalhadas,
    n.produtivo,
    n.distracao,
    n.ausencias,
    n.resultado,
    n.inicio,
    n.fim,
    coalesce(t.total_gclick, '00:00:00'::interval) as total_gclick,
    c.tipo_colaborador,
    j.jornada_esperada,
    j.lm_esperado,
    case
        when coalesce(t.total_gclick, '00:00:00'::interval) = '00:00:00'::interval
            then 'SEM LANCAMENTO'
        when j.jornada_esperada is null
            then null
        when t.total_gclick > '00:00:00'::interval and t.total_gclick < j.lm_esperado
            then 'ABAIXO DO LM'
        when t.total_gclick > j.jornada_esperada * 1.02
            then 'ACIMA DA JORNADA'
        else 'OK'
    end as classificacao,
    jf.justificativa as ultima_justificativa,
    jf.gestor_nome as ultima_justificativa_gestor,
    jf.criado_em as ultima_justificativa_em
from colaboradores c
cross join (
    select distinct ponto_diario.data from ponto_diario
    union
    select distinct neocode_diario.data from neocode_diario
) d
left join ponto_diario p on p.colaborador_id = c.id and p.data = d.data
left join neocode_diario n on n.colaborador_id = c.id and n.data = d.data
left join (
    select tarefas_gclick.colaborador_id, tarefas_gclick.data,
           sum(tarefas_gclick.duracao) as total_gclick
    from tarefas_gclick
    group by tarefas_gclick.colaborador_id, tarefas_gclick.data
) t on t.colaborador_id = c.id and t.data = d.data
cross join lateral (
    select
        jornada_esperada,
        jornada_esperada * 0.85 as lm_esperado
    from (
        select
            case
                when c.tipo_colaborador = 'estagiario' then interval '6 hours'
                when extract(dow from d.data) = 5 then interval '8 hours'
                when extract(dow from d.data) in (1,2,3,4) then interval '9 hours'
                else null::interval
            end as jornada_esperada
    ) x
) j
left join lateral (
    select jd.justificativa, jd.gestor_nome, jd.criado_em
    from justificativas_diarias jd
    where jd.colaborador_id = c.id and jd.data = d.data
    order by jd.criado_em desc
    limit 1
) jf on true
where c.status = 'ativo';

-- Testado em 2026-07-16: Lucas Alcantara Frazao (2026-07-15) passou de
-- "ACIMA DA JORNADA" pra "OK" -- confirmado direto na view em produção.

-- Pendências:
--   - Popular tipo_colaborador = 'estagiario' pros colaboradores certos
--   - Mapear performance_gclick (ainda sem fonte de dados definida)

-- ============================================================
-- Seção 5 — Coluna workmonitor_total na view (JÁ APLICADA em 2026-07-16)
-- Motivo: o redesign do index.html passou a ter uma coluna "Work Monitor"
-- na tabela principal (total do WorkMonitor/Neocode), que a view ainda não
-- expunha (só produtivo/distração/etc, não o total). Adicionado n.total no
-- final da lista de colunas (mesma regra: CREATE OR REPLACE VIEW só permite
-- adicionar no final).
-- ============================================================

create or replace view public.vw_resumo_diario as
select
    c.id as colaborador_id, c.nome, c.departamento, c.supervisor, c.status, d.data,
    p.horas_trabalhadas, n.produtivo, n.distracao, n.ausencias, n.resultado, n.inicio, n.fim,
    coalesce(t.total_gclick, '00:00:00'::interval) as total_gclick,
    c.tipo_colaborador, j.jornada_esperada, j.lm_esperado,
    case
        when coalesce(t.total_gclick, '00:00:00'::interval) = '00:00:00'::interval then 'SEM LANCAMENTO'
        when j.jornada_esperada is null then null
        when t.total_gclick > '00:00:00'::interval and t.total_gclick < j.lm_esperado then 'ABAIXO DO LM'
        when t.total_gclick > j.jornada_esperada * 1.02 then 'ACIMA DA JORNADA'
        else 'OK'
    end as classificacao,
    jf.justificativa as ultima_justificativa,
    jf.gestor_nome as ultima_justificativa_gestor,
    jf.criado_em as ultima_justificativa_em,
    n.total as workmonitor_total
from colaboradores c
cross join (select distinct ponto_diario.data from ponto_diario union select distinct neocode_diario.data from neocode_diario) d
left join ponto_diario p on p.colaborador_id = c.id and p.data = d.data
left join neocode_diario n on n.colaborador_id = c.id and n.data = d.data
left join (select tarefas_gclick.colaborador_id, tarefas_gclick.data, sum(tarefas_gclick.duracao) as total_gclick from tarefas_gclick group by tarefas_gclick.colaborador_id, tarefas_gclick.data) t on t.colaborador_id = c.id and t.data = d.data
cross join lateral (select jornada_esperada, jornada_esperada * 0.85 as lm_esperado from (select case when c.tipo_colaborador = 'estagiario' then interval '6 hours' when extract(dow from d.data) = 5 then interval '8 hours' when extract(dow from d.data) in (1,2,3,4) then interval '9 hours' else null::interval end as jornada_esperada) x) j
left join lateral (select jd.justificativa, jd.gestor_nome, jd.criado_em from justificativas_diarias jd where jd.colaborador_id = c.id and jd.data = d.data order by jd.criado_em desc limit 1) jf on true
where c.status = 'ativo';

-- Testado em 2026-07-16: GET /rest/v1/vw_resumo_diario?select=workmonitor_total
-- retorna HTTP 200 com valores reais (ex.: Adriano Oliveira Dias Silva = 8h09m).

-- Também atualizado no mesmo dia: extracao_diaria_INTEGRADO.py passou a
-- enviar mais campos dentro de neocode_diario.metricas (app_mais_usado,
-- app_mais_usado_tempo_txt, app_mais_usado_trocas, horario_inicial_destaque,
-- horario_final_destaque) -- antes só ia produtividade_geral_pct e
-- maior_atividade_continua. Isso alimenta a seção "Destaques do Dia" do
-- modal de detalhe do colaborador no site.

-- ============================================================
-- Seção 6 — Gerenciar colaboradores direto pela página + gestores
-- fixos (JÁ APLICADA em 2026-07-16)
-- Motivo: dava pra adicionar/editar/remover colaborador só pelo Supabase.
-- Passou a dar pra fazer isso direto pelo link do dashboard (botão
-- "Gerenciar colaboradores"), sem precisar entrar no Supabase.
-- ============================================================

-- 6.1 — RLS de escrita em colaboradores (além da "leitura publica" já
-- existente). Mesmo modelo de confiança de justificativas_diarias: link
-- único compartilhado, sem login individual. Só INSERT/UPDATE — nunca
-- DELETE (remover colaborador é sempre soft-delete via status='inativo',
-- pra não perder o histórico de ponto/WorkMonitor/G-Click, que referencia
-- colaborador_id em ponto_diario/neocode_diario/tarefas_gclick).

alter table public.colaboradores enable row level security;

create policy "insercao publica" on public.colaboradores
    for insert with check (true);

create policy "atualizacao publica" on public.colaboradores
    for update using (true) with check (true);

-- 6.2 — Sincronização de roster (2026-07-16): colaboradores/gestores
-- foram conferidos contra a planilha oficial fornecida pelo usuário
-- (40 nomes ativos). Quem não estava na planilha foi marcado como
-- inativo (saiu da empresa/outro motivo), sem apagar histórico.
-- Resultado: 40 'ativo' + 23 'inativo'.

-- 6.3 — Tabela nova: gestores fixos. Antes o campo colaboradores.supervisor
-- era texto livre digitado à mão. Agora existe uma lista fixa e gerenciável
-- de gestores (adicionar/remover pela própria tela), e o campo supervisor
-- do colaborador passou a ser escolhido por menu suspenso a partir dessa
-- lista (o texto em colaboradores.supervisor continua sendo só texto —
-- não é uma foreign key — pra não travar em caso de nomes legados que não
-- estejam (mais) na lista de gestores).

create table if not exists public.gestores (
    id uuid primary key default gen_random_uuid(),
    nome text not null unique,
    status text not null default 'ativo',
    created_at timestamptz not null default now()
);

alter table public.gestores enable row level security;

create policy "leitura publica" on public.gestores
    for select using (true);

create policy "insercao publica" on public.gestores
    for insert with check (true);

create policy "atualizacao publica" on public.gestores
    for update using (true) with check (true);

-- Populada uma vez, a partir dos supervisores já existentes em colaboradores:
-- insert into public.gestores (nome)
-- select distinct trim(supervisor) from public.colaboradores
-- where supervisor is not null and trim(supervisor) <> ''
-- on conflict (nome) do nothing;
-- Resultado: 9 gestores.

-- Remover gestor também é soft-delete (status='inativo') — some do menu
-- suspenso, mas colaboradores já vinculados a ele não mudam, e dá pra
-- reativar depois pela própria tela.

-- 6.4 — Modal de detalhe do colaborador: a seção "Comparativo Ponto x
-- WorkMonitor x G-Click" foi movida pro topo (logo depois de "Tempo"),
-- e "Tempo" foi renomeado pra "Tempo (WorkMonitor)" pra deixar claro
-- que aqueles 4 cards vêm do WorkMonitor, não do Ponto. Mudança só de
-- HTML/JS no index.html, sem impacto no schema.
