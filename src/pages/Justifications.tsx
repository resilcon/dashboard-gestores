import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { TableSkeleton } from '@/components/feedback/Skeletons'
import { ErrorState } from '@/components/feedback/ErrorState'
import { NovaJustificativaDialog } from '@/components/employees/NovaJustificativaDialog'
import { useJustificativas } from '@/hooks/useJustificativas'
import { useColaboradores } from '@/hooks/useTeamData'
import { addDays, formatDateBr, todayIso } from '@/utils/date'

export default function JustificationsPage() {
  const [inicio, setInicio] = useState(addDays(todayIso(), -30))
  const [fim, setFim] = useState(todayIso())

  const justificativas = useJustificativas(inicio, fim)
  const colaboradores = useColaboradores()

  const nomesPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of colaboradores.data ?? []) map.set(c.id, c.nome)
    return map
  }, [colaboradores.data])

  const colaboradoresAtivos = useMemo(() => (colaboradores.data ?? []).filter((c) => c.status === 'ativo'), [colaboradores.data])

  return (
    <>
      <Header title="Justificativas" onRefresh={() => justificativas.refetch()} isRefreshing={justificativas.isFetching}>
        <NovaJustificativaDialog colaboradores={colaboradoresAtivos} />
      </Header>

      <div className="flex-1 overflow-auto p-5">
        <div className="mb-4 flex items-center gap-2">
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="h-8 w-[150px]" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-8 w-[150px]" />
        </div>

        {justificativas.isError ? (
          <ErrorState message={(justificativas.error as Error)?.message} onRetry={() => justificativas.refetch()} />
        ) : justificativas.isLoading ? (
          <TableSkeleton cols={5} />
        ) : !justificativas.data?.length ? (
          <EmptyState icon={FileText} title="Nenhuma justificativa neste período" description="Tente ampliar o intervalo de datas." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Dia abonado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {justificativas.data.map((j) => (
                  <TableRow key={`${j.colaborador_id}-${j.data}`}>
                    <TableCell className="whitespace-nowrap">{formatDateBr(j.data)}</TableCell>
                    <TableCell className="font-medium">{nomesPorId.get(j.colaborador_id) ?? j.colaborador_id}</TableCell>
                    <TableCell className="max-w-md">{j.justificativa}</TableCell>
                    <TableCell className="text-muted-foreground">{j.gestor_nome}</TableCell>
                    <TableCell>
                      {j.abonado ? (
                        <span className="inline-flex items-center rounded-full bg-brand-secondary/10 px-2 py-0.5 text-xs font-medium text-brand-secondary">
                          Sim — fora dos cálculos
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}
