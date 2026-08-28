import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchAppsUso, fetchWorkMonitorDetail } from '@/services/supabase/queries'

export function useEmployeeDetail(colaboradorId: string | null, date: string | null) {
  const enabled = Boolean(colaboradorId && date) && isSupabaseConfigured

  return useQuery({
    queryKey: queryKeys.employeeDetail(colaboradorId ?? '', date ?? ''),
    queryFn: async () => {
      const [neo, apps] = await Promise.all([fetchWorkMonitorDetail(colaboradorId!, date!), fetchAppsUso(colaboradorId!, date!)])
      return { neo, apps }
    },
    enabled,
  })
}
