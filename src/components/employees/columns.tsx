import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ClassificationBadge } from '@/components/dashboard/ClassificationBadge'
import type { DashboardRecord, JustifyTarget, ResumoPeriodoColaborador } from '@/types/domain'
import { intervalToHm, intervalToMinutes } from '@/utils/duration'
import { calcularPctPonto, formatarPctPonto, pctPontoEhBaixo } from '@/utils/pct-ponto'
import { ehDiaAbonado } from '@/utils/abonado'
import { cn } from '@/lib/utils'
import { formatDateBr, weekdayName } from '@/utils/date'

function PctPontoCell({ value }: { value: number | null }) {
  return <span className={cn('tabular-nums', pctPontoEhBaixo(value) && 'font-semibold text-danger')}>{formatarPctPonto(value)}</span>
}

function Dash() {
  return <span className="text-muted-foreground">—</span>
}

interface DailyActions {
  onVerDetalhes: (row: DashboardRecord) => void
  onJustificar: (target: JustifyTarget) => void
  diasAbonados: Set<string>
}

export function buildDailyColumns({ onVerDetalhes, onJustificar, diasAbonados }: DailyActions): ColumnDef<DashboardRecord, unknown>[] {
  return [
    {
      id: 'nome',
      header: 'Colaborador',
      accessorFn: (r) => r.nome,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.nome}
          {row.original.tipo_colaborador === 'estagiario' && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(estagiário)</span>}
        </span>
      ),
    },
    {
      id: 'supervisor',
      header: 'Gestor',
      accessorFn: (r) => r.supervisor ?? '',
      cell: ({ getValue }) => (getValue() ? <span className="text-muted-foreground">{getValue() as string}</span> : <Dash />),
    },
    {
      id: 'total_gclick',
      header: 'G-Click',
      accessorFn: (r) => intervalToMinutes(r.total_gclick) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.total_gclick) ?? <Dash />,
    },
    {
      id: 'horas_trabalhadas',
      header: 'Tangerino',
      accessorFn: (r) => intervalToMinutes(r.horas_trabalhadas) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.horas_trabalhadas) ?? <Dash />,
    },
    {
      id: 'workmonitor_total',
      header: 'Work Monitor',
      accessorFn: (r) => intervalToMinutes(r.workmonitor_total) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.workmonitor_total) ?? <Dash />,
    },
    {
      id: 'pct_ponto',
      header: '% Ponto',
      accessorFn: (r) => calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => (
        <PctPontoCell value={calcularPctPonto(intervalToMinutes(row.original.total_gclick), intervalToMinutes(row.original.horas_trabalhadas))} />
      ),
    },
    {
      id: 'classificacao',
      header: 'Classificação',
      accessorFn: (r) => r.classificacao ?? '',
      cell: ({ row }) => (
        <ClassificationBadge
          value={row.original.classificacao}
          abonado={ehDiaAbonado(diasAbonados, row.original.colaborador_id, row.original.data)}
        />
      ),
    },
    {
      id: 'justificativa',
      header: 'Justificativa',
      accessorFn: (r) => r.ultima_justificativa ?? '',
      cell: ({ row }) =>
        row.original.ultima_justificativa ? (
          <span className="line-clamp-1 max-w-[220px] text-sm text-muted-foreground" title={row.original.ultima_justificativa}>
            {row.original.ultima_justificativa}
          </span>
        ) : (
          <Dash />
        ),
    },
    {
      id: 'acoes',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()} aria-label="Ações">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {/* w-44 fixo: o padrão do shadcn é igualar a largura do menu à do gatilho
              (--radix-dropdown-menu-trigger-width) -- ótimo pra um trigger tipo Select,
              péssimo aqui, onde o gatilho é um ícone de 28px perto da borda direita da
              tabela: o menu ficava largo mas ancorado errado e vazava pra fora da tela. */}
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onVerDetalhes(row.original)}>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onJustificar({ colaboradorId: row.original.colaborador_id, data: row.original.data, nome: row.original.nome })}
            >
              Justificar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

export function buildPeriodAggregateColumns(): ColumnDef<ResumoPeriodoColaborador, unknown>[] {
  return [
    {
      id: 'nome',
      header: 'Colaborador',
      accessorFn: (r) => r.nome,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.nome}
          {row.original.tipo_colaborador === 'estagiario' && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(estagiário)</span>}
        </span>
      ),
    },
    {
      id: 'supervisor',
      header: 'Gestor',
      accessorFn: (r) => r.supervisor ?? '',
      cell: ({ getValue }) => (getValue() ? <span className="text-muted-foreground">{getValue() as string}</span> : <Dash />),
    },
    {
      id: 'dias_com_dado',
      header: 'Dias c/ dado',
      accessorFn: (r) => r.dias_com_dado,
      cell: ({ row }) => `${row.original.dias_com_dado}/${row.original.dias_totais}`,
    },
    {
      id: 'gclick_min',
      header: 'Total G-Click',
      accessorFn: (r) => r.gclick_min || -1,
      cell: ({ row }) => (row.original.gclick_min ? intervalMinToHm(row.original.gclick_min) : <Dash />),
    },
    {
      id: 'tangerino_min',
      header: 'Total Tangerino',
      accessorFn: (r) => r.tangerino_min || -1,
      cell: ({ row }) => (row.original.tangerino_min ? intervalMinToHm(row.original.tangerino_min) : <Dash />),
    },
    {
      id: 'wm_min',
      header: 'Total WorkMonitor',
      accessorFn: (r) => r.wm_min || -1,
      cell: ({ row }) => (row.original.wm_min ? intervalMinToHm(row.original.wm_min) : <Dash />),
    },
    {
      id: 'pct_ponto',
      header: '% Ponto',
      accessorFn: (r) => calcularPctPonto(r.gclick_min || null, r.tangerino_min || null) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => <PctPontoCell value={calcularPctPonto(row.original.gclick_min || null, row.original.tangerino_min || null)} />,
    },
    {
      id: 'dias_sem_lancamento',
      header: 'Sem lançamento',
      accessorFn: (r) => r.dias_sem_lancamento,
      cell: ({ row }) => (row.original.dias_sem_lancamento ? <span className="font-medium text-danger">{row.original.dias_sem_lancamento}</span> : '0'),
    },
    {
      id: 'dias_abaixo_lm',
      header: 'Abaixo do LM',
      accessorFn: (r) => r.dias_abaixo_lm,
      cell: ({ row }) => (row.original.dias_abaixo_lm ? <span className="font-medium text-warning">{row.original.dias_abaixo_lm}</span> : '0'),
    },
  ]
}

interface PeriodByEmployeeActions {
  onJustificar: (target: JustifyTarget) => void
  diasAbonados: Set<string>
}

export function buildPeriodByEmployeeColumns({ onJustificar, diasAbonados }: PeriodByEmployeeActions): ColumnDef<DashboardRecord, unknown>[] {
  return [
    {
      id: 'data',
      header: 'Data',
      accessorFn: (r) => r.data,
      cell: ({ row }) => formatDateBr(row.original.data),
    },
    {
      id: 'dia_semana',
      header: 'Dia',
      accessorFn: (r) => weekdayName(r.data),
      cell: ({ row }) => <span className="text-muted-foreground">{weekdayName(row.original.data)}</span>,
    },
    {
      id: 'total_gclick',
      header: 'G-Click',
      accessorFn: (r) => intervalToMinutes(r.total_gclick) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.total_gclick) ?? <Dash />,
    },
    {
      id: 'horas_trabalhadas',
      header: 'Tangerino',
      accessorFn: (r) => intervalToMinutes(r.horas_trabalhadas) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.horas_trabalhadas) ?? <Dash />,
    },
    {
      id: 'workmonitor_total',
      header: 'Work Monitor',
      accessorFn: (r) => intervalToMinutes(r.workmonitor_total) ?? -1,
      cell: ({ row }) => intervalToHm(row.original.workmonitor_total) ?? <Dash />,
    },
    {
      id: 'pct_ponto',
      header: '% Ponto',
      accessorFn: (r) => calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => (
        <PctPontoCell value={calcularPctPonto(intervalToMinutes(row.original.total_gclick), intervalToMinutes(row.original.horas_trabalhadas))} />
      ),
    },
    {
      id: 'classificacao',
      header: 'Classificação',
      accessorFn: (r) => r.classificacao ?? '',
      cell: ({ row }) => (
        <ClassificationBadge
          value={row.original.classificacao}
          abonado={ehDiaAbonado(diasAbonados, row.original.colaborador_id, row.original.data)}
        />
      ),
    },
    {
      id: 'acoes',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation()
            onJustificar({ colaboradorId: row.original.colaborador_id, data: row.original.data, nome: row.original.nome })
          }}
        >
          Justificar
        </Button>
      ),
    },
  ]
}

function intervalMinToHm(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
