import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchColaboradores, fetchGestores } from '@/services/supabase/queries'
import {
  atualizarColaborador,
  criarColaborador,
  criarGestor,
  definirGestorDiretor,
  definirStatusColaborador,
  definirStatusGestor,
} from '@/services/supabase/mutations'

export function useColaboradores() {
  return useQuery({
    queryKey: queryKeys.colaboradores(),
    queryFn: () => (isSupabaseConfigured ? fetchColaboradores() : Promise.resolve([])),
  })
}

export function useGestores() {
  return useQuery({
    queryKey: queryKeys.gestores(),
    queryFn: () => (isSupabaseConfigured ? fetchGestores() : Promise.resolve([])),
  })
}

function useInvalidateTeam() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.colaboradores() })
    queryClient.invalidateQueries({ queryKey: queryKeys.gestores() })
    queryClient.invalidateQueries({ queryKey: queryKeys.gestoresAtivos() })
  }
}

export function useCriarColaborador() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: criarColaborador, onSuccess: invalidate })
}

export function useAtualizarColaborador() {
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: (vars: { id: string; supervisor: string | null; apelidos: string[] }) => atualizarColaborador(vars.id, vars),
    onSuccess: invalidate,
  })
}

export function useDefinirStatusColaborador() {
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: (vars: { id: string; status: 'ativo' | 'inativo' }) => definirStatusColaborador(vars.id, vars.status),
    onSuccess: invalidate,
  })
}

export function useCriarGestor() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: criarGestor, onSuccess: invalidate })
}

export function useDefinirGestorDiretor() {
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: (vars: { id: string; isDiretor: boolean }) => definirGestorDiretor(vars.id, vars.isDiretor),
    onSuccess: invalidate,
  })
}

export function useDefinirStatusGestor() {
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: (vars: { id: string; status: 'ativo' | 'inativo' }) => definirStatusGestor(vars.id, vars.status),
    onSuccess: invalidate,
  })
}
