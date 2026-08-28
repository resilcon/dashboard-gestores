import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PeriodMode } from '@/types/domain'

const MODES: { value: PeriodMode; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'periodo', label: 'Período' },
]

interface PeriodToolbarProps {
  mode: PeriodMode
  onModeChange: (mode: PeriodMode) => void
  date: string
  onDateChange: (date: string) => void
  endDate?: string
  onEndDateChange?: (date: string) => void
  onNavigate?: (direction: -1 | 1) => void
  periodLabel: string

  search: string
  onSearchChange: (value: string) => void
  gestor: string
  onGestorChange: (value: string) => void
  gestorOptions: string[]
  statusFiltro?: string
  onStatusFiltroChange?: (value: string) => void
  colaboradorOptions?: { id: string; nome: string }[]
  colaboradorFiltro?: string
  onColaboradorFiltroChange?: (value: string) => void
  diaSemanaFiltro?: string
  onDiaSemanaFiltroChange?: (value: string) => void
}

const DIAS_SEMANA_UTEIS = [
  { value: '1', label: 'Segundas-feiras' },
  { value: '2', label: 'Terças-feiras' },
  { value: '3', label: 'Quartas-feiras' },
  { value: '4', label: 'Quintas-feiras' },
  { value: '5', label: 'Sextas-feiras' },
]

export function PeriodToolbar(props: PeriodToolbarProps) {
  const { mode, onModeChange } = props

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onModeChange(m.value)}
              className={cn(
                'rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors',
                mode === m.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode !== 'periodo' ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => props.onNavigate?.(-1)} aria-label="Período anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={props.date}
              onChange={(e) => props.onDateChange(e.target.value)}
              className="h-8 w-[150px]"
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => props.onNavigate?.(1)} aria-label="Próximo período">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input type="date" value={props.date} onChange={(e) => props.onDateChange(e.target.value)} className="h-8 w-[150px]" />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={props.endDate ?? ''}
              onChange={(e) => props.onEndDateChange?.(e.target.value)}
              className="h-8 w-[150px]"
            />
          </div>
        )}

        <span className="text-sm text-muted-foreground">{props.periodLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Buscar colaborador..."
            className="h-8 pl-8"
          />
        </div>

        {props.colaboradorOptions && (
          <Select value={props.colaboradorFiltro || 'todos'} onValueChange={(v) => props.onColaboradorFiltroChange?.(v === 'todos' ? '' : v)}>
            <SelectTrigger className="h-8 w-[200px]">
              <SelectValue placeholder="Todos os colaboradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os colaboradores</SelectItem>
              {props.colaboradorOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={props.gestor || 'todos'} onValueChange={(v) => props.onGestorChange(v === 'todos' ? '' : v)}>
          <SelectTrigger className="h-8 w-[170px]">
            <SelectValue placeholder="Todos os gestores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os gestores</SelectItem>
            {props.gestorOptions.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {props.diaSemanaFiltro !== undefined && (
          <Select value={props.diaSemanaFiltro || 'todos'} onValueChange={(v) => props.onDiaSemanaFiltroChange?.(v === 'todos' ? '' : v)}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Todos os dias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os dias</SelectItem>
              {DIAS_SEMANA_UTEIS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  Só {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {props.statusFiltro !== undefined && (
          <Select value={props.statusFiltro || 'todos'} onValueChange={(v) => props.onStatusFiltroChange?.(v === 'todos' ? '' : v)}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com">Com dados no dia</SelectItem>
              <SelectItem value="sem">Sem dados no dia</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
