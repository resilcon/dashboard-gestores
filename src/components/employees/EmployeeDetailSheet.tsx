import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClassificationBadge } from '@/components/dashboard/ClassificationBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { FileQuestion } from 'lucide-react'
import type { DashboardRecord } from '@/types/domain'
import { useEmployeeDetail } from '@/hooks/useEmployeeDetail'
import { intervalToMinutes, minutesToHm, truncateToHm } from '@/utils/duration'
import { formatarPctPonto, pctPontoEhBaixo, calcularPctPonto } from '@/utils/pct-ponto'
import { formatDateBr, weekdayName } from '@/utils/date'
import {
  buildComparativo,
  buildDiaMaisFraco,
  buildVariacaoMetrica,
  historicoDoColaborador,
} from '@/utils/employee-detail'
import { cn } from '@/lib/utils'

interface EmployeeDetailSheetProps {
  row: DashboardRecord | null
  allRows: DashboardRecord[]
  onOpenChange: (open: boolean) => void
}

export function EmployeeDetailSheet({ row, allRows, onOpenChange }: EmployeeDetailSheetProps) {
  const { data, isLoading, isError } = useEmployeeDetail(row?.colaborador_id ?? null, row?.data ?? null)

  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {row && (
          <>
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>{row.nome}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {row.departamento ?? 'Sem departamento'} · {formatDateBr(row.data)}
                {data?.neo && (data.neo.inicio || data.neo.fim) && (
                  <> · {truncateToHm(data.neo.inicio) ?? '—'} — {truncateToHm(data.neo.fim) ?? '—'}</>
                )}
              </p>
            </DialogHeader>

            <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
              {isLoading && <DetailSkeleton />}

              {isError && (
                <EmptyState icon={FileQuestion} title="Não foi possível carregar o detalhe do WorkMonitor" description="Tente fechar e abrir novamente." />
              )}

              {!isLoading && !isError && (
                <>
                  <Section title="Tempo (WorkMonitor)">
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Tempo total" value={minutesToHm(intervalToMinutes(data?.neo?.total) ?? intervalToMinutes(row.workmonitor_total))} />
                      <StatCard label="Tempo produtivo" value={minutesToHm(intervalToMinutes(data?.neo?.produtivo))} tone="success" />
                      <StatCard label="Tempo neutro" value={minutesToHm(intervalToMinutes(data?.neo?.neutro))} tone="warning" />
                      <StatCard label="Tempo improdutivo" value={minutesToHm(intervalToMinutes(data?.neo?.distracao))} tone="danger" />
                    </div>
                  </Section>

                  <ComparativoSection row={row} neo={data?.neo ?? null} />

                  {data?.neo?.metricas && (
                    <Section title="Contadores">
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Apps utilizados" value={data.neo.metricas.apps_utilizados ?? '—'} />
                        <StatCard label="Registros de atividade" value={data.neo.metricas.registros_atividade ?? '—'} />
                        <StatCard label="Trocas de aplicativo" value={data.neo.metricas.trocas_aplicativo ?? '—'} />
                        <StatCard label="Cliques + teclas" value={data.neo.metricas.cliques_teclas ?? '—'} />
                      </div>
                    </Section>
                  )}

                  <ProdutividadeGeralSection produtivoMin={intervalToMinutes(data?.neo?.produtivo)} neutroMin={intervalToMinutes(data?.neo?.neutro)} improdutivoMin={intervalToMinutes(data?.neo?.distracao)} produtividadeGeralPct={data?.neo?.metricas?.produtividade_geral_pct ?? null} />

                  <Section title="Top 5 aplicativos">
                    {!data?.apps.length ? (
                      <p className="text-sm text-muted-foreground">Sem dados de aplicativos pra este dia.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pos.</TableHead>
                            <TableHead>Aplicativo</TableHead>
                            <TableHead>Tempo</TableHead>
                            <TableHead>% do tempo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.apps.map((app) => (
                            <TableRow key={app.posicao}>
                              <TableCell>{app.posicao}</TableCell>
                              <TableCell className="font-medium">{app.aplicativo}</TableCell>
                              <TableCell>{app.tempo_min != null ? minutesToHm(app.tempo_min) : '—'}</TableCell>
                              <TableCell>{app.pct_tempo != null ? `${app.pct_tempo.toFixed(1).replace('.', ',')}%` : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Section>

                  {data?.neo?.metricas && (
                    <Section title="Destaques do dia">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Destaque label="Aplicativo mais usado" value={data.neo.metricas.app_mais_usado} />
                        <Destaque label="Horário inicial" value={data.neo.metricas.horario_inicial_destaque} />
                        <Destaque label="Horário final" value={data.neo.metricas.horario_final_destaque} />
                        <Destaque label="Maior atividade contínua" value={data.neo.metricas.maior_atividade_continua} />
                      </div>
                    </Section>
                  )}

                  <TeclasCliquesSection row={row} allRows={allRows} />

                  <HistoricoSection row={row} allRows={allRows} />
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string | number | null; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-muted px-3 py-2.5">
      <p
        className={cn(
          'text-lg font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
          !tone && 'text-foreground',
        )}
      >
        {value ?? '—'}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Destaque({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value ?? '—'}</p>
    </div>
  )
}

function ComparativoSection({ row, neo }: { row: DashboardRecord; neo: Parameters<typeof buildComparativo>[1] }) {
  const { linhas, diferencas } = buildComparativo(row, neo)
  return (
    <Section title="Comparativo Ponto x WorkMonitor x G-Click">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fonte</TableHead>
            <TableHead>Total do dia</TableHead>
            <TableHead>% sobre o Ponto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.fonte}>
              <TableCell>{l.fonte}</TableCell>
              <TableCell>{l.minutos != null ? minutesToHm(l.minutos) : '—'}</TableCell>
              <TableCell className={cn(pctPontoEhBaixo(l.pct) && 'font-semibold text-danger')}>{formatarPctPonto(l.pct)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3 space-y-1 text-sm">
        {diferencas.map((d) => (
          <div key={d.label} className="flex justify-between border-b border-border-subtle py-1.5 last:border-b-0">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium">{d.minutos != null ? minutesToHm(d.minutos, true) : 'sem dado suficiente'}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ProdutividadeGeralSection({
  produtivoMin,
  neutroMin,
  improdutivoMin,
  produtividadeGeralPct,
}: {
  produtivoMin: number | null
  neutroMin: number | null
  improdutivoMin: number | null
  produtividadeGeralPct: number | null
}) {
  const soma = (produtivoMin ?? 0) + (neutroMin ?? 0) + (improdutivoMin ?? 0)
  const pct = produtividadeGeralPct ?? (produtivoMin != null && soma > 0 ? (produtivoMin / soma) * 100 : null)

  return (
    <Section title="Produtividade geral">
      <p className="text-xl font-semibold tabular-nums text-foreground">{pct != null ? `${pct.toFixed(1).replace('.', ',')}%` : '—'}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct ?? 0}%` }} />
      </div>

      {soma > 0 && (
        <div className="mt-4 space-y-1.5">
          {[
            ['Produtivo', produtivoMin, 'bg-success'],
            ['Neutro', neutroMin, 'bg-warning'],
            ['Improdutivo', improdutivoMin, 'bg-danger'],
          ].map(([label, min, colorClass]) => (
            <div key={label as string} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', colorClass as string)} style={{ width: `${((min as number) / soma) * 100}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right tabular-nums">{Math.round(((min as number) / soma) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function TeclasCliquesSection({ row, allRows }: { row: DashboardRecord; allRows: DashboardRecord[] }) {
  const historico = allRows.filter((r) => r.colaborador_id === row.colaborador_id && r.metricas && (r.metricas.teclas != null || r.metricas.cliques != null))

  if (!historico.length) {
    return (
      <Section title="Teclas & cliques — comparação">
        <p className="text-sm text-muted-foreground">Ainda não há dados de teclas/cliques suficientes pra comparar.</p>
      </Section>
    )
  }

  const teclas = buildVariacaoMetrica(historico, row, 'teclas')
  const cliques = buildVariacaoMetrica(historico, row, 'cliques')
  const fracoTeclas = buildDiaMaisFraco(historico, row, 'teclas')
  const fracoCliques = buildDiaMaisFraco(historico, row, 'cliques')

  return (
    <Section title="Teclas & cliques — comparação">
      <div className="grid grid-cols-2 gap-3">
        <VariacaoCard label={`Teclas digitadas em ${formatDateBr(row.data)}`} variacao={teclas} />
        <VariacaoCard label={`Cliques em ${formatDateBr(row.data)}`} variacao={cliques} />
      </div>
      {(fracoTeclas || fracoCliques) && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {fracoTeclas && (
            <Destaque label="Dia c/ menos teclas na semana" value={`${weekdayName(fracoTeclas.data)} (${formatDateBr(fracoTeclas.data)}) — ${fracoTeclas.valor} teclas`} />
          )}
          {fracoCliques && (
            <Destaque label="Dia c/ menos cliques na semana" value={`${weekdayName(fracoCliques.data)} (${formatDateBr(fracoCliques.data)}) — ${fracoCliques.valor} cliques`} />
          )}
        </div>
      )}
    </Section>
  )
}

function VariacaoCard({ label, variacao }: { label: string; variacao: ReturnType<typeof buildVariacaoMetrica> }) {
  if (variacao.atual === null) return <StatCard label={label} value="Sem dado hoje" />
  const cor = variacao.variacaoPct == null ? undefined : variacao.variacaoPct > 0 ? 'success' : variacao.variacaoPct < 0 ? 'danger' : undefined
  return (
    <div className="rounded-md border border-border-subtle bg-surface-muted px-3 py-2.5">
      <p className="text-lg font-semibold tabular-nums text-foreground">
        {variacao.atual}{' '}
        {variacao.variacaoPct != null && (
          <span className={cn('text-sm font-semibold', cor === 'success' && 'text-success', cor === 'danger' && 'text-danger')}>
            {variacao.variacaoPct > 0 ? '+' : ''}
            {variacao.variacaoPct.toFixed(0)}%
          </span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {label}
        {variacao.dataAnterior && ` · vs ${formatDateBr(variacao.dataAnterior)}`}
      </p>
    </div>
  )
}

function HistoricoSection({ row, allRows }: { row: DashboardRecord; allRows: DashboardRecord[] }) {
  const historico = historicoDoColaborador(allRows, row.colaborador_id, 14).slice().reverse()

  if (!historico.length) {
    return (
      <Section title="Histórico recente">
        <p className="text-sm text-muted-foreground">Sem histórico recente.</p>
      </Section>
    )
  }

  const chartData = historico.map((r) => ({
    data: formatDateBr(r.data).slice(0, 5),
    pct: calcularPctPonto(intervalToMinutes(r.total_gclick), intervalToMinutes(r.horas_trabalhadas)),
  }))

  return (
    <Section title="Histórico recente (últimos 14 dias com registro)">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1).replace('.', ',')}%`, '% Ponto']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="pct" stroke="hsl(191 100% 34%)" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>G-Click</TableHead>
              <TableHead>Tangerino</TableHead>
              <TableHead>WorkMonitor</TableHead>
              <TableHead>Classificação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico
              .slice()
              .reverse()
              .map((r) => (
                <TableRow key={r.data}>
                  <TableCell>{formatDateBr(r.data)}</TableCell>
                  <TableCell>{minutesToHm(intervalToMinutes(r.total_gclick)) ?? '—'}</TableCell>
                  <TableCell>{minutesToHm(intervalToMinutes(r.horas_trabalhadas)) ?? '—'}</TableCell>
                  <TableCell>{minutesToHm(intervalToMinutes(r.workmonitor_total)) ?? '—'}</TableCell>
                  <TableCell>
                    <ClassificationBadge value={r.classificacao} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
