import { useMemo, useState } from 'react'
import { CalendarClock, Clock, Flame, ListChecks, Search, Timer, TrendingUp, Users, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/dashboard/KpiCards'
import { DataTable } from '@/components/employees/DataTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { KpiCardSkeleton } from '@/components/feedback/Skeletons'
import { BarrasHorizontais, BarrasPorDia, CartaoGrafico } from '@/components/tarefas/Graficos'
import {
  colunasClientes,
  colunasColaboradores,
  colunasDepartamentos,
  colunasLancamentos,
  colunasTarefas,
  rotuloCategoria,
} from '@/components/tarefas/colunas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useIdentity } from '@/context/IdentityContext'
import { useColaboradores } from '@/hooks/useTeamData'
import { useTarefasGclick } from '@/hooks/useTarefasGclick'
import { cn } from '@/lib/utils'
import { exportarTarefas } from '@/utils/export-excel'
import { formatDateBr, todayIso } from '@/utils/date'
import {
  FILTROS_PADRAO,
  filtrarLancamentos,
  formatarMinutos,
  formatarPct,
  normalizarLancamentos,
  periodosPredefinidos,
  porCliente,
  porColaborador,
  porDepartamento,
  porDia,
  porTipo,
  resumir,
  type FiltrosLancamentos,
  type InfoColaborador,
} from '@/utils/tarefas-gclick'

const ABAS = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'departamentos', label: 'Departamentos' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'lancamentos', label: 'Lançamentos' },
] as const

/** Tabela de lançamentos detalhados renderiza no máximo isso — um mês passa fácil de 10 mil linhas; o Excel leva tudo. */
const LIMITE_LANCAMENTOS_NA_TELA = 1000

const todos = (valor: string) => valor || 'todos'
const semTodos = (valor: string) => (valor === 'todos' ? '' : valor)

export default function TarefasPage() {
  const hoje = useMemo(() => todayIso(), [])
  const presets = useMemo(() => periodosPredefinidos(hoje), [hoje])

  const [presetId, setPresetId] = useState('mes')
  const [inicio, setInicio] = useState(presets[0].inicio)
  const [fim, setFim] = useState(presets[0].fim)
  const [filtros, setFiltros] = useState<FiltrosLancamentos>(FILTROS_PADRAO)
  const [gestor, setGestor] = useState('')
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('visao')
  const [isExporting, setIsExporting] = useState(false)

  const { identidade } = useIdentity()
  const podeVerTudo = identidade?.isDiretor ?? false
  const meuNome = identidade?.nome

  const tarefas = useTarefasGclick(inicio, fim)
  const colaboradores = useColaboradores()

  const infoColaboradores = useMemo(() => {
    const mapa = new Map<string, InfoColaborador>()
    for (const c of colaboradores.data ?? []) mapa.set(c.id, { nome: c.nome, supervisor: c.supervisor })
    return mapa
  }, [colaboradores.data])

  // Mesma regra do dashboard: diretoria vê todo mundo, gestor só a própria equipe.
  const base = useMemo(() => {
    const todas = normalizarLancamentos(tarefas.data ?? [], infoColaboradores)
    return podeVerTudo ? todas : todas.filter((l) => l.supervisor === meuNome)
  }, [tarefas.data, infoColaboradores, podeVerTudo, meuNome])

  const opcoes = useMemo(() => {
    const colabs = new Map<string, string>()
    const deptos = new Set<string>()
    const categorias = new Set<string>()
    const gestores = new Set<string>()
    for (const l of base) {
      colabs.set(l.colaboradorId, l.colaborador)
      deptos.add(l.departamento)
      categorias.add(l.categoria)
      if (l.supervisor) gestores.add(l.supervisor)
    }
    return {
      colaboradores: [...colabs.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      departamentos: [...deptos].sort((a, b) => a.localeCompare(b)),
      categorias: [...categorias].sort(),
      gestores: [...gestores].sort((a, b) => a.localeCompare(b)),
    }
  }, [base])

  const lancamentos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return filtrarLancamentos(base, filtros).filter(
      (l) =>
        (!gestor || l.supervisor === gestor) &&
        (!termo || l.tarefa.toLowerCase().includes(termo) || l.cliente.toLowerCase().includes(termo)),
    )
  }, [base, filtros, gestor, busca])

  const analise = useMemo(() => {
    const colabs = porColaborador(lancamentos)
    const deptos = porDepartamento(lancamentos)
    const tipos = porTipo(lancamentos)
    return {
      resumo: resumir(lancamentos),
      colabs,
      deptos,
      tipos,
      clientes: porCliente(lancamentos),
      dias: porDia(lancamentos),
      topTipo: tipos[0],
      topDepto: deptos[0],
      topColab: colabs[0],
    }
  }, [lancamentos])

  const supervisores = useMemo(() => new Map([...infoColaboradores].map(([id, c]) => [id, c.supervisor])), [infoColaboradores])
  const lancamentosOrdenados = useMemo(
    () => [...lancamentos].sort((a, b) => `${b.data} ${b.hora ?? ''}`.localeCompare(`${a.data} ${a.hora ?? ''}`)),
    [lancamentos],
  )

  const alterouFiltros =
    JSON.stringify(filtros) !== JSON.stringify(FILTROS_PADRAO) || gestor !== '' || busca !== ''
  const limparFiltros = () => {
    setFiltros(FILTROS_PADRAO)
    setGestor('')
    setBusca('')
  }
  const atualizarFiltro = <K extends keyof FiltrosLancamentos>(chave: K, valor: FiltrosLancamentos[K]) =>
    setFiltros((f) => ({ ...f, [chave]: valor }))

  const escolherPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    setPresetId(id)
    setInicio(preset.inicio)
    setFim(preset.fim)
  }

  const exportar = async () => {
    setIsExporting(true)
    try {
      await exportarTarefas(
        {
          colaboradores: analise.colabs,
          departamentos: analise.deptos,
          tarefas: analise.tipos,
          clientes: analise.clientes,
          lancamentos: lancamentosOrdenados,
        },
        inicio,
        fim,
      )
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível gerar o arquivo.')
    } finally {
      setIsExporting(false)
    }
  }

  const { resumo, topTipo, topDepto, topColab } = analise
  const periodoInvalido = !inicio || !fim || inicio > fim
  // `isPending` (sem dado ainda) em vez de `isLoading`: com a aba do navegador em
  // segundo plano o React Query pausa o retry, e aí `isLoading` fica falso com
  // `data` vazio -- a tela mostraria zeros como se não houvesse tarefa nenhuma.
  const carregando = !periodoInvalido && (tarefas.isPending || colaboradores.isPending)

  return (
    <>
      <Header
        title="Tarefas G-Click"
        onRefresh={() => void tarefas.refetch()}
        isRefreshing={tarefas.isFetching}
        onExport={lancamentos.length ? () => void exportar() : undefined}
        isExporting={isExporting}
        lastUpdated={tarefas.dataUpdatedAt ? new Date(tarefas.dataUpdatedAt) : null}
      />

      <div className="flex-1 overflow-auto p-5">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => escolherPreset(p.id)}
                  className={cn(
                    'rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors',
                    presetId === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Input
                type="date"
                value={inicio}
                max={fim}
                onChange={(e) => {
                  setPresetId('')
                  setInicio(e.target.value)
                }}
                className="h-8 w-[150px]"
                aria-label="Data inicial"
              />
              até
              <Input
                type="date"
                value={fim}
                min={inicio}
                onChange={(e) => {
                  setPresetId('')
                  setFim(e.target.value)
                }}
                className="h-8 w-[150px]"
                aria-label="Data final"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tarefa ou cliente..." className="h-8 w-[230px] pl-8" />
            </div>

            <Select value={todos(filtros.colaboradorId)} onValueChange={(v) => atualizarFiltro('colaboradorId', semTodos(v))}>
              <SelectTrigger className="h-8 w-[200px]">
                <SelectValue placeholder="Todos os colaboradores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os colaboradores</SelectItem>
                {opcoes.colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {podeVerTudo && (
              <Select value={todos(gestor)} onValueChange={(v) => setGestor(semTodos(v))}>
                <SelectTrigger className="h-8 w-[170px]">
                  <SelectValue placeholder="Todos os gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os gestores</SelectItem>
                  {opcoes.gestores.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={todos(filtros.departamento)} onValueChange={(v) => atualizarFiltro('departamento', semTodos(v))}>
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue placeholder="Todos os departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os departamentos</SelectItem>
                {opcoes.departamentos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={todos(filtros.categoria)} onValueChange={(v) => atualizarFiltro('categoria', semTodos(v))}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as categorias</SelectItem>
                {opcoes.categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {rotuloCategoria(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {alterouFiltros && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <SwitchRotulado
              id="internas"
              checked={filtros.incluirInternas}
              onChange={(v) => atualizarFiltro('incluirInternas', v)}
              rotulo="Incluir tarefas internas (Resilcon)"
            />
            <SwitchRotulado
              id="fds"
              checked={filtros.incluirFimDeSemana}
              onChange={(v) => atualizarFiltro('incluirFimDeSemana', v)}
              rotulo="Incluir fins de semana"
            />
            <SwitchRotulado
              id="curtos"
              checked={filtros.minimoMin > 0}
              onChange={(v) => atualizarFiltro('minimoMin', v ? 1 : 0)}
              rotulo="Ignorar lançamentos menores que 1 min"
            />
          </div>
        </div>

        {periodoInvalido ? (
          <EmptyState icon={CalendarClock} title="Período inválido" description="A data inicial precisa ser anterior ou igual à data final." />
        ) : tarefas.isError ? (
          <ErrorState message={tarefas.error instanceof Error ? tarefas.error.message : undefined} onRetry={() => void tarefas.refetch()} />
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {carregando ? (
                Array.from({ length: 8 }, (_, i) => <KpiCardSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard
                    icon={Clock}
                    label="Tempo total"
                    value={formatarMinutos(resumo.totalMin)}
                    hint={`${formatDateBr(inicio)} a ${formatDateBr(fim)}`}
                  />
                  <KpiCard
                    icon={ListChecks}
                    label="Lançamentos"
                    value={resumo.qtd.toLocaleString('pt-BR')}
                    hint={`em ${resumo.dias} dia(s) com registro`}
                  />
                  <KpiCard
                    icon={Timer}
                    label="Média por lançamento"
                    value={formatarMinutos(resumo.mediaMin)}
                    hint={`Mediana: ${formatarMinutos(resumo.medianaMin)}`}
                    tooltip="A média é puxada pra cima por poucas tarefas muito longas; a mediana mostra o lançamento típico."
                  />
                  <KpiCard
                    icon={Users}
                    label="Média por colaborador"
                    value={formatarMinutos(resumo.mediaPorColaboradorMin)}
                    hint={`${resumo.colaboradores} colaborador(es) com lançamento`}
                    tooltip="Tempo total dividido pelos colaboradores que lançaram alguma tarefa no período."
                  />
                  <KpiCard
                    icon={CalendarClock}
                    label="Média por colaborador / dia"
                    value={formatarMinutos(resumo.mediaDiariaPorColaboradorMin)}
                    hint="por dia em que a pessoa lançou algo"
                  />
                  <KpiCard
                    icon={Flame}
                    label="Tarefa que mais consome"
                    value={topTipo?.rotulo ?? '—'}
                    valueClassName="text-base leading-snug"
                    hint={topTipo ? `${formatarMinutos(topTipo.totalMin)} · ${formatarPct(topTipo.pct)} · ${topTipo.principais.departamento}` : undefined}
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Departamento que mais consome"
                    value={topDepto?.rotulo ?? '—'}
                    valueClassName="text-base leading-snug"
                    hint={topDepto ? `${formatarMinutos(topDepto.totalMin)} · ${formatarPct(topDepto.pct)}` : undefined}
                  />
                  <KpiCard
                    icon={UserRound}
                    label="Maior carga lançada"
                    value={topColab?.rotulo ?? '—'}
                    valueClassName="text-base leading-snug"
                    hint={topColab ? `${formatarMinutos(topColab.totalMin)} · ${formatarPct(topColab.pct)} do total` : undefined}
                  />
                </>
              )}
            </div>

            <div className="mb-3 inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-muted/40 p-0.5" role="tablist">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className={cn(
                    'rounded-[5px] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                    aba === a.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>

              {aba === 'visao' && (
                <div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="xl:col-span-2">
                    <CartaoGrafico titulo="Tempo lançado por dia" descricao="Soma das durações das tarefas lançadas em cada dia.">
                      <BarrasPorDia dias={analise.dias} />
                    </CartaoGrafico>
                  </div>
                  <CartaoGrafico titulo="Tarefas que mais consomem tempo" descricao="Top 10 por tempo total, agrupadas pelo tipo da tarefa.">
                    <BarrasHorizontais grupos={analise.tipos} />
                  </CartaoGrafico>
                  <CartaoGrafico titulo="Tempo por departamento" descricao="Top 10 departamentos por tempo total.">
                    <BarrasHorizontais grupos={analise.deptos} />
                  </CartaoGrafico>
                  <div className="xl:col-span-2">
                    <CartaoGrafico titulo="Tempo por colaborador" descricao="Top 10 colaboradores por tempo lançado. Clique na aba Colaboradores pra ver todos.">
                      <BarrasHorizontais grupos={analise.colabs} />
                    </CartaoGrafico>
                  </div>
                </div>
                </div>
              )}

              {aba === 'colaboradores' && (
                <div>
                <DataTable
                  columns={colunasColaboradores(supervisores)}
                  data={analise.colabs}
                  isLoading={carregando}
                  getRowId={(g) => g.chave}
                  initialSorting={[{ id: 'total', desc: true }]}
                  onRowClick={(g) => {
                    atualizarFiltro('colaboradorId', g.chave)
                    setAba('visao')
                  }}
                  emptyMessage="Nenhuma tarefa lançada no período com esses filtros."
                />
                <p className="mt-2 text-xs text-muted-foreground">Clique numa linha pra filtrar a página inteira por esse colaborador.</p>
                </div>
              )}

              {aba === 'departamentos' && (
                <div>
                <DataTable
                  columns={colunasDepartamentos()}
                  data={analise.deptos}
                  isLoading={carregando}
                  getRowId={(g) => g.chave}
                  initialSorting={[{ id: 'total', desc: true }]}
                  onRowClick={(g) => {
                    atualizarFiltro('departamento', g.rotulo)
                    setAba('visao')
                  }}
                  emptyMessage="Nenhuma tarefa lançada no período com esses filtros."
                />
                <p className="mt-2 text-xs text-muted-foreground">Clique numa linha pra filtrar a página inteira por esse departamento.</p>
                </div>
              )}

              {aba === 'tarefas' && (
                <div>
                <DataTable
                  columns={colunasTarefas()}
                  data={analise.tipos}
                  isLoading={carregando}
                  getRowId={(g) => g.chave}
                  initialSorting={[{ id: 'total', desc: true }]}
                  emptyMessage="Nenhuma tarefa lançada no período com esses filtros."
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  A tarefa é agrupada pelo trecho inicial do nome (antes do primeiro " - "), então "Fechamento de Folha" junta todos os clientes e competências.
                </p>
                </div>
              )}

              {aba === 'clientes' && (
                <div>
                <DataTable
                  columns={colunasClientes()}
                  data={analise.clientes}
                  isLoading={carregando}
                  getRowId={(g) => g.chave}
                  initialSorting={[{ id: 'total', desc: true }]}
                  emptyMessage="Nenhuma tarefa lançada no período com esses filtros."
                />
                </div>
              )}

              {aba === 'lancamentos' && (
                <div>
                <DataTable
                  columns={colunasLancamentos()}
                  data={lancamentosOrdenados.slice(0, LIMITE_LANCAMENTOS_NA_TELA)}
                  isLoading={carregando}
                  getRowId={(l) => l.id}
                  emptyMessage="Nenhuma tarefa lançada no período com esses filtros."
                />
                {lancamentosOrdenados.length > LIMITE_LANCAMENTOS_NA_TELA && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mostrando os {LIMITE_LANCAMENTOS_NA_TELA.toLocaleString('pt-BR')} mais recentes de {lancamentosOrdenados.length.toLocaleString('pt-BR')} — use os filtros ou
                    exporte pra Excel pra ver tudo.
                  </p>
                )}
                </div>
              )}
          </>
        )}
      </div>
    </>
  )
}

function SwitchRotulado({ id, checked, onChange, rotulo }: { id: string; checked: boolean; onChange: (valor: boolean) => void; rotulo: string }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-muted-foreground">
        {rotulo}
      </Label>
    </div>
  )
}
