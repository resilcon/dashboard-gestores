import type { DashboardRecord, WorkMonitorRecord } from '@/types/domain'
import { intervalToMinutes } from '@/utils/duration'
import { calcularPctPonto } from '@/utils/pct-ponto'
import { previousBusinessDay, startOfWeekMonday, weekDates, isWeekend, type IsoDate } from '@/utils/date'

export interface ComparativoLinha {
  fonte: 'Ponto (Tangerino)' | 'WorkMonitor' | 'G-Click'
  minutos: number | null
  pct: number | null
}

export interface DiferencaLinha {
  label: string
  minutos: number | null
}

/**
 * Comparativo Ponto x WorkMonitor x G-Click — Tangerino é sempre a base
 * (100%). Portado 1:1 de `montarComparativo` do dashboard antigo, incluindo
 * o fallback de `wmMin` pro total do neocode_diario quando a view não tem o
 * dado (`row.workmonitor_total` nulo).
 */
export function buildComparativo(row: DashboardRecord, neo: WorkMonitorRecord | null) {
  const tangerinoMin = intervalToMinutes(row.horas_trabalhadas)
  const wmMin = intervalToMinutes(row.workmonitor_total) ?? (neo ? intervalToMinutes(neo.total) : null)
  const gclickMin = intervalToMinutes(row.total_gclick)

  const pctSobre = (min: number | null) => calcularPctPonto(min, tangerinoMin)

  const linhas: ComparativoLinha[] = [
    { fonte: 'Ponto (Tangerino)', minutos: tangerinoMin, pct: pctSobre(tangerinoMin) },
    { fonte: 'WorkMonitor', minutos: wmMin, pct: pctSobre(wmMin) },
    { fonte: 'G-Click', minutos: gclickMin, pct: pctSobre(gclickMin) },
  ]

  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b)
  const diferencas: DiferencaLinha[] = [
    { label: 'WorkMonitor vs. Tangerino', minutos: diff(wmMin, tangerinoMin) },
    { label: 'G-Click vs. Tangerino', minutos: diff(gclickMin, tangerinoMin) },
    { label: 'G-Click vs. WorkMonitor', minutos: diff(gclickMin, wmMin) },
  ]

  return { linhas, diferencas }
}

export interface VariacaoMetrica {
  atual: number | null
  variacaoPct: number | null
  dataAnterior: IsoDate | null
}

function metricaDeLinha(row: DashboardRecord, campo: 'teclas' | 'cliques'): number | null {
  return row.metricas?.[campo] ?? null
}

/** Compara uma métrica (teclas/cliques) do dia com o ÚLTIMO DIA ÚTIL anterior (nunca um fim de semana). */
export function buildVariacaoMetrica(historico: DashboardRecord[], row: DashboardRecord, campo: 'teclas' | 'cliques'): VariacaoMetrica {
  const hoje = historico.find((r) => r.data === row.data) ?? null
  const dataAnteriorUtil = previousBusinessDay(row.data)
  const anteriorRow = historico.find((r) => r.data === dataAnteriorUtil) ?? null

  const atual = hoje ? metricaDeLinha(hoje, campo) : null
  const anterior = anteriorRow ? metricaDeLinha(anteriorRow, campo) : null

  if (atual === null) return { atual: null, variacaoPct: null, dataAnterior: null }
  if (anterior === null || anterior === 0) return { atual, variacaoPct: null, dataAnterior: anteriorRow?.data ?? null }

  return { atual, variacaoPct: ((atual - anterior) / anterior) * 100, dataAnterior: anteriorRow?.data ?? null }
}

export interface DiaMaisFraco {
  data: IsoDate
  valor: number
}

/** Dia com menos teclas/cliques na semana de `row.data` (exclui fim de semana). */
export function buildDiaMaisFraco(historico: DashboardRecord[], row: DashboardRecord, campo: 'teclas' | 'cliques'): DiaMaisFraco | null {
  const datasSemana = weekDates(startOfWeekMonday(row.data)).filter((d) => !isWeekend(d))
  const candidatos = historico.filter((r) => datasSemana.includes(r.data) && metricaDeLinha(r, campo) !== null)
  if (!candidatos.length) return null
  const menor = candidatos.reduce((a, b) => (metricaDeLinha(a, campo)! <= metricaDeLinha(b, campo)! ? a : b))
  return { data: menor.data, valor: metricaDeLinha(menor, campo)! }
}

export function historicoDoColaborador(allRows: DashboardRecord[], colaboradorId: string, limit = 14): DashboardRecord[] {
  return allRows
    .filter((r) => r.colaborador_id === colaboradorId)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limit)
}
