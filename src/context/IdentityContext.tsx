import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchGestoresAtivos } from '@/services/supabase/queries'

const STORAGE_KEY = 'dashboard-meu-gestor'

export interface Identidade {
  nome: string
  isDiretor: boolean
}

interface IdentityContextValue {
  /** null enquanto carrega a lista de gestores; undefined = ninguém selecionado ainda (mostra o gate). */
  identidade: Identidade | null | undefined
  gestoresAtivos: Array<{ nome: string; is_diretor: boolean }>
  carregandoGestores: boolean
  selecionarGestor: (nome: string) => void
  sair: () => void
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

/**
 * IMPORTANTE (ver AUTH_MIGRATION.md): isto NÃO é autenticação real. É a
 * mesma "porta de identidade" do dashboard antigo — escolher um nome de
 * gestor da lista, sem senha, persistido em localStorage. Qualquer pessoa
 * com acesso à URL pode se identificar como qualquer gestor (inclusive
 * diretor). Mantido assim de propósito nesta migração porque não existe hoje
 * uma base de usuários/senhas real no Supabase Auth — a arquitetura abaixo
 * (contexto + rota protegida) já está pronta pra ser trocada por sessão real
 * do Supabase Auth sem mexer no resto do app: basta substituir o conteúdo
 * deste provider.
 */
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [nomeSelecionado, setNomeSelecionado] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  const { data: gestoresAtivos = [], isLoading: carregandoGestores } = useQuery({
    queryKey: queryKeys.gestoresAtivos(),
    queryFn: () => (isSupabaseConfigured ? fetchGestoresAtivos() : Promise.resolve([])),
    staleTime: 5 * 60_000,
  })

  const identidade = useMemo<Identidade | null | undefined>(() => {
    if (nomeSelecionado === null) return null
    // ainda carregando a lista de gestores -- não dá pra saber se esse nome ainda é válido.
    if (carregandoGestores) return undefined
    const gestor = gestoresAtivos.find((g) => g.nome === nomeSelecionado)
    // gestor foi removido/desativado depois de escolhido -- trata como "não identificado".
    return gestor ? { nome: gestor.nome, isDiretor: gestor.is_diretor } : null
  }, [nomeSelecionado, gestoresAtivos, carregandoGestores])

  function selecionarGestor(nome: string) {
    localStorage.setItem(STORAGE_KEY, nome)
    setNomeSelecionado(nome)
  }

  function sair() {
    localStorage.removeItem(STORAGE_KEY)
    setNomeSelecionado(null)
  }

  return (
    <IdentityContext.Provider value={{ identidade, gestoresAtivos, carregandoGestores, selecionarGestor, sair }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity precisa estar dentro de <IdentityProvider>')
  return ctx
}
