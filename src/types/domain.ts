import type { PgInterval } from '@/utils/duration'
import type { IsoDate } from '@/utils/date'

/**
 * Tipos derivados diretamente dos campos que o Supabase (PostgREST) devolve
 * hoje -- nomes de coluna preservados 1:1 do dashboard antigo (não
 * renomeados), conferidos contra o `index.html` em produção. Nenhuma tabela,
 * view ou coluna nova foi inventada aqui.
 */
type IsoDate_ = IsoDate

export type Classificacao = 'OK' | 'ABAIXO DO LM' | 'ACIMA DA JORNADA' | 'SEM LANCAMENTO'

export type TipoColaborador = 'efetivo' | 'estagiario'

export type StatusRegistro = 'ativo' | 'inativo'

/** 1 linha de `vw_resumo_diario` — 1 colaborador em 1 dia. */
export interface DashboardRecord {
  colaborador_id: string
  nome: string
  departamento: string | null
  supervisor: string | null
  status: StatusRegistro
  tipo_colaborador: TipoColaborador
  data: IsoDate_
  horas_trabalhadas: PgInterval
  workmonitor_total: PgInterval
  total_gclick: PgInterval
  classificacao: Classificacao | null
  ultima_justificativa: string | null
  ultima_justificativa_gestor: string | null
  ultima_justificativa_em: string | null
  /** Espelha `neocode_diario.metricas` (jsonb) pra essa data — usado no comparativo de teclas/cliques. */
  metricas: WorkMonitorMetricas | null
}

/** 1 linha de `neocode_diario` — detalhe do WorkMonitor de 1 colaborador em 1 dia. */
export interface WorkMonitorRecord {
  colaborador_id: string
  data: IsoDate_
  total: PgInterval
  produtivo: PgInterval
  neutro: PgInterval
  /** Nome de coluna real é "distracao" — representa o tempo IMPRODUTIVO do dia. */
  distracao: PgInterval
  inicio: string | null
  fim: string | null
  metricas: WorkMonitorMetricas | null
}

export interface WorkMonitorMetricas {
  apps_utilizados?: number | null
  registros_atividade?: number | null
  trocas_aplicativo?: number | null
  cliques_teclas?: number | null
  produtividade_geral_pct?: number | null
  maior_atividade_continua?: string | null
  app_mais_usado?: string | null
  horario_inicial_destaque?: string | null
  horario_final_destaque?: string | null
  teclas?: number | null
  cliques?: number | null
}

export type ProdutividadeApp = 'Produtivo' | 'Neutro' | 'Improdutivo'

/** 1 linha de `apps_uso_diario` — 1 app no Top 5 de 1 colaborador em 1 dia. */
export interface AppUsoDiario {
  colaborador_id: string
  data: IsoDate_
  posicao: number
  aplicativo: string
  tempo_min: number | null
  pct_tempo: number | null
  produtividade: ProdutividadeApp | null
}

/** `colaboradores` — cadastro usado na tela de Equipe. */
export interface Colaborador {
  id: string
  nome: string
  supervisor: string | null
  status: StatusRegistro
  apelidos: string[] | null
}

/** `gestores` — cadastro fixo de gestores/diretores. */
export interface Gestor {
  id: string
  nome: string
  status: StatusRegistro
  is_diretor: boolean
}

/** `justificativas_diarias` — 1 justificativa registrada pra 1 colaborador/dia. */
export interface Justificativa {
  id?: string
  colaborador_id: string
  data: IsoDate_
  justificativa: string
  gestor_nome: string
  /** Dia abonado/desconsiderado (férias, folga, atestado...) -- exclui esse dia dos cálculos do dashboard. Requer a migration `20260827_add_abonado_justificativas.sql`. */
  abonado: boolean
  criado_em?: string
}

/** Alvo de uma ação de justificar -- só o mínimo pra identificar o dia, sem depender do formato de `DashboardRecord` (usado tanto nas tabelas quanto na criação avulsa). */
export interface JustifyTarget {
  colaboradorId: string
  data: IsoDate_
  nome: string
}

/** 1 colaborador somado num intervalo (Semana ou Período agregado) — calculado no cliente, não vem do Supabase. */
export interface ResumoPeriodoColaborador {
  colaborador_id: string
  nome: string
  supervisor: string | null
  tipo_colaborador: TipoColaborador
  gclick_min: number
  tangerino_min: number
  wm_min: number
  dias_com_dado: number
  dias_sem_lancamento: number
  dias_abaixo_lm: number
  dias_acima_jornada: number
  dias_totais: number
}

export type PeriodMode = 'dia' | 'semana' | 'periodo'

export interface PeriodFilter {
  mode: PeriodMode
  /** Dia único (modo Dia/Semana) ou início do intervalo (modo Período). */
  date: IsoDate_
  /** Só usado no modo Período. */
  endDate?: IsoDate_
}
