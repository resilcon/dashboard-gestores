import { TableCell, TableRow } from '@/components/ui/table'
import { mediaPctPonto, formatarPctPonto, pctPontoEhBaixo } from '@/utils/pct-ponto'
import { cn } from '@/lib/utils'

/** Rodapé com a média do % Ponto das linhas exibidas -- mesma lógica já usada no dashboard antigo. */
export function PctPontoFooterRow({
  values,
  colSpanBefore,
  colSpanAfter,
}: {
  values: Array<number | null>
  colSpanBefore: number
  colSpanAfter: number
}) {
  const { media, comDado, total } = mediaPctPonto(values)
  if (comDado === 0) return null

  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell colSpan={colSpanBefore} className="text-right text-xs font-medium text-muted-foreground">
        Média do % Ponto ({comDado} de {total} com dado)
      </TableCell>
      <TableCell className={cn('font-semibold tabular-nums', pctPontoEhBaixo(media) && 'text-danger')}>{formatarPctPonto(media)}</TableCell>
      {colSpanAfter > 0 && <TableCell colSpan={colSpanAfter} />}
    </TableRow>
  )
}
