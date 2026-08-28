import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { fetchJustificativas } from '@/services/supabase/queries'
import type { IsoDate } from '@/utils/date'

export function useJustificativas(start: IsoDate, end: IsoDate) {
  return useQuery({
    queryKey: ['justificativas', start, end],
    queryFn: () => (isSupabaseConfigured ? fetchJustificativas(start, end) : Promise.resolve([])),
  })
}
