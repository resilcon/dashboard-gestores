-- Adiciona a marcação "dia abonado" nas justificativas.
--
-- Contexto: até aqui, `justificativas_diarias` era só uma anotação de texto
-- (não influenciava nenhum cálculo). Pedido novo: o gestor precisa poder
-- marcar um dia como abonado/desconsiderado (férias, folga do banco de
-- horas, atestado etc.) e esse dia sair de vez dos cálculos (KPIs, médias de
-- % Ponto, agregações de Semana/Período) -- do jeito que sábado/domingo já
-- saem hoje.
--
-- Não altera nenhuma coluna existente, não apaga dado nenhum -- só adiciona
-- 1 coluna nova com default seguro (false), então toda justificativa já
-- cadastrada continua exatamente como está (não vira "abonada" sozinha).
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://supabase.com/dashboard/project/aumfhrqrnudmprvmvesb/sql/new) e
-- rode. Reversível a qualquer momento com o DROP COLUMN comentado no fim.

alter table public.justificativas_diarias
  add column if not exists abonado boolean not null default false;

comment on column public.justificativas_diarias.abonado is
  'Quando true, esse dia (colaborador_id + data) é excluído dos cálculos do dashboard (KPIs, médias de % Ponto, agregações) -- usado pra férias, folga de banco de horas, atestado etc.';

-- Pra reverter, se precisar:
-- alter table public.justificativas_diarias drop column if exists abonado;
