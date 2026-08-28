# Security Notes — Dashboard Gestores

Revisão feita durante a migração de `index.html` (vanilla JS) para
React/TypeScript. Lista o que foi encontrado, o que já é esperado/aceitável
por design, e o que **precisa de decisão/ação de alguém com acesso ao painel
do Supabase** (esta migração não tem acesso de admin/service-role a esse
projeto).

## 1. Achado crítico — RLS de escrita não verificada (AÇÃO NECESSÁRIA)

**O que é:** `colaboradores`, `gestores` e `justificativas_diarias` são
gravados (INSERT/UPDATE) direto do navegador usando **apenas a chave anônima
pública** (`VITE_SUPABASE_ANON_KEY`, embutida no bundle JS — visível pra
qualquer um via "view source" ou DevTools). Isso é assim desde o app antigo;
a migração **preservou o comportamento**, não o introduziu.

**Por que importa:** a única coisa que impede alguém de escrever nessas
tabelas *direto pela REST API do Supabase* (sem nunca abrir o app) são as
políticas de **RLS (Row Level Security)** configuradas no banco. Eu não
tenho acesso ao painel do Supabase pra inspecionar essas políticas — não sei
se hoje elas de fato restringem quem pode INSERT/UPDATE, ou se são
permissivas (`true` / sem policy = tudo liberado pro anon role).

**Ação necessária (fora desta migração):** alguém com acesso ao Supabase
Studio precisa confirmar, em Database → Policies, para cada tabela:
- `colaboradores`: existe policy de UPDATE/INSERT restrita, ou é aberta pro
  role `anon`?
- `gestores`: idem — em especial o campo `is_diretor`, que hoje controla
  quem vê a equipe inteira.
- `justificativas_diarias`: idem.
- As views/tabelas de leitura (`vw_resumo_diario`, `neocode_diario`,
  `apps_uso_diario`) só devem permitir SELECT, nunca escrita, pro role
  `anon`.

Se as policies forem abertas, qualquer pessoa com a URL do projeto (pública,
já que está no bundle) pode alterar/apagar cadastros de colaboradores e
gestores, ou inserir justificativas falsas, **sem nunca passar pela UI**.

## 2. "Login" atual não é autenticação real (esperado, documentado)

O gate "Quem é você?" (agora a tela de Login) deixa qualquer pessoa se
identificar como qualquer gestor cadastrado — inclusive um diretor, que
enxerga todos os colaboradores — só escolhendo o nome, sem senha. Isso é
**herdado do app antigo**, não uma regressão desta migração. Ver
[`docs/AUTH_MIGRATION.md`](docs/AUTH_MIGRATION.md) para o plano de trocar
isso por Supabase Auth de verdade.

Enquanto isso não é feito: a "proteção" de rota no frontend
(`ProtectedRoute`) só evita navegação acidental dentro da UI — **não
substitui RLS**. Qualquer chamada direta ao Supabase com a chave anônima
ignora completamente essa proteção.

## 3. Chave anônima pública no bundle (esperado, não é o problema em si)

`VITE_SUPABASE_ANON_KEY` aparece em texto plano no JS publicado. Isso é
**esperado e correto** — é assim que toda aplicação Supabase client-side
funciona, a chave "anon/publishable" foi desenhada pra isso. O que protege
os dados é a RLS (item 1), não o sigilo dessa chave. Por isso o
`.env.example` documenta isso explicitamente e não trata essa chave como
secret de verdade.

**NUNCA** adicionar a `service_role` key em nenhum lugar deste frontend —
ela ignora RLS por completo. Não há nenhuma referência a ela no código desta
migração.

## 4. XSS / innerHTML

O app antigo montava a UI inteira via `innerHTML` de template strings, com
uma função `escapeHtml()` aplicada manualmente e de forma inconsistente
campo a campo — um esquecimento em qualquer campo (nome de colaborador,
texto de justificativa, apelido) seria uma injeção de HTML/JS armazenada.

**Na migração:** React escapa por padrão todo conteúdo interpolado em JSX
(`{variavel}`), então essa classe inteira de bug desaparece estruturalmente
— não há nenhum uso de `dangerouslySetInnerHTML` em nenhum componente novo.

## 5. Validação só no cliente

Os formulários (novo colaborador, novo gestor, justificativa) usam Zod no
cliente (via React Hook Form) só pra feedback rápido de UX. Isso **não
substitui** constraints no banco (ex.: `nome` não pode ser vazio,
`colaborador_id`/`data` como chave da justificativa). Se essas constraints
não existirem hoje na tabela, vale considerar adicionar via migration SQL —
não foi feito aqui pra não alterar schema sem confirmação (ver instrução do
pedido original: "não aplique alterações irreversíveis automaticamente").

## 6. Dependência com CVE conhecida — `xlsx` (resolvido)

O pacote `xlsx` (SheetJS) distribuído pelo **registro público do npm** tem
duas vulnerabilidades conhecidas sem correção nessa distribuição
(Prototype Pollution e ReDoS). O projeto usa, em vez disso, o build oficial
mais recente publicado pela própria SheetJS no CDN deles
(`https://cdn.sheetjs.com/...`, pinado em `package.json` na versão 0.20.3) —
`npm audit` confirma 0 vulnerabilidades com essa fonte.

## Resumo — o que fazer antes de ir pra produção

| Item | Prioridade | Responsável |
|---|---|---|
| Confirmar/corrigir RLS de `colaboradores`, `gestores`, `justificativas_diarias` | 🔴 Alta | Quem tem acesso ao Supabase Studio |
| Decidir e implementar Supabase Auth real (ver AUTH_MIGRATION.md) | 🟡 Média | Time + acesso ao Supabase Auth |
| Revisar se `vw_resumo_diario` e afins têm RLS de leitura adequada (hoje qualquer identidade vê tudo se marcada "diretor") | 🟡 Média | Quem tem acesso ao Supabase Studio |
