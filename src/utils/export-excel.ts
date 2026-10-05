import type { DashboardRecord, ResumoPeriodoColaborador } from '@/types/domain'
import { intervalToHm, intervalToMinutes, minutesToHm } from '@/utils/duration'
import { calcularPctPonto, formatarPctPonto } from '@/utils/pct-ponto'
import { formatDateBr, weekdayName } from '@/utils/date'
import { formatarMinutos, type Grupo, type Lancamento } from '@/utils/tarefas-gclick'

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

async function baixarVariasAbas(abas: { nome: string; dados: Record<string, unknown>[] }[], nomeArquivo: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const aba of abas) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aba.dados), aba.nome)
  XLSX.writeFile(wb, nomeArquivo)
}

const tempoEmHoras = (min: number) => Math.round((min / 60) * 100) / 100

function linhasDeGrupo(grupos: Grupo[], rotuloColuna: string, extras: Record<string, string> = {}) {
  return grupos.map((g) => ({
    [rotuloColuna]: g.rotulo,
    ...Object.fromEntries(Object.entries(extras).map(([coluna, dimensao]) => [coluna, g.principais[dimensao] ?? ''])),
    'Tempo total': formatarMinutos(g.totalMin),
    'Tempo total (horas)': tempoEmHoras(g.totalMin),
    '% do total': Math.round(g.pct * 1000) / 10,
    Lançamentos: g.qtd,
    'Média por lançamento (min)': Math.round(g.mediaMin * 10) / 10,
    Colaboradores: g.colaboradores,
    'Dias com lançamento': g.dias,
  }))
}

/** Exporta o recorte atual da aba Tarefas: um resumo por dimensão + os lançamentos detalhados. */
export async function exportarTarefas(
  dados: {
    colaboradores: Grupo[]
    departamentos: Grupo[]
    tarefas: Grupo[]
    clientes: Grupo[]
    lancamentos: Lancamento[]
  },
  inicio: string,
  fim: string,
) {
  await baixarVariasAbas(
    [
      { nome: 'Por colaborador', dados: linhasDeGrupo(dados.colaboradores, 'Colaborador', { 'Departamento principal': 'departamento', 'Tarefa principal': 'tipo' }) },
      { nome: 'Por departamento', dados: linhasDeGrupo(dados.departamentos, 'Departamento', { 'Tarefa principal': 'tipo' }) },
      { nome: 'Por tarefa', dados: linhasDeGrupo(dados.tarefas, 'Tarefa', { 'Departamento principal': 'departamento' }) },
      { nome: 'Por cliente', dados: linhasDeGrupo(dados.clientes, 'Cliente', { 'Departamento principal': 'departamento' }) },
      {
        nome: 'Lançamentos',
        dados: dados.lancamentos.map((l) => ({
          Data: formatDateBr(l.data),
          Hora: l.hora?.slice(0, 5) ?? '',
          Colaborador: l.colaborador,
          Gestor: l.supervisor ?? '',
          Departamento: l.departamento,
          Tarefa: l.tarefa,
          'Tipo de tarefa': l.tipo,
          Cliente: l.cliente,
          Categoria: l.categoria,
          Interna: l.interna ? 'Sim' : 'Não',
          'Duração (min)': Math.round(l.min * 10) / 10,
        })),
      },
    ],
    `tarefas_gclick_${inicio}_a_${fim}.xlsx`,
  )
}
