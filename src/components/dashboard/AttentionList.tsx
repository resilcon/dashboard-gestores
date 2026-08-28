import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AttentionItem } from '@/utils/dashboard-metrics'

export function AttentionList({ items, onSelect }: { items: AttentionItem[]; onSelect: (colaboradorId: string) => void }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Requer atenção</h2>
        <p className="text-xs text-muted-foreground">Colaboradores abaixo do mínimo ou sem lançamento no período.</p>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted-foreground">
          <CircleCheck className="h-4 w-4 text-success" />
          Nenhuma pendência — equipe dentro do esperado.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.colaboradorId} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <TriangleAlert
                  className={
                    item.classificacao === 'SEM LANCAMENTO' ? 'mt-0.5 h-4 w-4 shrink-0 text-danger' : 'mt-0.5 h-4 w-4 shrink-0 text-warning'
                  }
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detalhe}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onSelect(item.colaboradorId)}>
                Ver detalhes
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
