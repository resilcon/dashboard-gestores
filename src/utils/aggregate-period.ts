import type { DashboardRecord, ResumoPeriodoColaborador } from '@/types/domain'
import { intervalToMinutes } from '@/utils/duration'
import { isWeekend } from '@/utils/date'

/**
 * Sábado e domingo não são dia útil e não devem influenciar NENHUM cálculo
 * da página (KPIs, agregação, "requer atenção", médias) -- pedido explícito
 * do usuário, já que esses dias sempre vêm zerados/SEM LANCAMENTO e inflam
 * artificialmente os números. Aplicado uma única vez, na entrada dos dados,
 * pra todo o resto (agregação, KPIs, tabelas) já trabalhar só com dias úteis.
 */
export function filterDiasUteis(rows: DashboardRecord[]): DashboardRecord[] {
  return rows.filter((r) => !isWeekend(r.data))
}

/**
 * Soma as linhas de `vw_resumo_diario` por colaborador ao longo de um
 * intervalo (Semana ou Período) — usada tanto pela visão Semana (7 dias)
 * quanto pela visão Período com "todos os colaboradores" (intervalo livre),
 * já que a lógica nunca dependeu de serem exatamente 7 dias. Portado 1:1 de
 * `agregarPeriodo` do dashboard antigo.
 */
export function aggregatePeriod(rows: DashboardRecord[]): ResumoPeriodoColaborador[] {
  const byColaborador = new Map<string, ResumoPeriodoColaborador & { datasComRegistro: Set<string> }>()

  for (const row of rows) {
    const key = row.colaborador_id
    let agg = byColaborador.get(key)
    if (!agg) {
      agg = {
        colaborador_id: row.colaborador_id,
        nome: row.nome,
        supervisor: row.supervisor,
        tipo_colaborador: row.tipo_colaborador,
        gclick_min: 0,
        tangerino_min: 0,
        wm_min: 0,
        dias_com_dado: 0,
        dias_sem_lancamento: 0,
        dias_abaixo_lm: 0,
        dias_acima_jornada: 0,
        dias_totais: 0,
        datasComRegistro: new Set(),
      }
      byColaborador.set(key, agg)
    }

    agg.datasComRegistro.add(row.data)
    const gclick = intervalToMinutes(row.total_gclick) ?? 0
    const tangerino = intervalToMinutes(row.horas_trabalhadas) ?? 0
    const wm = intervalToMinutes(row.workmonitor_total) ?? 0
    agg.gclick_min += gclick
    agg.tangerino_min += tangerino
    agg.wm_min += wm
    if (gclick > 0 || tangerino > 0 || wm > 0) agg.dias_com_dado += 1
    if (row.classificacao === 'SEM LANCAMENTO') agg.dias_sem_lancamento += 1
    else if (row.classificacao === 'ABAIXO DO LM') agg.dias_abaixo_lm += 1
    else if (row.classificacao === 'ACIMA DA JORNADA') agg.dias_acima_jornada += 1
  }

  return [...byColaborador.values()].map(({ datasComRegistro, ...agg }) => ({
    ...agg,
    dias_totais: datasComRegistro.size,
  }))
}

/** "Tem dados no dia" = pelo menos 1 das 3 fontes tem tempo registrado — usado no filtro "com/sem dados". */
export function hasDataForDay(row: DashboardRecord): boolean {
  const gclick = intervalToMinutes(row.total_gclick) ?? 0
  const tangerino = intervalToMinutes(row.horas_trabalhadas) ?? 0
  const wm = intervalToMinutes(row.workmonitor_total) ?? 0
  return gclick > 0 || tangerino > 0 || wm > 0
}
