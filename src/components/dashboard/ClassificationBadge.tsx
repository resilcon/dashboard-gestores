import { cn } from '@/lib/utils'
import type { Classificacao } from '@/types/domain'

/**
 * Mesmo mapeamento de cores já usado em produção hoje: OK=success,
 * ABAIXO DO LM=warning, ACIMA DA JORNADA=info, SEM LANCAMENTO=danger.
 */
const STYLES: Record<Classificacao, string> = {
  OK: 'bg-success/10 text-success',
  'ABAIXO DO LM': 'bg-warning/10 text-warning',
  'ACIMA DA JORNADA': 'bg-info/10 text-info',
  'SEM LANCAMENTO': 'bg-danger/10 text-danger',
}

/**
 * Dia abonado (justificativa marcada como tal) tem sua própria cor,
 * separada das 4 classificações -- sinaliza "esse dia não conta pra nada",
 * não "esse dia foi bom ou ruim".
 */
export function ClassificationBadge({ value, abonado }: { value: Classificacao | null; abonado?: boolean }) {
  if (abonado) {
    return <span className="inline-flex items-center rounded-full bg-brand-secondary/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand-secondary">ABONADO</span>
  }
  if (!value) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', STYLES[value])}>
      {value}
    </span>
  )
}
