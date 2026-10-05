import { supabase } from '@/services/supabase/client'
import { fetchAllPages } from '@/services/supabase/pagination'
import type {
  AppUsoDiario,
  Colaborador,
  DashboardRecord,
  Gestor,
  Justificativa,
  TarefaGclick,
  WorkMonitorRecord,
} from '@/types/domain'
import type { IsoDate } from '@/utils/date'
import { dividirPeriodo } from '@/utils/tarefas-gclick'

const DASHBOARD_VIEW = 'vw_resumo_diario'

/** 1 dia, todos os colaboradores — usado na visão "Dia" e como base da "Semana". */
export async function fetchDashboardDay(date: IsoDate): Promise<DashboardRecord[]> {
  const { data, error } = await supabase.from(DASHBOARD_VIEW).select('*').eq('data', date)
  if (error) throw new Error(error.message)
  return (data ?? []) as DashboardRecord[]
}

/**
 * Cache "recente" usado pelas visões Dia/Semana e pelo histórico do drawer de
 * detalhe (equivalente ao `allRows` do dashboard antigo) — as linhas mais
 * novas primeiro, paginado pra não bater no teto de 1000 linhas por resposta.
 */
export async function fetchDashboardRecent(maxRows = 5000): Promise<DashboardRecord[]> {
  return fetchAllPages<DashboardRecord>(
    (from, to) => supabase.from(DASHBOARD_VIEW).select('*').order('data', { ascending: false }).range(from, to),
    maxRows,
  )
}

/** Intervalo livre (visão "Período"), com ou sem 1 colaborador — paginado. */
export async function fetchDashboardRange(
  startDate: IsoDate,
  endDate: IsoDate,
  colaboradorId?: string,
): Promise<DashboardRecord[]> {
  return fetchAllPages<DashboardRecord>((from, to) => {
    let query = supabase
      .from(DASHBOARD_VIEW)
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: true })
      .range(from, to)
    if (colaboradorId) query = query.eq('colaborador_id', colaboradorId)
    return query
  })
}

export async function fetchWorkMonitorDetail(colaboradorId: string, date: IsoDate): Promise<WorkMonitorRecord | null> {
  const { data, error } = await supabase
    .from('neocode_diario')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('data', date)
  if (error) throw new Error(error.message)
  return (data?.[0] as WorkMonitorRecord | undefined) ?? null
}

export async function fetchAppsUso(colaboradorId: string, date: IsoDate): Promise<AppUsoDiario[]> {
  const { data, error } = await supabase
    .from('apps_uso_diario')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('data', date)
    .order('posicao', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AppUsoDiario[]
}

export async function fetchColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id,nome,supervisor,status,apelidos')
    .order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Colaborador[]
}

export async function fetchGestores(): Promise<Gestor[]> {
  const { data, error } = await supabase
    .from('gestores')
    .select('id,nome,status,is_diretor')
    .order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Gestor[]
}

/** Justificativas registradas num intervalo (join client-side com colaboradores, ver fetchColaboradores). */
export async function fetchJustificativas(startDate: IsoDate, endDate: IsoDate): Promise<Justificativa[]> {
  const { data, error } = await supabase
    .from('justificativas_diarias')
    .select('*')
    .gte('data', startDate)
    .lte('data', endDate)
    .order('data', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Justificativa[]
}

/**
 * Só colaborador_id + data de toda justificativa marcada como abonada --
 * usado pra montar o conjunto de "dias excluídos do cálculo" (ver
 * src/utils/abonado.ts). Sem filtro de data: a tabela de justificativas é
 * pequena, mais simples que manter essa busca sincronizada com a janela de
 * datas de cada visão (Dia/Semana/Período).
 */
export async function fetchDiasAbonados(): Promise<Pick<Justificativa, 'colaborador_id' | 'data'>[]> {
  const { data, error } = await supabase.from('justificativas_diarias').select('colaborador_id,data').eq('abonado', true)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Só os ativos — usado no seletor "Quem é você?" do login. */
export async function fetchGestoresAtivos(): Promise<Pick<Gestor, 'nome' | 'is_diretor'>[]> {
  const { data, error } = await supabase
    .from('gestores')
    .select('nome,is_diretor')
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

const COLUNAS_TAREFAS = 'id,colaborador_id,data,hora,categoria,cliente,sistema,departamento,tarefa,duracao'
const TAREFAS_DIAS_POR_JANELA = 7
const TAREFAS_JANELAS_EM_PARALELO = 4

/**
 * Tarefas lançadas no G-Click num intervalo -- só as colunas que a aba de
 * tarefas usa. A tabela passa de 90 mil linhas, então nunca buscar sem filtro
 * de data. Paginar o ano inteiro com OFFSET vai ficando mais lento a cada
 * página (offsets de milhares de linhas estouravam o statement timeout de ~3 s
 * do Supabase assim que duas requisições rodavam juntas), por isso o período é
 * dividido em janelas de 7 dias: cada janela tem poucos milhares de linhas
 * (offsets baratos), é paginada em sequência e poucas janelas rodam em
 * paralelo. O desempate por `id` na ordenação garante que as páginas não
 * repitam/percam linhas (várias tarefas têm a mesma data).
 */
export async function fetchTarefasGclick(startDate: IsoDate, endDate: IsoDate): Promise<TarefaGclick[]> {
  const janelas = dividirPeriodo(startDate, endDate, TAREFAS_DIAS_POR_JANELA)
  const resultados: TarefaGclick[][] = new Array(janelas.length)

  let proxima = 0
  const trabalhador = async () => {
    while (proxima < janelas.length) {
      const indice = proxima++
      const [inicio, fim] = janelas[indice]
      resultados[indice] = await fetchAllPages<TarefaGclick>((from, to) =>
        supabase
          .from('tarefas_gclick')
          .select(COLUNAS_TAREFAS)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(TAREFAS_JANELAS_EM_PARALELO, janelas.length) }, trabalhador))

  return resultados.flat()
}
