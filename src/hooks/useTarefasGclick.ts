import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchTarefasGclick } from '@/services/supabase/queries'
import type { IsoDate } from '@/utils/date'

/** Tarefas do G-Click num intervalo (aba Tarefas) -- busca dedicada e paginada, nunca a tabela inteira. */
export function useTarefasGclick(start: IsoDate, end: IsoDate) {
  return useQuery({
    queryKey: queryKeys.tarefasGclick(start, end),
    queryFn: () => (isSupabaseConfigured ? fetchTarefasGclick(start, end) : Promise.resolve([])),
    enabled: Boolean(start && end && start <= end),
    staleTime: 60_000,
  })
}
