import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable } from '@/components/employees/DataTable'
import { PctPontoFooterRow } from '@/components/employees/PctPontoFooterRow'
import { buildPeriodByEmployeeColumns } from '@/components/employees/columns'
import { calcularPctPonto } from '@/utils/pct-ponto'
import { intervalToMinutes } from '@/utils/duration'
import { filterNaoAbonados } from '@/utils/abonado'
import type { DashboardRecord, JustifyTarget } from '@/types/domain'

interface PeriodEmployeeListDialogProps {
  nome: string | null
  rows: DashboardRecord[]
  periodLabel: string
  isLoading?: boolean
  diasAbonados: Set<string>
  onJustificar: (target: JustifyTarget) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Todos os lançamentos de 1 colaborador no período filtrado, em formato de
 * lista (mesma tabela da visão "Dia a dia") -- aberto ao clicar num
 * colaborador na visão agregada (Semana/Período), sem precisar trocar de
 * filtro pra ver o detalhe dia a dia dessa pessoa.
 */
export function PeriodEmployeeListDialog({ nome, rows, periodLabel, isLoading, diasAbonados, onJustificar, onOpenChange }: PeriodEmployeeListDialogProps) {
  const ordenadas = rows.slice().sort((a, b) => a.data.localeCompare(b.data))
  // Dias abonados continuam visíveis na lista (transparência: dá pra ver o
  // motivo na coluna Classificação), mas não entram na média do rodapé.
  const paraMedia = filterNaoAbonados(ordenadas, diasAbonados)

  return (
    <Dialog open={Boolean(nome)} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{nome}</DialogTitle>
          <DialogDescription>Lançamentos de {periodLabel}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DataTable
            columns={buildPeriodByEmployeeColumns({ onJustificar, diasAbonados })}
            data={ordenadas}
            isLoading={isLoading}
            emptyMessage="Nenhum lançamento encontrado nesse período."
            getRowId={(r) => r.data}
            footer={
              <PctPontoFooterRow
                values={paraMedia.map((r) => calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)))}
                colSpanBefore={5}
                colSpanAfter={1}
              />
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
