import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIdentity } from '@/context/IdentityContext'

/**
 * Redireciona pro login enquanto ninguém se identificou. Ver
 * docs/AUTH_MIGRATION.md: isto protege contra navegação acidental na UI, não
 * substitui RLS no banco -- qualquer chamada direta ao Supabase com a chave
 * anônima ainda passa por aqui sem checagem nenhuma.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { identidade } = useIdentity()

  if (identidade === undefined) return null // ainda carregando localStorage/lista de gestores
  if (identidade === null) return <Navigate to="/login" replace />

  return <>{children}</>
}
