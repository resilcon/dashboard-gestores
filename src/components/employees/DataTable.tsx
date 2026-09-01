import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { TableSkeleton } from '@/components/feedback/Skeletons'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  emptyMessage?: string
  footer?: ReactNode
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  initialSorting?: SortingState
}

/**
 * Tabela genérica usada pelas 3 visões (Dia, Semana/Período agregado,
 * Período por colaborador) — cada uma passa seu próprio conjunto de colunas.
 * Ordenação clicando no cabeçalho (como no dashboard antigo), sticky header,
 * skeleton/empty state.
 */
export function DataTable<TData>({ columns, data, isLoading, emptyMessage, footer, onRowClick, getRowId, initialSorting }: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId as ((row: TData, index: number) => string) | undefined,
  })

  if (isLoading) return <TableSkeleton cols={columns.length} />

  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState icon={Search} title="Nenhum registro encontrado" description={emptyMessage ?? 'Tente alterar os filtros aplicados.'} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-h-[calc(100svh-19rem)] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(canSort && 'cursor-pointer select-none', 'whitespace-nowrap')}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : sortDir === 'desc' ? (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                          ))}
                      </span>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>
    </div>
  )
}
