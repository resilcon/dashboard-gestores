import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDateBr } from '@/utils/date'
import { formatarMinutos, formatarPct, type Grupo } from '@/utils/tarefas-gclick'

const COR_PRIMARIA = 'hsl(191 100% 34%)'

export function CartaoGrafico({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Dica({ titulo, grupo }: { titulo: string; grupo: Grupo }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 max-w-64 font-medium text-foreground">{titulo}</p>
      <p className="text-muted-foreground">
        Tempo: <strong className="text-foreground">{formatarMinutos(grupo.totalMin)}</strong> ({formatarPct(grupo.pct)})
      </p>
      <p className="text-muted-foreground">
        Lançamentos: <strong className="text-foreground">{grupo.qtd}</strong> · média {formatarMinutos(grupo.mediaMin)}
      </p>
    </div>
  )
}

function truncar(texto: string, max: number) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

/** Ranking em barras horizontais — usado pra departamento, tarefa e colaborador. */
export function BarrasHorizontais({ grupos, max = 10 }: { grupos: Grupo[]; max?: number }) {
  const dados = grupos.slice(0, max).map((g) => ({ grupo: g, rotulo: truncar(g.rotulo, 26), horas: g.totalMin / 60 }))
  if (!dados.length) return <EmptyState icon={BarChart3} title="Sem dados no período" />

  return (
    <div style={{ height: dados.length * 30 + 20 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v))}h`} />
          <YAxis type="category" dataKey="rotulo" width={150} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: 'hsl(191 100% 34% / 0.06)' }}
            content={({ active, payload }) =>
              active && payload?.length ? <Dica titulo={payload[0].payload.grupo.rotulo} grupo={payload[0].payload.grupo} /> : null
            }
          />
          <Bar dataKey="horas" fill={COR_PRIMARIA} radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horas lançadas por dia, em ordem cronológica. */
export function BarrasPorDia({ dias }: { dias: Grupo[] }) {
  const dados = dias.map((g) => ({ grupo: g, dia: formatDateBr(g.chave).slice(0, 5), horas: g.totalMin / 60 }))
  if (!dados.length) return <EmptyState icon={BarChart3} title="Sem dados no período" />

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${Math.round(Number(v))}h`} />
          <Tooltip
            cursor={{ fill: 'hsl(191 100% 34% / 0.06)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Dica titulo={formatDateBr(payload[0].payload.grupo.chave)} grupo={payload[0].payload.grupo} />
              ) : null
            }
          />
          <Bar dataKey="horas" fill={COR_PRIMARIA} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
