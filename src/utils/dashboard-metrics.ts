import type { Classificacao, DashboardRecord, ResumoPeriodoColaborador } from '@/types/domain'
import { intervalToMinutes } from '@/utils/duration'
import { calcularPctPonto, formatarPctPonto } from '@/utils/pct-ponto'

export interface TeamKpis {
  total: number
  dentroDoEsperado: number
  requerAtencao: number
  semLancamento: number
  acimaJornada: number
}

/**
 * "Requer atenção" (KPI e lista) = só ABAIXO DO LM — SEM LANCAMENTO já tem
 * card próprio, então não conta duas vezes no mesmo resumo. "Acima da
 * jornada" não é tratado como problema aqui (só informativo no tooltip).
 */
export function computeTeamKpis(rows: DashboardRecord[]): TeamKpis {
  let dentroDoEsperado = 0
  let requerAtencao = 0
  let semLancamento = 0
  let acimaJornada = 0
  for (const row of rows) {
    if (row.classificacao === 'OK') dentroDoEsperado += 1
    else if (row.classificacao === 'ABAIXO DO LM') requerAtencao += 1
    else if (row.classificacao === 'SEM LANCAMENTO') semLancamento += 1
    else if (row.classificacao === 'ACIMA DA JORNADA') acimaJornada += 1
  }
  return { total: rows.length, dentroDoEsperado, requerAtencao, semLancamento, acimaJornada }
}

/**
 * Mesmos KPIs, só que pra visão agregada (Semana/Período) -- cada colaborador
 * já vem somado (dias_sem_lancamento/dias_abaixo_lm/dias_acima_jornada no
 * intervalo inteiro), então "teve pelo menos 1 dia problemático" é o critério
 * (contar dia-a-dia dobraria a contagem por pessoa).
 */
export function computeTeamKpisFromAggregate(rows: ResumoPeriodoColaborador[]): TeamKpis {
  let dentroDoEsperado = 0
  let requerAtencao = 0
  let semLancamento = 0
  let acimaJornada = 0
  for (const row of rows) {
    if (row.dias_abaixo_lm > 0) requerAtencao += 1
    if (row.dias_sem_lancamento > 0) semLancamento += 1
    if (row.dias_acima_jornada > 0) acimaJornada += 1
    if (row.dias_sem_lancamento === 0 && row.dias_abaixo_lm === 0 && row.dias_acima_jornada === 0) dentroDoEsperado += 1
  }
  return { total: rows.length, dentroDoEsperado, requerAtencao, semLancamento, acimaJornada }
}

export interface AttentionItem {
  colaboradorId: string
  nome: string
  classificacao: Classificacao
  detalhe: string
}

/** Lista os colaboradores em ABAIXO DO LM ou SEM LANCAMENTO — as 2 classificações que exigem ação do gestor. */
export function buildAttentionList(rows: DashboardRecord[]): AttentionItem[] {
  return rows
    .filter((r): r is DashboardRecord & { classificacao: Classificacao } =>
      r.classificacao === 'ABAIXO DO LM' || r.classificacao === 'SEM LANCAMENTO',
    )
    .map((row) => {
      if (row.classificacao === 'SEM LANCAMENTO') {
        return { colaboradorId: row.colaborador_id, nome: row.nome, classificacao: row.classificacao, detalhe: 'Sem lançamento hoje' }
      }
      const gclickMin = intervalToMinutes(row.total_gclick)
      const tangerinoMin = intervalToMinutes(row.horas_trabalhadas)
      const pct = calcularPctPonto(gclickMin, tangerinoMin)
      const detalhe = pct !== null ? `G-Click representa ${formatarPctPonto(pct)} do ponto` : 'Abaixo do mínimo esperado'
      return { colaboradorId: row.colaborador_id, nome: row.nome, classificacao: row.classificacao, detalhe }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Mesma lista, pra visão agregada (Semana/Período) -- descreve quantos dias de cada tipo no intervalo, não "hoje". */
export function buildAttentionListFromAggregate(rows: ResumoPeriodoColaborador[]): AttentionItem[] {
  return rows
    .filter((r) => r.dias_sem_lancamento > 0 || r.dias_abaixo_lm > 0)
    .map((row) => {
      const partes: string[] = []
      if (row.dias_sem_lancamento > 0) partes.push(`${row.dias_sem_lancamento} dia(s) sem lançamento`)
      if (row.dias_abaixo_lm > 0) partes.push(`${row.dias_abaixo_lm} dia(s) abaixo do mínimo`)
      return {
        colaboradorId: row.colaborador_id,
        nome: row.nome,
        classificacao: (row.dias_abaixo_lm > 0 ? 'ABAIXO DO LM' : 'SEM LANCAMENTO') as Classificacao,
        detalhe: `${partes.join(' · ')} no período`,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
