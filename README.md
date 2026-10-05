# Dashboard Gestores — Resilcon

Painel interno de gestão e produtividade da Resilcon Contabilidade: consolida
G-Click, Tangerino e WorkMonitor num único lugar pra gestores acompanharem a
equipe — quem está dentro do esperado, quem precisa de atenção, e o
histórico/detalhe de cada colaborador.

Esta é a migração completa do antigo `index.html` (HTML/CSS/JS estático,
sem build) para uma aplicação React/TypeScript real. Todas as regras de
negócio, cálculos e integrações com o Supabase foram preservados — ver
[`SECURITY_NOTES.md`](SECURITY_NOTES.md) e [`docs/AUTH_MIGRATION.md`](docs/AUTH_MIGRATION.md)
pros pontos que ainda dependem de acesso ao painel do Supabase (fora do
escopo desta migração de frontend).

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** + **shadcn/ui** (Radix UI) — design system próprio, cores extraídas da logo da Resilcon
- **TanStack Table** (tabela principal) + **TanStack Query** (cache/estado assíncrono)
- **React Router** (rotas) · **React Hook Form + Zod** (formulários) · **date-fns** (datas)
- **Recharts** (gráfico de evolução no detalhe do colaborador) · **Sonner** (toasts) · **Lucide** (ícones)
- **Supabase** (`@supabase/supabase-js`) — mesma base já usada pelo app antigo, nenhuma tabela/view nova
- **SheetJS (`xlsx`)** — exportação Excel, igual ao app antigo (instalado do CDN oficial da SheetJS, não do npm — ver `SECURITY_NOTES.md`)

## Instalação

Pré-requisito: Node.js 20+ (usado nesta migração: Node 24 LTS).

```bash
npm install
cp .env.example .env
# edite .env com a URL e a chave anônima do projeto Supabase
```

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build   # tsc -b && vite build -- typecheck + build de produção em dist/
npm run lint    # oxlint
npm run test    # vitest -- regras de negócio críticas (ver src/utils/*.test.ts)
npm run preview # serve o build de dist/ localmente, pra conferir antes de publicar
```

## Variáveis de ambiente

Ver [`.env.example`](.env.example). As duas variáveis (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) são **públicas por design** — é a chave
anônima do Supabase, feita pra rodar no navegador. Nunca commitar um `.env`
real (já está no `.gitignore`); nunca colocar a `service_role` key em
nenhum lugar deste projeto.

## Supabase

Mesmo projeto do dashboard antigo (`vw_resumo_diario`, `neocode_diario`,
`apps_uso_diario`, `colaboradores`, `gestores`, `justificativas_diarias`) —
nenhuma tabela, view ou nome de coluna foi alterado. A aba **Tarefas G-Click**
é a única que lê `tarefas_gclick` (preenchida pelo Work Monitor a partir da
planilha exportada do G-Click) — somente leitura, sempre com filtro de data
e paginada em janelas de 7 dias (a tabela passa de 90 mil linhas e o OFFSET
profundo estoura o statement timeout do Supabase). Toda query fica em
[`src/services/supabase/`](src/services/supabase/) (`queries.ts` = leitura,
`mutations.ts` = escrita) — nenhum componente chama o Supabase direto.

## Autenticação

O "login" atual (escolher seu nome numa lista) **não é autenticação real** —
é o mesmo mecanismo do app antigo, mantido de propósito nesta migração
porque não existe hoje uma base de usuários/senha no Supabase Auth deste
projeto. Ver o plano completo (schema, RLS, troca de código) em
[`docs/AUTH_MIGRATION.md`](docs/AUTH_MIGRATION.md).

## Estrutura do projeto

```
src/
├── components/
│   ├── ui/          # shadcn/ui (gerado — evite editar à mão, use `npx shadcn add`)
│   ├── layout/       # AppShell, Sidebar, Header, MobileNav, ProtectedRoute
│   ├── dashboard/    # KpiCards, AttentionList, ClassificationBadge
│   ├── employees/    # DataTable + columns, EmployeeDetailSheet, JustifyDialog
│   ├── tarefas/      # Graficos (barras Recharts), colunas das tabelas da aba Tarefas
│   ├── filters/      # PeriodToolbar (Dia/Semana/Período + busca/gestor/status)
│   └── feedback/     # EmptyState, ErrorState, Skeletons
├── pages/            # Login, Dashboard, Team, Tarefas, Justifications, Administration
├── context/          # IdentityContext ("quem sou eu"), ThemeContext (dark mode)
├── hooks/            # useDashboardData, useEmployeeDetail, useTeamData, useJustificativas, useTarefasGclick
├── services/supabase/# client.ts, queries.ts, mutations.ts, pagination.ts, demo-data.ts
├── types/domain.ts   # tipos derivados 1:1 dos campos reais do Supabase
├── utils/            # duration, date, pct-ponto, aggregate-period, dashboard-metrics,
│                     # employee-detail, tarefas-gclick, export-excel — toda a lógica de negócio pura,
│                     # separada de componentes (testável sem precisar renderizar nada)
└── lib/              # query-keys.ts, utils.ts (cn())
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (HMR) |
| `npm run build` | typecheck (`tsc -b`) + build de produção (`vite build`) em `dist/` |
| `npm run lint` | oxlint |
| `npm run test` | testes (Vitest) das regras de negócio críticas |
| `npm run preview` | serve `dist/` localmente |

## Deploy (GitHub Pages)

O projeto publica hoje em `https://resilcon.github.io/dashboard-gestores/`
(GitHub Pages de projeto). `vite.config.ts` já configura o `base` certo pra
esse path em produção.

Incluído [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
builda e publica automaticamente a cada push em `main`, via GitHub Actions
+ Pages (não é mais preciso subir o `dist/` manualmente). Pra ativar:

1. Em Settings → Pages, mudar "Source" pra **GitHub Actions**.
2. Em Settings → Secrets and variables → Actions → **Variables**, cadastrar
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (não precisam ser
   "Secrets" — são públicas por design, ver `SECURITY_NOTES.md`).
3. Dar push em `main` (ou rodar o workflow manualmente em Actions).

Enquanto isso não estiver configurado, o deploy manual continua sendo:
`npm run build` e publicar o conteúdo de `dist/` na branch/pasta que o
GitHub Pages está servindo hoje.
