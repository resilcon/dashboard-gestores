import type { TarefaGclick } from '@/types/domain'
import { addDays, isWeekend, type IsoDate } from '@/utils/date'
import { intervalToMinutes } from '@/utils/duration'

/** Cliente "interno" do G-Click: o próprio escritório (sistema 001-1) — rotinas internas, financeiro, etc. */
export const SISTEMA_INTERNO = '001-1'

export interface InfoColaborador {
  nome: string
  supervisor: string | null
}

/** Uma linha de `tarefas_gclick` já com duração em minutos e o "tipo" da tarefa extraído do texto. */
export interface Lancamento {
  id: string
  colaboradorId: string
  colaborador: string
  supervisor: string | null
  data: IsoDate
  hora: string | null
  categoria: string
  departamento: string
  sistema: string
  cliente: string
  tarefa: string
  tipo: string
  tipoChave: string
  min: number
  interna: boolean
}

const MARCADOR_JURIDICO = /^\s*\((?:a|r|prazo)\)\s*/i

/**
 * O texto da tarefa no G-Click mistura o tipo ("Fechamento de Folha") com o
 * cliente, a competência e até observação livre digitada pelo colaborador
 * ("Altera... - Fulano", "Pedido de CND      Aguardando retorno..."). Pra
 * agrupar "qual tarefa consome mais tempo" o tipo é só o trecho antes do
 * primeiro " - " ou do primeiro bloco de 2+ espaços, sem o marcador jurídico
 * "(A)"/"(R)"/"(Prazo)" no começo.
 */
export function tipoDeTarefa(tarefa: string | null | undefined): string {
  const base = (tarefa ?? '').split(/\s{2,}|\s-\s/)[0].replace(MARCADOR_JURIDICO, '').trim()
  return base || 'Sem descrição'
}

export function chaveDoTipo(tipo: string): string {
  return tipo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export function normalizarLancamentos(rows: TarefaGclick[], colaboradores: Map<string, InfoColaborador>): Lancamento[] {
  return rows.map((r) => {
    const tipo = tipoDeTarefa(r.tarefa)
    const info = colaboradores.get(r.colaborador_id)
    return {
      id: r.id,
      colaboradorId: r.colaborador_id,
      colaborador: info?.nome ?? 'Colaborador removido',
      supervisor: info?.supervisor ?? null,
      data: r.data,
      hora: r.hora,
      categoria: r.categoria,
      departamento: r.departamento || 'Sem departamento',
      sistema: r.sistema ?? '',
      cliente: r.cliente ?? '',
      tarefa: r.tarefa ?? '',
      tipo,
      tipoChave: chaveDoTipo(tipo),
      min: intervalToMinutes(r.duracao) ?? 0,
      interna: r.sistema === SISTEMA_INTERNO,
    }
  })
}

export interface FiltrosLancamentos {
  colaboradorId: string
  departamento: string
  categoria: string
  incluirInternas: boolean
  incluirFimDeSemana: boolean
  /** Descarta lançamentos mais curtos que isso (em minutos) — 0 mantém tudo. */
  minimoMin: number
}

export const FILTROS_PADRAO: FiltrosLancamentos = {
  colaboradorId: '',
  departamento: '',
  categoria: '',
  incluirInternas: true,
  incluirFimDeSemana: false,
  minimoMin: 0,
}

export function filtrarLancamentos(lancamentos: Lancamento[], f: FiltrosLancamentos): Lancamento[] {
  return lancamentos.filter(
    (l) =>
      (!f.colaboradorId || l.colaboradorId === f.colaboradorId) &&
      (!f.departamento || l.departamento === f.departamento) &&
      (!f.categoria || l.categoria === f.categoria) &&
      (f.incluirInternas || !l.interna) &&
      (f.incluirFimDeSemana || !isWeekend(l.data)) &&
      l.min >= f.minimoMin,
  )
}

export interface Grupo {
  chave: string
  rotulo: string
  totalMin: number
  qtd: number
  /** Tempo médio por lançamento. */
  mediaMin: number
  colaboradores: number
  /** Dias distintos com lançamento nesse grupo. */
  dias: number
  /** Participação no tempo total do conjunto agrupado (0–1). */
  pct: number
  /** Valor mais frequente (por tempo) de cada dimensão pedida em `principais`. */
  principais: Record<string, string>
}

type ExtratorPrincipal = (l: Lancamento) => string

export function agrupar(
  lancamentos: Lancamento[],
  chave: (l: Lancamento) => string,
  rotulo: (l: Lancamento) => string = chave,
  principais: Record<string, ExtratorPrincipal> = {},
): Grupo[] {
  interface Acc {
    rotulo: string
    totalMin: number
    qtd: number
    colaboradores: Set<string>
    dias: Set<string>
    principais: Record<string, Map<string, number>>
  }
  const mapa = new Map<string, Acc>()
  let total = 0

  for (const l of lancamentos) {
    const k = chave(l)
    let acc = mapa.get(k)
    if (!acc) {
      acc = {
        rotulo: rotulo(l),
        totalMin: 0,
        qtd: 0,
        colaboradores: new Set(),
        dias: new Set(),
        principais: Object.fromEntries(Object.keys(principais).map((n) => [n, new Map<string, number>()])),
      }
      mapa.set(k, acc)
    }
    acc.totalMin += l.min
    acc.qtd += 1
    acc.colaboradores.add(l.colaboradorId)
    acc.dias.add(l.data)
    for (const [nome, extrair] of Object.entries(principais)) {
      const m = acc.principais[nome]
      const v = extrair(l)
      m.set(v, (m.get(v) ?? 0) + l.min)
    }
    total += l.min
  }

  return [...mapa.entries()]
    .map(([k, acc]) => ({
      chave: k,
      rotulo: acc.rotulo,
      totalMin: acc.totalMin,
      qtd: acc.qtd,
      mediaMin: acc.qtd ? acc.totalMin / acc.qtd : 0,
      colaboradores: acc.colaboradores.size,
      dias: acc.dias.size,
      pct: total ? acc.totalMin / total : 0,
      principais: Object.fromEntries(
        Object.entries(acc.principais).map(([nome, m]) => [nome, [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '']),
      ),
    }))
    .sort((a, b) => b.totalMin - a.totalMin)
}

export const porColaborador = (ls: Lancamento[]) =>
  agrupar(
    ls,
    (l) => l.colaboradorId,
    (l) => l.colaborador,
    { departamento: (l) => l.departamento, tipo: (l) => l.tipo },
  )

export const porDepartamento = (ls: Lancamento[]) => agrupar(ls, (l) => l.departamento, (l) => l.departamento, { tipo: (l) => l.tipo })

export const porTipo = (ls: Lancamento[]) =>
  agrupar(
    ls,
    (l) => l.tipoChave,
    (l) => l.tipo,
    { departamento: (l) => l.departamento },
  )

export const porCliente = (ls: Lancamento[]) =>
  agrupar(
    ls,
    (l) => `${l.sistema}|${l.cliente}`,
    (l) => l.cliente || 'Sem cliente',
    { departamento: (l) => l.departamento },
  )

export const porCategoria = (ls: Lancamento[]) => agrupar(ls, (l) => l.categoria, (l) => l.categoria)

/** Série diária cronológica (um ponto por dia com lançamento). */
export function porDia(ls: Lancamento[]): Grupo[] {
  return agrupar(ls, (l) => l.data).sort((a, b) => a.chave.localeCompare(b.chave))
}

export interface ResumoGeral {
  totalMin: number
  qtd: number
  mediaMin: number
  medianaMin: number
  colaboradores: number
  dias: number
  /** Tempo total ÷ colaboradores que lançaram algo no período. */
  mediaPorColaboradorMin: number
  /** Média de minutos lançados por colaborador por dia em que ele lançou algo. */
  mediaDiariaPorColaboradorMin: number
}

export function resumir(ls: Lancamento[]): ResumoGeral {
  const colaboradores = new Set<string>()
  const dias = new Set<string>()
  const colaboradorDia = new Set<string>()
  let totalMin = 0
  for (const l of ls) {
    totalMin += l.min
    colaboradores.add(l.colaboradorId)
    dias.add(l.data)
    colaboradorDia.add(`${l.colaboradorId}|${l.data}`)
  }
  return {
    totalMin,
    qtd: ls.length,
    mediaMin: ls.length ? totalMin / ls.length : 0,
    medianaMin: mediana(ls.map((l) => l.min)),
    colaboradores: colaboradores.size,
    dias: dias.size,
    mediaPorColaboradorMin: colaboradores.size ? totalMin / colaboradores.size : 0,
    mediaDiariaPorColaboradorMin: colaboradorDia.size ? totalMin / colaboradorDia.size : 0,
  }
}

export function mediana(valores: number[]): number {
  if (!valores.length) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2
}

/** "45 min" abaixo de 1h, "3h 05m" acima — durações por lançamento são curtas, "0h 12m" ficaria estranho. */
export function formatarMinutos(min: number | null | undefined): string {
  if (min === null || min === undefined || Number.isNaN(min)) return '—'
  const total = Math.round(min)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function formatarPct(valor: number): string {
  return `${(valor * 100).toFixed(1).replace('.', ',')}%`
}

export interface PeriodoPredefinido {
  id: string
  label: string
  inicio: IsoDate
  fim: IsoDate
}

function primeiroDiaDoMes(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 8)}01`
}

function ultimoDiaDoMes(iso: IsoDate): IsoDate {
  const [ano, mes] = iso.split('-').map(Number)
  const proximo = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  return addDays(proximo, -1)
}

export function periodosPredefinidos(hoje: IsoDate): PeriodoPredefinido[] {
  const inicioMes = primeiroDiaDoMes(hoje)
  const fimMesPassado = addDays(inicioMes, -1)
  return [
    { id: 'mes', label: 'Este mês', inicio: inicioMes, fim: hoje },
    { id: 'mes-passado', label: 'Mês passado', inicio: primeiroDiaDoMes(fimMesPassado), fim: ultimoDiaDoMes(fimMesPassado) },
    { id: '30d', label: 'Últimos 30 dias', inicio: addDays(hoje, -29), fim: hoje },
    { id: 'ano', label: 'Este ano', inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje },
  ]
}

/** Quebra [inicio, fim] em janelas consecutivas de até `dias` dias (extremos inclusivos, sem sobreposição). */
export function dividirPeriodo(inicio: IsoDate, fim: IsoDate, dias: number): [IsoDate, IsoDate][] {
  const janelas: [IsoDate, IsoDate][] = []
  let cursor = inicio
  while (cursor <= fim) {
    const fimJanela = addDays(cursor, dias - 1)
    janelas.push([cursor, fimJanela < fim ? fimJanela : fim])
    cursor = addDays(cursor, dias)
  }
  return janelas
}
