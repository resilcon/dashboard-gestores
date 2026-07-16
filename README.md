# Dashboard Gestores — guia de deploy

Site estático (HTML/CSS/JS puro) que lê dados do Supabase.

## ✅ Já publicado

Link pra mandar pros gestores: **https://resilcon.github.io/dashboard-gestores/**

Repositório: `resilcon/dashboard-gestores` (público — necessário pra usar GitHub Pages de graça; a única informação sensível embutida no `index.html` é a publishable key, que é segura por design pra ficar no navegador). Pra atualizar o site no futuro, é só subir uma nova versão do `index.html` pra esse repositório (substituindo o arquivo) — o GitHub Pages já fica de olho na branch `main` e republica sozinho.

**Redesign (2026-07-16):** tema claro por padrão com botão pra alternar pra escuro (preferência salva no navegador). Tabela principal simplificada pra 7 colunas — Colaborador, Gestor, Total GCLICK, Horas Tangerino, Work Monitor, Classificação, Justificativa — em ordem alfabética por colaborador, com filtro por colaborador e por gestor, e a data do período centralizada no topo da página (não é mais coluna da tabela). Clicar no nome do colaborador abre um modal com o mesmo nível de detalhe do relatório do WorkMonitor (tempo produtivo/neutro/improdutivo, contadores, produtividade geral, Top 5 aplicativos, gráficos, destaques do dia e o comparativo Ponto x WorkMonitor x G-Click) — os dados vêm de `neocode_diario` e da nova tabela `apps_uso_diario`. Os cards de KPI (OK/Abaixo do LM/Acima da jornada/Sem lançamento) foram removidos pra sobrar mais espaço pra tabela.

**Gerenciar colaboradores direto pela página (2026-07-16):** botão "Gerenciar colaboradores" no topo abre um painel pra adicionar um colaborador novo, editar o gestor de qualquer um, ou remover — sem precisar entrar no Supabase. "Remover" é sempre soft-delete (marca `status = 'inativo'`): a pessoa some do painel principal, mas o histórico de ponto/WorkMonitor/G-Click continua salvo e dá pra reativar a qualquer momento pela própria tela ("Mostrar removidos"). Pra isso funcionar, a tabela `colaboradores` ganhou policies de RLS de INSERT/UPDATE públicas (mesmo modelo de confiança já usado em `justificativas_diarias`: link único compartilhado, sem login individual — qualquer um com o link consegue editar gestor/adicionar/remover colaborador).

O roster de colaboradores/gestores foi sincronizado em 2026-07-16 com a planilha oficial fornecida (40 ativos); quem não estava na lista foi marcado como inativo (saiu da empresa), sem apagar o histórico.

**Gestores fixos (2026-07-16):** a lista de gestores deixou de ser texto livre. Existe agora uma tabela `gestores` (nova, com as mesmas policies de RLS de `colaboradores` — leitura/inserção/atualização públicas, nunca DELETE), populada inicialmente com os 9 supervisores já em uso. No painel "Gerenciar colaboradores", o campo de gestor de cada colaborador (tanto ao adicionar um novo quanto ao editar um existente) virou um menu suspenso alimentado por essa tabela, e uma seção nova nesse mesmo painel permite cadastrar novos gestores ou remover algum (soft-delete — some do menu, mas colaboradores já vinculados a ele não mudam, e dá pra reativar depois).

**Modal de detalhe do colaborador (2026-07-16):** a seção "Comparativo Ponto x WorkMonitor x G-Click" foi movida pro topo do modal (logo após a seção de tempo), em vez de ficar escondida no final. A seção "Tempo" foi renomeada pra "Tempo (WorkMonitor)" pra deixar claro que aqueles 4 cards (total/produtivo/neutro/improdutivo) vêm do WorkMonitor.

⚠️ Como o repositório é público, qualquer pessoa com o link consegue ver os nomes e horários dos colaboradores. Já que é uso interno, isso foi um trade-off aceito em troca de não pagar hospedagem — se no futuro quiser restringir o acesso de verdade (login por gestor), a alternativa é Cloudflare Pages + Cloudflare Access (grátis até 50 usuários, com login de verdade).

## Arquivos

- `index.html` — o dashboard (front-end), já configurado e testado contra o Supabase real
- `schema.sql` — **documentação** do schema que já existe em produção (não precisa rodar)
- `README.md` — este guia

## Atualização importante

O banco **já existia** — criado numa conversa anterior direto no schema `public` do projeto Supabase `resilcon-relatorios` (`aumfhrqrnudmprvmvesb`), com as tabelas `colaboradores`, `neocode_diario`, `tarefas_gclick`, `performance_gclick`, `ponto_diario` e a view `vw_resumo_diario`. Não é necessário rodar nenhum SQL — só conectar o front-end, que já está feito.

Confirmado nesse banco: RLS habilitado em todas as tabelas, com uma única policy de leitura pública (`SELECT`) por tabela — sem policies de escrita para `anon`. A chave publishable (`sb_publishable_...`) só consegue ler.

Atualização: a classificação diária (equivalente à antiga aba GTS: OK / Abaixo do LM / Acima da jornada / Sem lançamento) já foi implementada como coluna calculada (`classificacao`) na view `vw_resumo_diario`, com base nas regras de negócio fornecidas:
- Jornada esperada: 9h (segunda a quinta), 8h (sexta), 6h fixo pra estagiários
- LM (lançamento mínimo) = 85% da jornada
- "Acima da jornada" = mais de 102% da jornada esperada
- Adicionada também a coluna `tipo_colaborador` em `colaboradores` (`efetivo` / `estagiario`, default `efetivo`) — ainda precisa popular quem são os estagiários, hoje todo mundo cai no default.

## 1. Supabase — já configurado

`index.html` já aponta para:
- Project URL: `https://aumfhrqrnudmprvmvesb.supabase.co`
- Publishable key (antiga "anon key"): já preenchida no arquivo

Testado com uma chamada real (`GET /rest/v1/vw_resumo_diario`) → HTTP 200. As tabelas estão vazias por enquanto (nenhum webhook rodou ainda), então o site vai mostrar "0 registros" até os dados começarem a chegar — isso é esperado, não é erro.

⚠️ A **secret key** (antiga service_role) nunca deve ir para o `index.html` — só é usada no script/servidor que dispara o webhook (item 2).

## Justificativas dos gestores

Já implementado: no dashboard, cada linha tem um botão "Justificar" que abre um formulário (nome + texto). Ao salvar, grava na tabela `justificativas_diarias` no Supabase — é uma tabela *append-only* (só insere, nunca edita ou apaga), então funciona como um histórico auditável: dá pra ver todas as justificativas já registradas pra um colaborador/dia, não só a última (embora o dashboard mostre só a mais recente).

Limitação importante: como o acesso ao dashboard ainda é por senha única compartilhada (não login individual), o "nome do gestor" no formulário é só um campo de texto livre — não é uma identidade verificada. Qualquer um com o link consegue gravar uma justificativa em nome de qualquer gestor. Pra ter certeza de quem registrou cada coisa, o caminho seria trocar pra login individual (Supabase Auth) mais pra frente — não é urgente, mas fica registrado como próximo passo se isso virar um problema.

## 2. Alimentando os dados — script de extração + `supabase_sync.py`

Resolvido: o próprio script Python que já roda no seu computador (Tangerino + WorkMonitor + G-Click) agora também envia os totais do dia pro Supabase. Dois arquivos novos, pra colocar na MESMA pasta do script (junto com `wm_base.py` / `wm_sheets.py`):

- `supabase_sync.py` — módulo novo, fala com a API REST do Supabase usando a **secret key** (nunca a publishable). Contém: get-or-create de colaborador (reaproveitando o `encontrar_melhor_match` já existente), upsert em `ponto_diario`/`neocode_diario`, e delete+insert em `tarefas_gclick` (idempotente — rodar duas vezes no mesmo dia não duplica linha).
- `extracao_diaria_INTEGRADO.py` — cópia do seu script original com os pontos de integração adicionados (marcados com `NOVO:` nos comentários, pra facilitar comparar). Pode substituir o script atual por este, ou usar como referência pra aplicar os mesmos trechos no seu arquivo.

**Atualização: a `Gestão de Produtividade.xlsm` saiu de cena.** O script não pede mais essa planilha, não lê o roster da aba GTS e não preenche as colunas D/E nela — essa era a ideia original (Excel compartilhado), mas agora o dashboard web substitui esse papel por completo. O fluxo ficou assim:

1. Abre o seletor de arquivos só uma vez, pras 3 planilhas do G-Click (internos/plr/premiação).
2. Busca Tangerino (ponto) e WorkMonitor (atividade) direto das APIs, um colaborador de cada vez.
3. Cada colaborador é criado no Supabase automaticamente na primeira vez que aparece (via `garantir_colaborador`) — não depende mais de nenhum roster externo. Único efeito colateral: o campo `supervisor` fica em branco pra quem for criado assim (antes vinha da coluna B da GTS); se isso for importante, dá pra editar direto na tabela `colaboradores` no Supabase.

**O que é enviado pro Supabase:**

- `ponto_diario`: total de horas do Tangerino.
- `neocode_diario`: só o **total** do WorkMonitor (célula A5 do Dashboard) + início/fim — por decisão sua, o detalhe produtivo/distração/ausências do Neocode foi deixado de fora.
- `tarefas_gclick`: linha por linha de cada planilha G-Click selecionada, já usando as colunas reais confirmadas (Data, Hora, Inscrição, Cliente, Sistema, Departamento, Tarefa, Duração). A `categoria` (`rotina`/`plr`/`premiacao`, únicos valores aceitos pelo banco) é adivinhada pelo **nome do arquivo** selecionado — ajuste `categoria_por_nome_arquivo()` em `supabase_sync.py` se os nomes reais dos seus arquivos não tiverem "plr"/"premia" no nome.

**Testado:** módulo importa sem erro, e a leitura detalhada da planilha G-Click (com filtro pela data do dia) foi validada com uma planilha de teste.

**Segurança:** `supabase_sync.py` tem a secret key embutida — só pode ficar no seu computador, na pasta do script de extração, nunca no mesmo repositório que vai pro GitHub Pages (esse só tem o `index.html`, com a publishable key).

**Desligar o envio sem mexer no código:** rode com a variável de ambiente `SUPABASE_SYNC=0` (ex.: `SUPABASE_SYNC=0 python extracao_diaria_INTEGRADO.py` no PowerShell seria `$env:SUPABASE_SYNC=0`) — gera as planilhas normalmente, só pula a parte do Supabase.

Ainda em aberto: `performance_gclick` (a aba "Performance" da Gestão de Produtividade parece bater com essa tabela, mas a origem/processo de atualização dela não foi mapeado ainda).

## 3. GitHub (versionamento)

```bash
git init
git add index.html schema.sql README.md
git commit -m "Dashboard gestores - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## 4. HostGator (publicar no domínio)

1. Acesse o **cPanel** → **Gerenciador de Arquivos** (ou FTP com FileZilla).
2. Vá até a pasta do domínio/subdomínio (ex: `public_html/dashboard/`).
3. Envie só o `index.html` pra essa pasta.

## 5. Proteger com senha única (.htaccess + .htpasswd)

Na mesma pasta do `index.html`:

1. No cPanel, procure **"Privacidade de Diretórios"** → selecione a pasta → ative a proteção → defina usuário e senha. O cPanel gera `.htaccess`/`.htpasswd` automaticamente.

   *Alternativa manual*:

   `.htaccess`:
   ```apache
   AuthType Basic
   AuthName "Acesso restrito"
   AuthUserFile /home/SEU_USUARIO_CPANEL/.htpasswds/dashboard/passwd
   Require valid-user
   ```

   ```bash
   htpasswd -c .htpasswd gestor
   ```

2. Envie usuário/senha pros gestores pelo canal que preferir.

## Ordem recomendada para colocar no ar

1. ~~Rodar schema.sql~~ — já não é necessário, banco já existe
2. ~~Implementar classificação diária~~ — já feito (coluna `classificacao` na view)
3. Subir `index.html` pro HostGator via cPanel/FTP
4. Ativar a proteção por senha (Directory Privacy)
5. Testar o link com senha, num navegador anônimo
6. Conectar o(s) webhook(s) que alimentam as tabelas
7. Popular `tipo_colaborador = 'estagiario'` pros colaboradores certos

## Próximos passos em aberto

- Definir quem dispara o webhook e o formato do JSON de cada fonte (Neocode, GClick, Tangerino)
- Confirmar domínio/subdomínio exato onde o dashboard vai ficar no HostGator
- Popular `tipo_colaborador` pros estagiários existentes
- Evoluções futuras: novas tabelas conforme novos projetos aparecerem
