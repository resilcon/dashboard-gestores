# Plano de migração para Supabase Auth real

## Estado atual (o que existe hoje, depois desta migração de frontend)

`IdentityContext` (`src/context/IdentityContext.tsx`) reproduz **exatamente**
o mecanismo do dashboard antigo: escolher um nome de gestor de um
`<select>`, sem senha, persistido em `localStorage`. Não é autenticação —
está documentado como tal no próprio código e em
[`SECURITY_NOTES.md`](../SECURITY_NOTES.md). Motivo de manter assim nesta
migração: não existe hoje, no Supabase deste projeto, uma tabela de
usuários/senhas real nem o Supabase Auth habilitado — trocar isso exige
decisões e acesso que esta migração não tem (acesso ao painel do Supabase,
decisão de quem pode logar com o quê). O que **foi** feito: toda a
arquitetura já está isolada atrás de `useIdentity()` e `<ProtectedRoute>`,
então trocar a implementação por Supabase Auth de verdade não deveria exigir
tocar em nenhuma outra tela.

## Por que migrar

- Hoje qualquer pessoa com a URL pode se identificar como qualquer gestor
  (inclusive diretor) sem senha nenhuma — só escolhendo o nome.
- Nenhuma ação (justificativa, edição de colaborador/gestor) fica de fato
  vinculada a um usuário autenticado — `gestor` na justificativa é só o
  nome escolhido no login, não verificável.
- RLS de verdade só é possível (de forma granular, por usuário/perfil)
  quando existe uma sessão real do Supabase Auth — hoje toda escrita usa a
  chave anônima igual pra todo mundo.

## Perfis propostos

Conforme o pedido original:

- **admin** — gerencia estrutura (cadastro de colaboradores/gestores,
  hoje em `/administracao` e `/equipe`).
- **diretor** — visualiza toda a organização (já existe como conceito hoje:
  `gestores.is_diretor`).
- **gestor** — visualiza só a própria equipe (comportamento padrão hoje).

## Passo a passo (nenhum destes passos foi aplicado — requer acesso ao Supabase Studio)

### 1. Habilitar Supabase Auth (painel do Supabase)

- Authentication → Providers → habilitar Email (ou o provider que fizer
  sentido — Google/Microsoft via SSO da empresa, se disponível).
- Decidir política de convite: como cada gestor recebe a conta inicial
  (magic link / convite por e-mail / senha temporária).

### 2. Ligar `gestores` a um usuário autenticado (migration SQL — rascunho, NÃO aplicado)

```sql
-- Rascunho — revisar com quem administra o banco antes de aplicar.
-- Adiciona a coluna sem remover nada existente (não-destrutivo).
alter table public.gestores
  add column if not exists auth_user_id uuid references auth.users(id);

create unique index if not exists gestores_auth_user_id_key
  on public.gestores (auth_user_id)
  where auth_user_id is not null;
```

Depois de criar as contas no Auth (passo 1), popular `auth_user_id` pra cada
linha existente de `gestores` (script único, feito por quem tem acesso —
não faz parte desta migração de frontend).

### 3. Papel/perfil (`admin` / `diretor` / `gestor`)

Duas opções, escolher uma com quem administra o banco:

- **Opção A (mais simples):** derivar o perfil só de `gestores.is_diretor`
  (já existe) + uma nova coluna booleana `is_admin`, e resolver perfil no
  frontend a partir da linha de `gestores` vinculada ao usuário logado.
- **Opção B (mais "correta" a longo prazo):** usar
  [Custom Claims](https://supabase.com/docs/guides/auth/auth-hooks) do
  Supabase Auth (JWT com `app_metadata.role`), resolvido nas policies de RLS
  via `auth.jwt() ->> 'role'` sem precisar de round-trip extra pra tabela
  `gestores`.

### 4. RLS (rascunho de direção, não SQL final — cada tabela precisa de revisão própria)

```sql
-- Exemplo de direção pra vw_resumo_diario/colaboradores: só autenticado, e
-- só a própria equipe a menos que seja diretor. Ajustar nomes/condições
-- reais depois de confirmar o schema com quem administra o banco.
create policy "gestor ve sua equipe, diretor ve tudo"
  on public.colaboradores
  for select
  to authenticated
  using (
    exists (
      select 1 from public.gestores g
      where g.auth_user_id = auth.uid()
        and (g.is_diretor or g.nome = colaboradores.supervisor)
    )
  );
```

E revogar acesso de escrita do role `anon` nas tabelas de escrita
(`colaboradores`, `gestores`, `justificativas_diarias`), deixando só
`authenticated` com as policies acima.

### 5. Frontend — troca de implementação (quando os passos 1-4 estiverem prontos)

Trocar o conteúdo de `IdentityProvider` (`src/context/IdentityContext.tsx`)
por uma versão que:

```ts
// Esqueleto — não implementado ainda, depende dos passos acima.
const { data: { session } } = await supabase.auth.getSession()
supabase.auth.onAuthStateChange((_event, session) => { /* atualiza contexto */ })
```

- Login (`src/pages/Login.tsx`) troca o `<Select>` de nome por
  email + senha (`supabase.auth.signInWithPassword`), mantendo o mesmo
  layout dividido já construído.
- `sair()` vira `supabase.auth.signOut()`.
- `identidade.nome`/`identidade.isDiretor` passam a vir da linha de
  `gestores` vinculada via `auth_user_id` (uma query a mais, com cache via
  TanStack Query — `queryKeys` já tem espaço pra isso).
- `ProtectedRoute` não muda de forma nenhuma — já está pronto.

### 6. Riscos dessa migração futura

- Gestores existentes precisam de uma conta nova — planejar comunicação
  (senha temporária / convite) pra não travar o acesso no dia da troca.
- Enquanto RLS antiga (permissiva, se for o caso) e nova convivem, há uma
  janela onde é preciso testar com cuidado pra não bloquear leitura
  legítima sem querer — testar em ambiente de staging antes, se existir.
