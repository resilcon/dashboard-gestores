import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { PeriodToolbar } from '@/components/filters/PeriodToolbar'
import { DataTable } from '@/components/employees/DataTable'
import { PctPontoFooterRow } from '@/components/employees/PctPontoFooterRow'
import { buildDailyColumns, buildPeriodAggregateColumns, buildPeriodByEmployeeColumns } from '@/components/employees/columns'
import { EmployeeDetailSheet } from '@/components/employees/EmployeeDetailSheet'
import { PeriodEmployeeListDialog } from '@/components/employees/PeriodEmployeeListDialog'
import { JustifyDialog } from '@/components/employees/JustifyDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useDashboardRecent, useDashboardRange, useDiasAbonados } from '@/hooks/useDashboardData'
import { computeTeamKpis, computeTeamKpisFromAggregate } from '@/utils/dashboard-metrics'
import { aggregatePeriod, filterDiasUteis, hasDataForDay } from '@/utils/aggregate-period'
import { filterNaoAbonados } from '@/utils/abonado'
import { addDays, isWeekend, previousBusinessDay, startOfWeekMonday, weekDates, weekdayIndex, formatDateBr, todayIso } from '@/utils/date'
import { calcularPctPonto } from '@/utils/pct-ponto'
import { intervalToMinutes } from '@/utils/duration'
import { exportarAgregado, exportarDia, exportarPeriodoColaborador } from '@/utils/export-excel'
import type { DashboardRecord, JustifyTarget, PeriodMode } from '@/types/domain'

// Referência estável (fora do componente) -- se fosse `?? new Set()` dentro
// do componente, criaria um Set novo a cada render enquanto a query ainda
// não respondeu, invalidando a memoização de todo mundo que depende disso.
const SET_VAZIO: Set<string> = new Set()

export default function DashboardPage() {
  const [mode, setMode] = useState<PeriodMode>('dia')
  const [date, setDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [colaboradorFiltro, setColaboradorFiltro] = useState('')
  const [diaSemanaFiltro, setDiaSemanaFiltro] = useState('')
  const [search, setSearch] = useState('')
  const [gestorFiltro, setGestorFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [selectedRow, setSelectedRow] = useState<DashboardRecord | null>(null)
  const [justifyTarget, setJustifyTarget] = useState<JustifyTarget | null>(null)
  const [periodListColaborador, setPeriodListColaborador] = useState<{ id: string; nome: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const recent = useDashboardRecent()
  // Sábado/domingo não contam pra nada na página (pedido explícito) -- filtrado
  // uma única vez aqui, então todo o resto (KPIs, tabelas, agregação) já
  // trabalha só com dias úteis.
  const allRows = useMemo(() => filterDiasUteis(recent.data ?? []), [recent.data])

  const range = useDashboardRange(mode === 'periodo' ? date : null, mode === 'periodo' ? endDate : null, colaboradorFiltro || undefined)
  const rangeRows = useMemo(() => filterDiasUteis(range.data ?? []), [range.data])

  // Dia abonado (justificativa marcada como tal) sai de todo cálculo -- igual
  // fim de semana, só que o critério vem de uma justificativa, não da data.
  // A linha continua visível nas tabelas (badge "ABONADO"), só não entra em
  // KPIs, agregações nem médias de % Ponto.
  const diasAbonadosQuery = useDiasAbonados()
  const diasAbonados = diasAbonadosQuery.data ?? SET_VAZIO

  // Assim que os dados chegam pela 1ª vez, pula pro dia mais recente que tem
  // registro (allRows já vem ordenado do mais novo pro mais antigo) -- evita
  // abrir parado em "hoje" quando ainda não há lançamento nenhum pra hoje.
  // Só roda 1 vez: depois disso a navegação fica 100% com o usuário.
  const ajusteInicialFeito = useRef(false)
  useEffect(() => {
    if (ajusteInicialFeito.current || !recent.data?.length) return
    ajusteInicialFeito.current = true
    if (date === todayIso() && !allRows.some((r) => r.data === date)) {
      const maisRecente = allRows[0]?.data ?? recent.data[0].data
      setDate(maisRecente)
      setEndDate(maisRecente)
    }
  }, [recent.data, allRows, date])

  const gestorOptions = useMemo(() => {
    const nomes = new Set<string>()
    for (const r of allRows) if (r.supervisor) nomes.add(r.supervisor)
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allRows])

  const colaboradorOptions = useMemo(() => {
    const vistos = new Map<string, string>()
    for (const r of allRows) if (!vistos.has(r.colaborador_id)) vistos.set(r.colaborador_id, r.nome)
    return [...vistos.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [allRows])

  // "Dia" exibe todo mundo (dia abonado incluso, com badge) -- só a versão
  // "Calc" (sem abonados) alimenta KPIs e a média do rodapé.
  const rowsDoDia = useMemo(() => allRows.filter((r) => r.data === date), [allRows, date])
  const rowsDoDiaCalc = useMemo(() => filterNaoAbonados(rowsDoDia, diasAbonados), [rowsDoDia, diasAbonados])

  const filteredDia = useMemo(() => {
    let rows = rowsDoDia
    if (search) rows = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()))
    if (gestorFiltro) rows = rows.filter((r) => r.supervisor === gestorFiltro)
    if (statusFiltro === 'com') rows = rows.filter(hasDataForDay)
    if (statusFiltro === 'sem') rows = rows.filter((r) => !hasDataForDay(r))
    return rows
  }, [rowsDoDia, search, gestorFiltro, statusFiltro])

  const datasSemana = useMemo(() => weekDates(startOfWeekMonday(date)).filter((d) => !isWeekend(d)), [date])
  // Semana/Período só mostram o AGREGADO (nunca a linha crua de 1 dia), então
  // já entra direto na versão sem abonados -- não precisa de 2 variantes aqui.
  const rowsSemana = useMemo(() => allRows.filter((r) => datasSemana.includes(r.data)), [allRows, datasSemana])
  const rowsSemanaCalc = useMemo(() => filterNaoAbonados(rowsSemana, diasAbonados), [rowsSemana, diasAbonados])
  const agregadoSemana = useMemo(() => aggregatePeriod(rowsSemanaCalc), [rowsSemanaCalc])
  const filteredSemana = useMemo(() => {
    let rows = agregadoSemana
    if (search) rows = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()))
    if (gestorFiltro) rows = rows.filter((r) => r.supervisor === gestorFiltro)
    return rows
  }, [agregadoSemana, search, gestorFiltro])

  // Filtro extra "só sextas-feiras" (etc.) -- só faz sentido no modo Período,
  // aplicado antes de agregar/listar (fins de semana já saíram em rangeRows).
  const rangeRowsFiltradas = useMemo(() => {
    if (!diaSemanaFiltro) return rangeRows
    const alvo = Number(diaSemanaFiltro)
    return rangeRows.filter((r) => weekdayIndex(r.data) === alvo)
  }, [rangeRows, diaSemanaFiltro])
  const rangeRowsCalc = useMemo(() => filterNaoAbonados(rangeRowsFiltradas, diasAbonados), [rangeRowsFiltradas, diasAbonados])

  const agregadoPeriodo = useMemo(() => aggregatePeriod(rangeRowsCalc), [rangeRowsCalc])
  const filteredPeriodoAgregado = useMemo(() => {
    let rows = agregadoPeriodo
    if (search) rows = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()))
    if (gestorFiltro) rows = rows.filter((r) => r.supervisor === gestorFiltro)
    return rows
  }, [agregadoPeriodo, search, gestorFiltro])

  // Lista por colaborador (Período com 1 pessoa escolhida): mostra todo
  // mundo, abonado incluso -- a média do rodapé usa a versão sem abonados.
  const rowsPeriodoColaborador = useMemo(
    () => rangeRowsFiltradas.slice().sort((a, b) => a.data.localeCompare(b.data)),
    [rangeRowsFiltradas],
  )
  const rowsPeriodoColaboradorCalc = useMemo(() => filterNaoAbonados(rowsPeriodoColaborador, diasAbonados), [rowsPeriodoColaborador, diasAbonados])

  // KPIs + "Requer atenção": Dia usa a classificação do dia; Semana/Período
  // usam o agregado (colaborador teve pelo menos 1 dia problemático no
  // intervalo) -- não dá pra usar "a" classificação de um período inteiro.
  const kpis = useMemo(() => {
    if (mode === 'dia') return computeTeamKpis(rowsDoDiaCalc)
    if (mode === 'semana') return computeTeamKpisFromAggregate(agregadoSemana)
    return computeTeamKpisFromAggregate(agregadoPeriodo)
  }, [mode, rowsDoDiaCalc, agregadoSemana, agregadoPeriodo])

  // Comparação com período anterior: só existe fonte confiável pra "dia"
  // (dia útil anterior, já carregado em allRows) -- pra Semana/Período seria
  // preciso buscar outro intervalo, então não fabricamos essa comparação.
  const deltaDentroDoEsperado = useMemo(() => {
    if (mode !== 'dia') return null
    const diaAnterior = previousBusinessDay(date)
    const rowsAnterior = filterNaoAbonados(allRows.filter((r) => r.data === diaAnterior), diasAbonados)
    if (!rowsAnterior.length) return null
    return kpis.dentroDoEsperado - computeTeamKpis(rowsAnterior).dentroDoEsperado
  }, [mode, allRows, date, diasAbonados, kpis.dentroDoEsperado])

  function handleNavigateDay(direction: -1 | 1) {
    setDate((d) => {
      if (mode === 'semana') return addDays(d, direction * 7)
      // Modo Dia pula fim de semana -- sábado/domingo não existem pra essa página.
      let proxima = addDays(d, direction)
      while (isWeekend(proxima)) proxima = addDays(proxima, direction)
      return proxima
    })
  }

  function abrirListaPeriodo(colaboradorId: string, nome: string) {
    setPeriodListColaborador({ id: colaboradorId, nome })
  }

  const rowsColaboradorSelecionadoSemana = useMemo(
    () => (periodListColaborador ? rowsSemana.filter((r) => r.colaborador_id === periodListColaborador.id) : []),
    [rowsSemana, periodListColaborador],
  )
  const rowsColaboradorSelecionadoPeriodo = useMemo(
    () => (periodListColaborador ? rangeRowsFiltradas.filter((r) => r.colaborador_id === periodListColaborador.id) : []),
    [rangeRowsFiltradas, periodListColaborador],
  )

  async function handleExport() {
    setIsExporting(true)
    try {
      if (mode === 'dia') {
        await exportarDia(filteredDia, date)
      } else if (mode === 'semana') {
        await exportarAgregado(filteredSemana, 'semana', datasSemana[0], datasSemana[datasSemana.length - 1])
      } else if (colaboradorFiltro) {
        const nome = rowsPeriodoColaborador[0]?.nome ?? 'colaborador'
        await exportarPeriodoColaborador(rowsPeriodoColaborador, nome, date, endDate)
      } else {
        await exportarAgregado(filteredPeriodoAgregado, 'periodo', date, endDate)
      }
      toast.success('Arquivo Excel gerado')
    } catch (err) {
      toast.error('Não foi possível gerar o arquivo Excel', { description: (err as Error).message })
    } finally {
      setIsExporting(false)
    }
  }

  const periodLabel =
    mode === 'dia'
      ? `${rowsDoDia.length} colaborador(es) no dia`
      : mode === 'semana'
        ? `Semana de ${formatDateBr(datasSemana[0])} a ${formatDateBr(datasSemana[datasSemana.length - 1])} (dias úteis)`
        : date && endDate
          ? `${formatDateBr(date)} a ${formatDateBr(endDate)}${diaSemanaFiltro ? ' · só ' + diaSemanaLabel(diaSemanaFiltro) : ''}`
          : 'Escolha as duas datas do período'

  return (
    <>
      <Header
        title="Visão geral"
        lastUpdated={recent.dataUpdatedAt ? new Date(recent.dataUpdatedAt) : null}
        onRefresh={() => recent.refetch()}
        isRefreshing={recent.isFetching}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <div className="flex-1 overflow-auto p-5">
        {recent.isError ? (
          <ErrorState message={(recent.error as Error)?.message} onRetry={() => recent.refetch()} />
        ) : (
          <div className="flex flex-col gap-5">
            <KpiCards kpis={kpis} deltaDentroDoEsperado={deltaDentroDoEsperado} isLoading={mode === 'dia' ? recent.isLoading : mode === 'semana' ? recent.isLoading : range.isLoading} />

            <PeriodToolbar
              mode={mode}
              onModeChange={setMode}
              date={date}
              onDateChange={setDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              onNavigate={handleNavigateDay}
              periodLabel={periodLabel}
              search={search}
              onSearchChange={setSearch}
              gestor={gestorFiltro}
              onGestorChange={setGestorFiltro}
              gestorOptions={gestorOptions}
              statusFiltro={mode === 'dia' ? statusFiltro : undefined}
              onStatusFiltroChange={setStatusFiltro}
              colaboradorOptions={mode === 'periodo' ? colaboradorOptions : undefined}
              colaboradorFiltro={colaboradorFiltro}
              onColaboradorFiltroChange={setColaboradorFiltro}
              diaSemanaFiltro={mode === 'periodo' ? diaSemanaFiltro : undefined}
              onDiaSemanaFiltroChange={setDiaSemanaFiltro}
            />

            {mode === 'dia' && (
              <DataTable
                columns={buildDailyColumns({ onVerDetalhes: setSelectedRow, onJustificar: setJustifyTarget, diasAbonados })}
                data={filteredDia}
                isLoading={recent.isLoading}
                onRowClick={setSelectedRow}
                getRowId={(r) => `${r.colaborador_id}-${r.data}`}
                footer={
                  <PctPontoFooterRow
                    values={filterNaoAbonados(filteredDia, diasAbonados).map((r) =>
                      calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)),
                    )}
                    colSpanBefore={5}
                    colSpanAfter={3}
                  />
                }
              />
            )}

            {mode === 'semana' && (
              <DataTable
                columns={buildPeriodAggregateColumns()}
                data={filteredSemana}
                isLoading={recent.isLoading}
                getRowId={(r) => r.colaborador_id}
                onRowClick={(r) => abrirListaPeriodo(r.colaborador_id, r.nome)}
                footer={
                  <PctPontoFooterRow
                    values={filteredSemana.map((r) => calcularPctPonto(r.gclick_min || null, r.tangerino_min || null))}
                    colSpanBefore={6}
                    colSpanAfter={2}
                  />
                }
              />
            )}

            {mode === 'periodo' &&
              (colaboradorFiltro ? (
                <DataTable
                  columns={buildPeriodByEmployeeColumns({ onJustificar: setJustifyTarget, diasAbonados })}
                  data={rowsPeriodoColaborador}
                  isLoading={range.isLoading}
                  emptyMessage="Nenhum lançamento encontrado nesse período."
                  getRowId={(r) => r.data}
                  footer={
                    <PctPontoFooterRow
                      values={rowsPeriodoColaboradorCalc.map((r) => calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)))}
                      colSpanBefore={5}
                      colSpanAfter={1}
                    />
                  }
                />
              ) : (
                <DataTable
                  columns={buildPeriodAggregateColumns()}
                  data={filteredPeriodoAgregado}
                  isLoading={range.isLoading}
                  getRowId={(r) => r.colaborador_id}
                  onRowClick={(r) => abrirListaPeriodo(r.colaborador_id, r.nome)}
                  footer={
                    <PctPontoFooterRow
                      values={filteredPeriodoAgregado.map((r) => calcularPctPonto(r.gclick_min || null, r.tangerino_min || null))}
                      colSpanBefore={6}
                      colSpanAfter={2}
                    />
                  }
                />
              ))}
          </div>
        )}
      </div>

      <EmployeeDetailSheet row={selectedRow} allRows={allRows} onOpenChange={(open) => !open && setSelectedRow(null)} />
      <JustifyDialog target={justifyTarget} onOpenChange={(open) => !open && setJustifyTarget(null)} />
      <PeriodEmployeeListDialog
        nome={periodListColaborador?.nome ?? null}
        rows={mode === 'semana' ? rowsColaboradorSelecionadoSemana : rowsColaboradorSelecionadoPeriodo}
        periodLabel={mode === 'semana' ? `${formatDateBr(datasSemana[0])} a ${formatDateBr(datasSemana[datasSemana.length - 1])}` : `${formatDateBr(date)} a ${formatDateBr(endDate)}`}
        isLoading={mode === 'periodo' && range.isLoading}
        diasAbonados={diasAbonados}
        onJustificar={setJustifyTarget}
        onOpenChange={(open) => !open && setPeriodListColaborador(null)}
      />
    </>
  )
}

function diaSemanaLabel(valor: string): string {
  const nomes: Record<string, string> = { '1': 'segundas', '2': 'terças', '3': 'quartas', '4': 'quintas', '5': 'sextas' }
  return nomes[valor] ?? ''
}
