import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDateBr } from '@/utils/date'
import { formatarMinutos, formatarPct, type Grupo, type Lancamento } from '@/utils/tarefas-gclick'

function Dash() {
  return <span className="text-muted-foreground">—</span>
}

const textoMudo = (valor: string) => (valor ? <span className="text-muted-foreground">{valor}</span> : <Dash />)

const numero = (valor: number) => <span className="tabular-nums">{valor}</span>

/** Colunas que todo agrupamento (colaborador, departamento, tarefa, cliente) compartilha. */
function colunasDeTempo(): ColumnDef<Grupo, unknown>[] {
  return [
    {
      id: 'total',
      header: 'Tempo total',
      accessorFn: (g) => g.totalMin,
      cell: ({ row }) => <span className="font-medium tabular-nums">{formatarMinutos(row.original.totalMin)}</span>,
    },
    {
      id: 'pct',
      header: '% do total',
      accessorFn: (g) => g.pct,
      cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatarPct(row.original.pct)}</span>,
    },
    { id: 'qtd', header: 'Lançamentos', accessorFn: (g) => g.qtd, cell: ({ row }) => numero(row.original.qtd) },
    {
      id: 'media',
      header: 'Média / lançamento',
      accessorFn: (g) => g.mediaMin,
      cell: ({ row }) => <span className="tabular-nums">{formatarMinutos(row.original.mediaMin)}</span>,
    },
  ]
}

const principal = (id: string, header: string, dimensao: string): ColumnDef<Grupo, unknown> => ({
  id,
  header,
  accessorFn: (g) => g.principais[dimensao] ?? '',
  cell: ({ getValue }) => textoMudo(getValue() as string),
})

const nomeEmNegrito = (id: string, header: string): ColumnDef<Grupo, unknown> => ({
  id,
  header,
  accessorFn: (g) => g.rotulo,
  cell: ({ row }) => <span className="font-medium">{row.original.rotulo}</span>,
})

const colaboradoresDistintos: ColumnDef<Grupo, unknown> = {
  id: 'colabs',
  header: 'Colaboradores',
  accessorFn: (g) => g.colaboradores,
  cell: ({ row }) => numero(row.original.colaboradores),
}

export function colunasColaboradores(supervisores: Map<string, string | null>): ColumnDef<Grupo, unknown>[] {
  return [
    nomeEmNegrito('nome', 'Colaborador'),
    { id: 'gestor', header: 'Gestor', accessorFn: (g) => supervisores.get(g.chave) ?? '', cell: ({ getValue }) => textoMudo(getValue() as string) },
    ...colunasDeTempo(),
    { id: 'dias', header: 'Dias ativos', accessorFn: (g) => g.dias, cell: ({ row }) => numero(row.original.dias) },
    {
      id: 'media-dia',
      header: 'Média / dia',
      accessorFn: (g) => (g.dias ? g.totalMin / g.dias : 0),
      cell: ({ row }) => <span className="tabular-nums">{formatarMinutos(row.original.dias ? row.original.totalMin / row.original.dias : 0)}</span>,
    },
    principal('depto', 'Departamento principal', 'departamento'),
    principal('tipo', 'Tarefa principal', 'tipo'),
  ]
}

export function colunasDepartamentos(): ColumnDef<Grupo, unknown>[] {
  return [nomeEmNegrito('depto', 'Departamento'), ...colunasDeTempo(), colaboradoresDistintos, principal('tipo', 'Tarefa principal', 'tipo')]
}

export function colunasTarefas(): ColumnDef<Grupo, unknown>[] {
  return [nomeEmNegrito('tarefa', 'Tarefa'), principal('depto', 'Departamento principal', 'departamento'), ...colunasDeTempo(), colaboradoresDistintos]
}

export function colunasClientes(): ColumnDef<Grupo, unknown>[] {
  return [nomeEmNegrito('cliente', 'Cliente'), principal('depto', 'Departamento principal', 'departamento'), ...colunasDeTempo(), colaboradoresDistintos]
}

const CATEGORIA_ROTULO: Record<string, string> = { rotina: 'Rotina', plr: 'PLR', premiacao: 'Premiação' }

export function rotuloCategoria(categoria: string): string {
  return CATEGORIA_ROTULO[categoria] ?? categoria
}

export function colunasLancamentos(): ColumnDef<Lancamento, unknown>[] {
  return [
    {
      id: 'data',
      header: 'Data',
      accessorFn: (l) => `${l.data} ${l.hora ?? ''}`,
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatDateBr(row.original.data)} <span className="text-muted-foreground">{row.original.hora?.slice(0, 5) ?? ''}</span>
        </span>
      ),
    },
    { id: 'colaborador', header: 'Colaborador', accessorFn: (l) => l.colaborador, cell: ({ row }) => <span className="font-medium">{row.original.colaborador}</span> },
    { id: 'depto', header: 'Departamento', accessorFn: (l) => l.departamento, cell: ({ getValue }) => textoMudo(getValue() as string) },
    {
      id: 'tarefa',
      header: 'Tarefa',
      accessorFn: (l) => l.tarefa,
      cell: ({ row }) => (
        <span className="block max-w-[28rem] truncate" title={row.original.tarefa}>
          {row.original.tarefa}
        </span>
      ),
    },
    {
      id: 'cliente',
      header: 'Cliente',
      accessorFn: (l) => l.cliente,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="block max-w-56 truncate" title={row.original.cliente}>
            {row.original.cliente || <Dash />}
          </span>
          {row.original.interna && <Badge variant="outline">interna</Badge>}
        </span>
      ),
    },
    { id: 'categoria', header: 'Categoria', accessorFn: (l) => l.categoria, cell: ({ row }) => textoMudo(rotuloCategoria(row.original.categoria)) },
    {
      id: 'duracao',
      header: 'Duração',
      accessorFn: (l) => l.min,
      cell: ({ row }) => <span className="font-medium tabular-nums">{formatarMinutos(row.original.min)}</span>,
    },
  ]
}
