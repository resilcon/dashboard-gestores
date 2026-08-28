import type { DashboardRecord, ResumoPeriodoColaborador } from '@/types/domain'
import { intervalToHm, intervalToMinutes, minutesToHm } from '@/utils/duration'
import { calcularPctPonto, formatarPctPonto } from '@/utils/pct-ponto'
import { formatDateBr, weekdayName } from '@/utils/date'

// `xlsx` só é carregado quando alguém realmente clica em "Exportar" -- é uma
// lib pesada e não faz sentido no bundle inicial de quem só quer consultar a
// tabela.
async function baixar(dados: Record<string, unknown>[], nomeAba: string, nomeArquivo: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, nomeArquivo)
}

export async function exportarDia(rows: DashboardRecord[], date: string) {
  const dados = rows.map((r) => ({
    Colaborador: r.nome,
    Gestor: r.supervisor ?? '',
    'G-Click': intervalToHm(r.total_gclick) ?? '',
    Tangerino: intervalToHm(r.horas_trabalhadas) ?? '',
    'Work Monitor': intervalToHm(r.workmonitor_total) ?? '',
    '% Ponto (G-Click/Tangerino)': formatarPctPonto(calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas))),
    Classificação: r.classificacao ?? '',
    Justificativa: r.ultima_justificativa ?? '',
  }))
  await baixar(dados, 'Dia', `dashboard_gestores_${date}.xlsx`)
}

export async function exportarAgregado(rows: ResumoPeriodoColaborador[], modo: 'semana' | 'periodo', inicio: string, fim: string) {
  const dados = rows.map((r) => ({
    Colaborador: r.nome,
    Gestor: r.supervisor ?? '',
    'Dias c/ dado': `${r.dias_com_dado}/${r.dias_totais}`,
    'Total G-Click': r.gclick_min ? minutesToHm(r.gclick_min) : '',
    'Total Tangerino': r.tangerino_min ? minutesToHm(r.tangerino_min) : '',
    'Total WorkMonitor': r.wm_min ? minutesToHm(r.wm_min) : '',
    '% Ponto (G-Click/Tangerino)': formatarPctPonto(calcularPctPonto(r.gclick_min || null, r.tangerino_min || null)),
    'Dias sem lançamento': r.dias_sem_lancamento,
    'Dias abaixo do LM': r.dias_abaixo_lm,
  }))
  const nomeArquivo =
    modo === 'semana' ? `dashboard_gestores_semana_${inicio}_a_${fim}.xlsx` : `dashboard_gestores_periodo_${inicio}_a_${fim}.xlsx`
  await baixar(dados, modo === 'semana' ? 'Semana' : 'Período', nomeArquivo)
}

export async function exportarPeriodoColaborador(rows: DashboardRecord[], nomeColaborador: string, inicio: string, fim: string) {
  const dados = rows.map((r) => ({
    Data: formatDateBr(r.data),
    'Dia da semana': weekdayName(r.data),
    'G-Click': intervalToHm(r.total_gclick) ?? '',
    Tangerino: intervalToHm(r.horas_trabalhadas) ?? '',
    'Work Monitor': intervalToHm(r.workmonitor_total) ?? '',
    '% Ponto (G-Click/Tangerino)': formatarPctPonto(calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas))),
    Classificação: r.classificacao ?? '',
  }))
  const nomeArquivo = `dashboard_gestores_${nomeColaborador.replace(/\s+/g, '_')}_${inicio}_a_${fim}.xlsx`
  await baixar(dados, 'Período', nomeArquivo)
}
