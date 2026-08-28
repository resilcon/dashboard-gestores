import { CircleCheck, Clock, Info, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamKpis } from '@/utils/dashboard-metrics'
import { KpiCardSkeleton } from '@/components/feedback/Skeletons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface KpiCardsProps {
  kpis: TeamKpis
  /** Delta de "dentro do esperado" vs. o período anterior — só passado quando há dado real pra comparar. */
  deltaDentroDoEsperado?: number | null
  isLoading?: boolean
}

export function KpiCards({ kpis, deltaDentroDoEsperado, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard icon={Users} label="Total da equipe" value={kpis.total} hint="colaboradores" />
      <KpiCard
        icon={CircleCheck}
        label="Dentro do esperado"
        value={kpis.dentroDoEsperado}
        hint={
          deltaDentroDoEsperado === null || deltaDentroDoEsperado === undefined
            ? undefined
            : formatDelta(deltaDentroDoEsperado)
        }
        hintTone={
          deltaDentroDoEsperado === null || deltaDentroDoEsperado === undefined
            ? 'muted'
            : deltaDentroDoEsperado > 0
              ? 'success'
              : deltaDentroDoEsperado < 0
                ? 'danger'
                : 'muted'
        }
        tone="success"
      />
      <KpiCard
        icon={TriangleAlert}
        label="Requer atenção"
        value={kpis.requerAtencao}
        tone={kpis.requerAtencao > 0 ? 'warning' : undefined}
        tooltip={
          <div className="space-y-1">
            <p>{kpis.semLancamento} colaborador(es) sem lançamento no período filtrado</p>
            <p>{kpis.requerAtencao} colaborador(es) abaixo do mínimo</p>
            <p>{kpis.acimaJornada} colaborador(es) acima da jornada</p>
          </div>
        }
      />
      <KpiCard icon={Clock} label="Sem lançamento" value={kpis.semLancamento} tone={kpis.semLancamento > 0 ? 'danger' : undefined} />
    </div>
  )
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'estável vs. período anterior'
  return `${delta > 0 ? '+' : ''}${delta} vs. período anterior`
}

const TONE_STYLES = {
  success: { iconBg: 'bg-success/10', iconText: 'text-success', value: 'text-success' },
  warning: { iconBg: 'bg-warning/10', iconText: 'text-warning', value: 'text-warning' },
  danger: { iconBg: 'bg-danger/10', iconText: 'text-danger', value: 'text-danger' },
  neutral: { iconBg: 'bg-primary/10', iconText: 'text-primary', value: 'text-foreground' },
} as const

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  hintTone = 'muted',
  tooltip,
}: {
  icon: LucideIcon
  label: string
  value: number
  hint?: string
  tone?: 'success' | 'warning' | 'danger'
  hintTone?: 'success' | 'danger' | 'muted'
  tooltip?: React.ReactNode
}) {
  const styles = TONE_STYLES[tone ?? 'neutral']

  const card = (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_1px_rgba(15,23,42,0.03)]',
        'transition-all duration-150',
        tooltip ? 'cursor-default hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]' : 'hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          {tooltip && <Info className="h-3 w-3 text-muted-foreground/60" />}
        </div>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
          <Icon className={cn('h-4 w-4', styles.iconText)} strokeWidth={2.25} />
        </div>
      </div>

      <p className={cn('mt-3 text-[28px] leading-none font-semibold tabular-nums', tone ? styles.value : 'text-foreground')}>{value}</p>

      {hint && (
        <p
          className={cn(
            'mt-2 text-xs',
            hintTone === 'success' && 'text-success',
            hintTone === 'danger' && 'text-danger',
            hintTone === 'muted' && 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )

  if (!tooltip) return card

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
