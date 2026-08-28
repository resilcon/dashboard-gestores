import { describe, expect, it } from 'vitest'
import { aggregatePeriod, filterDiasUteis, hasDataForDay } from '@/utils/aggregate-period'
import type { DashboardRecord } from '@/types/domain'

function row(overrides: Partial<DashboardRecord>): DashboardRecord {
  return {
    colaborador_id: '1',
    nome: 'Fulano',
    departamento: null,
    supervisor: 'Gestor A',
    status: 'ativo',
    tipo_colaborador: 'efetivo',
    data: '2026-08-24',
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

describe('aggregatePeriod', () => {
  it('soma minutos das 3 fontes por colaborador ao longo do intervalo', () => {
    const rows = [
      row({ data: '2026-08-24', total_gclick: '04:00:00', horas_trabalhadas: '08:00:00', workmonitor_total: '07:00:00', classificacao: 'OK' }),
      row({ data: '2026-08-25', total_gclick: '03:00:00', horas_trabalhadas: '08:00:00', workmonitor_total: '07:00:00', classificacao: 'ABAIXO DO LM' }),
    ]
    const [agg] = aggregatePeriod(rows)
    expect(agg.gclick_min).toBe(7 * 60)
    expect(agg.tangerino_min).toBe(16 * 60)
    expect(agg.wm_min).toBe(14 * 60)
  })

  it('conta dias_com_dado só quando pelo menos 1 fonte tem tempo > 0', () => {
    const rows = [
      row({ data: '2026-08-24', total_gclick: '04:00:00', classificacao: 'OK' }),
      row({ data: '2026-08-25', classificacao: 'SEM LANCAMENTO' }), // sem nenhuma fonte
    ]
    const [agg] = aggregatePeriod(rows)
    expect(agg.dias_com_dado).toBe(1)
    expect(agg.dias_totais).toBe(2)
  })

  it('conta dias_sem_lancamento, dias_abaixo_lm e dias_acima_jornada pela classificação do dia', () => {
    const rows = [
      row({ data: '2026-08-24', classificacao: 'SEM LANCAMENTO' }),
      row({ data: '2026-08-25', classificacao: 'SEM LANCAMENTO' }),
      row({ data: '2026-08-26', classificacao: 'ABAIXO DO LM' }),
      row({ data: '2026-08-27', classificacao: 'ACIMA DA JORNADA' }),
      row({ data: '2026-08-28', classificacao: 'OK' }),
    ]
    const [agg] = aggregatePeriod(rows)
    expect(agg.dias_sem_lancamento).toBe(2)
    expect(agg.dias_abaixo_lm).toBe(1)
    expect(agg.dias_acima_jornada).toBe(1)
  })

  it('agrega separadamente por colaborador_id', () => {
    const rows = [
      row({ colaborador_id: '1', nome: 'Ana', total_gclick: '02:00:00' }),
      row({ colaborador_id: '2', nome: 'Bruno', total_gclick: '03:00:00' }),
    ]
    const agregados = aggregatePeriod(rows)
    expect(agregados).toHaveLength(2)
    expect(agregados.find((a) => a.colaborador_id === '1')?.gclick_min).toBe(120)
    expect(agregados.find((a) => a.colaborador_id === '2')?.gclick_min).toBe(180)
  })

  it('lista vazia devolve lista vazia', () => {
    expect(aggregatePeriod([])).toEqual([])
  })
})

describe('filterDiasUteis', () => {
  it('remove sábado e domingo, mantém dias úteis', () => {
    const rows = [
      row({ data: '2026-08-24' }), // segunda
      row({ data: '2026-08-29' }), // sábado
      row({ data: '2026-08-30' }), // domingo
      row({ data: '2026-08-28' }), // sexta
    ]
    const resultado = filterDiasUteis(rows)
    expect(resultado.map((r) => r.data)).toEqual(['2026-08-24', '2026-08-28'])
  })

  it('lista sem fim de semana passa intacta', () => {
    const rows = [row({ data: '2026-08-24' }), row({ data: '2026-08-25' })]
    expect(filterDiasUteis(rows)).toHaveLength(2)
  })
})

describe('hasDataForDay', () => {
  it('true quando qualquer uma das 3 fontes tem tempo', () => {
    expect(hasDataForDay(row({ total_gclick: '00:30:00' }))).toBe(true)
    expect(hasDataForDay(row({ horas_trabalhadas: '00:30:00' }))).toBe(true)
    expect(hasDataForDay(row({ workmonitor_total: '00:30:00' }))).toBe(true)
  })

  it('false quando as 3 fontes estão zeradas ou ausentes', () => {
    expect(hasDataForDay(row({ total_gclick: '00:00:00', horas_trabalhadas: null, workmonitor_total: null }))).toBe(false)
    expect(hasDataForDay(row({}))).toBe(false)
  })
})
