import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchDashboardRange, fetchDashboardRecent, fetchDiasAbonados } from '@/services/supabase/queries'
import { DEMO_DASHBOARD_ROWS } from '@/services/supabase/demo-data'
import { criarSetDiasAbonados } from '@/utils/abonado'
import type { IsoDate } from '@/utils/date'

/** Cache "recente" (últimos ~5000 registros) — alimenta as visões Dia e Semana. */
export function useDashboardRecent(maxRows = 5000) {
  return useQuery({
    queryKey: queryKeys.dashboardRecent(maxRows),
    queryFn: () => (isSupabaseConfigured ? fetchDashboardRecent(maxRows) : Promise.resolve(DEMO_DASHBOARD_ROWS)),
    staleTime: 60_000,
  })
}

/** Intervalo livre (visão Período) — busca dedicada, não depende do cache "recente". */
export function useDashboardRange(start: IsoDate | null, end: IsoDate | null, colaboradorId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardRange(start ?? '', end ?? '', colaboradorId),
    queryFn: () => (isSupabaseConfigured ? fetchDashboardRange(start!, end!, colaboradorId) : Promise.resolve([])),
    enabled: Boolean(start && end && start <= end),
    staleTime: 60_000,
  })
}

/** Conjunto de (colaborador_id, data) marcados como dia abonado -- excluídos de todo cálculo (KPIs, médias, agregações). */
export function useDiasAbonados() {
  return useQuery({
    queryKey: ['justificativas', 'abonados'],
    queryFn: async () => criarSetDiasAbonados(isSupabaseConfigured ? await fetchDiasAbonados() : []),
    staleTime: 60_000,
  })
}
