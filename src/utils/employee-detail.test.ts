import { describe, expect, it } from 'vitest'
import { buildComparativo, buildDiaMaisFraco, buildVariacaoMetrica } from '@/utils/employee-detail'
import type { DashboardRecord, WorkMonitorRecord } from '@/types/domain'

function row(overrides: Partial<DashboardRecord>): DashboardRecord {
  return {
    colaborador_id: '1',
    nome: 'Fulano',
    departamento: null,
    supervisor: 'Gestor A',
    status: 'ativo',
    tipo_colaborador: 'efetivo',
    data: '2026-08-26',
    horas_trabalhadas: null,
    workmonitor_total: null,
    total_gclick: null,
    classificacao: null,
    ultima_justificativa: null,
    ultima_justificativa_gestor: null,
    ultima_justificativa_em: null,
    metricas: null,
    ...overrides,
  }
}

describe('buildComparativo', () => {
  it('usa Tangerino como base e calcula % de cada fonte sobre ela', () => {
    const r = row({ horas_trabalhadas: '03:57:00', total_gclick: '05:42:00', workmonitor_total: '08:02:00' })
    const { linhas } = buildComparativo(r, null)

    expect(linhas.map((l) => l.fonte)).toEqual(['Ponto (Tangerino)', 'WorkMonitor', 'G-Click'])
    expect(linhas[2].pct).toBeCloseTo(144.3, 1) // G-Click: 342/237
    expect(linhas[1].pct).toBeCloseTo(203.38, 1) // WorkMonitor: 482/237
  })

  it('cai pro total do neocode_diario quando a view não tem workmonitor_total', () => {
    const r = row({ horas_trabalhadas: '08:00:00', workmonitor_total: null })
    const neo = { total: '07:00:00' } as WorkMonitorRecord
    const { linhas } = buildComparativo(r, neo)
    expect(linhas[1].minutos).toBe(420)
  })

  it('calcula as 3 diferenças (WM-Tangerino, GClick-Tangerino, GClick-WM)', () => {
    const r = row({ horas_trabalhadas: '04:00:00', total_gclick: '05:00:00', workmonitor_total: '06:00:00' })
    const { diferencas } = buildComparativo(r, null)
    expect(diferencas.find((d) => d.label.includes('WorkMonitor vs'))?.minutos).toBe(120)
    expect(diferencas.find((d) => d.label === 'G-Click vs. Tangerino')?.minutos).toBe(60)
    expect(diferencas.find((d) => d.label === 'G-Click vs. WorkMonitor')?.minutos).toBe(-60)
  })

  it('diferença fica null quando falta um dos dois lados (não finge zero)', () => {
    const r = row({ horas_trabalhadas: null, total_gclick: '05:00:00' })
    const { diferencas } = buildComparativo(r, null)
    expect(diferencas.find((d) => d.label === 'G-Click vs. Tangerino')?.minutos).toBeNull()
  })
})

describe('buildVariacaoMetrica', () => {
  const hoje = row({ data: '2026-08-26', metricas: { teclas: 9308 } }) // quarta-feira
  const diaUtilAnterior = row({ data: '2026-08-25', metricas: { teclas: 8000 } }) // terça-feira

  it('calcula variação percentual vs. o dia útil anterior', () => {
    const v = buildVariacaoMetrica([hoje, diaUtilAnterior], hoje, 'teclas')
    expect(v.atual).toBe(9308)
    expect(v.variacaoPct).toBeCloseTo(16.35, 1)
    expect(v.dataAnterior).toBe('2026-08-25')
  })

  it('pula fim de semana pra achar o último dia útil (segunda compara com a sexta anterior)', () => {
    const segunda = row({ data: '2026-08-24', metricas: { teclas: 100 } })
    const sextaAnterior = row({ data: '2026-08-21', metricas: { teclas: 80 } })
    const domingoNoMeio = row({ data: '2026-08-23', metricas: { teclas: 999 } }) // não deve ser usado
    const v = buildVariacaoMetrica([segunda, sextaAnterior, domingoNoMeio], segunda, 'teclas')
    expect(v.dataAnterior).toBe('2026-08-21')
  })

  it('sem dado de hoje, não calcula nada', () => {
    const v = buildVariacaoMetrica([diaUtilAnterior], hoje, 'teclas')
    expect(v.atual).toBeNull()
    expect(v.variacaoPct).toBeNull()
  })

  it('sem dia anterior pra comparar, mostra o valor sem variação (não finge 0%)', () => {
    const v = buildVariacaoMetrica([hoje], hoje, 'teclas')
    expect(v.atual).toBe(9308)
    expect(v.variacaoPct).toBeNull()
  })
})

describe('buildDiaMaisFraco', () => {
  it('acha o dia com menos teclas na semana de row.data, ignorando fim de semana', () => {
    const historico = [
      row({ data: '2026-08-24', metricas: { teclas: 100 } }), // segunda
      row({ data: '2026-08-25', metricas: { teclas: 50 } }), // terça -- o mais fraco
      row({ data: '2026-08-26', metricas: { teclas: 200 } }), // quarta (row.data)
      row({ data: '2026-08-22', metricas: { teclas: 1 } }), // sábado da semana anterior -- fora do intervalo
    ]
    const fraco = buildDiaMaisFraco(historico, historico[2], 'teclas')
    expect(fraco?.data).toBe('2026-08-25')
    expect(fraco?.valor).toBe(50)
  })

  it('devolve null quando não há dado nenhum de teclas na semana', () => {
    const r = row({ data: '2026-08-26', metricas: { teclas: null } })
    expect(buildDiaMaisFraco([r], r, 'teclas')).toBeNull()
  })
})
