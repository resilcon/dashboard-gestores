import { describe, expect, it } from 'vitest'
import { buildAttentionList, buildAttentionListFromAggregate, computeTeamKpis, computeTeamKpisFromAggregate } from '@/utils/dashboard-metrics'
import type { DashboardRecord, ResumoPeriodoColaborador } from '@/types/domain'

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

function agg(overrides: Partial<ResumoPeriodoColaborador>): ResumoPeriodoColaborador {
  return {
    colaborador_id: '1',
    nome: 'Fulano',
    supervisor: 'Gestor A',
    tipo_colaborador: 'efetivo',
    gclick_min: 0,
    tangerino_min: 0,
    wm_min: 0,
    dias_com_dado: 0,
    dias_sem_lancamento: 0,
    dias_abaixo_lm: 0,
    dias_acima_jornada: 0,
    dias_totais: 0,
    ...overrides,
  }
}

describe('computeTeamKpis', () => {
  it('conta cada classificação no seu próprio balde', () => {
    const rows = [
      row({ classificacao: 'OK' }),
      row({ classificacao: 'OK' }),
      row({ classificacao: 'ABAIXO DO LM' }),
      row({ classificacao: 'SEM LANCAMENTO' }),
      row({ classificacao: 'ACIMA DA JORNADA' }),
    ]
    const kpis = computeTeamKpis(rows)
    expect(kpis.total).toBe(5)
    expect(kpis.dentroDoEsperado).toBe(2)
    expect(kpis.requerAtencao).toBe(1)
    expect(kpis.semLancamento).toBe(1)
    expect(kpis.acimaJornada).toBe(1)
  })

  it('lista vazia devolve tudo zerado', () => {
    expect(computeTeamKpis([])).toEqual({ total: 0, dentroDoEsperado: 0, requerAtencao: 0, semLancamento: 0, acimaJornada: 0 })
  })
})

describe('computeTeamKpisFromAggregate', () => {
  it('conta 1 por colaborador que teve pelo menos 1 dia de cada tipo no período (não conta dia a dia)', () => {
    const rows = [
      agg({ colaborador_id: '1', dias_abaixo_lm: 3, dias_totais: 20 }), // requer atenção
      agg({ colaborador_id: '2', dias_sem_lancamento: 5, dias_totais: 20 }), // sem lançamento
      agg({ colaborador_id: '3', dias_acima_jornada: 2, dias_totais: 20 }), // acima da jornada, mas "dentro do esperado" não conta acima
      agg({ colaborador_id: '4', dias_totais: 20 }), // sem nenhum problema -- dentro do esperado
    ]
    const kpis = computeTeamKpisFromAggregate(rows)
    expect(kpis.total).toBe(4)
    expect(kpis.requerAtencao).toBe(1)
    expect(kpis.semLancamento).toBe(1)
    expect(kpis.acimaJornada).toBe(1)
    expect(kpis.dentroDoEsperado).toBe(1) // só o colaborador 4
  })

  it('lista vazia devolve tudo zerado', () => {
    expect(computeTeamKpisFromAggregate([])).toEqual({ total: 0, dentroDoEsperado: 0, requerAtencao: 0, semLancamento: 0, acimaJornada: 0 })
  })
})

describe('buildAttentionList', () => {
  it('inclui só ABAIXO DO LM e SEM LANCAMENTO, ordenado por nome', () => {
    const rows = [
      row({ colaborador_id: '3', nome: 'Zeca', classificacao: 'ABAIXO DO LM', total_gclick: '02:00:00', horas_trabalhadas: '08:00:00' }),
      row({ colaborador_id: '1', nome: 'Ana', classificacao: 'SEM LANCAMENTO' }),
      row({ colaborador_id: '2', nome: 'Bia', classificacao: 'OK' }), // não deve aparecer
      row({ colaborador_id: '4', nome: 'Davi', classificacao: 'ACIMA DA JORNADA' }), // não deve aparecer
    ]
    const lista = buildAttentionList(rows)
    expect(lista.map((i) => i.nome)).toEqual(['Ana', 'Zeca'])
  })

  it('SEM LANCAMENTO sempre usa a mensagem fixa "Sem lançamento hoje"', () => {
    const [item] = buildAttentionList([row({ classificacao: 'SEM LANCAMENTO' })])
    expect(item.detalhe).toBe('Sem lançamento hoje')
  })

  it('ABAIXO DO LM mostra o % Ponto quando calculável', () => {
    const [item] = buildAttentionList([
      row({ classificacao: 'ABAIXO DO LM', total_gclick: '02:00:00', horas_trabalhadas: '08:00:00' }),
    ])
    expect(item.detalhe).toBe('G-Click representa 25,00% do ponto')
  })

  it('ABAIXO DO LM sem Tangerino cai no texto genérico (não fabrica um % falso)', () => {
    const [item] = buildAttentionList([row({ classificacao: 'ABAIXO DO LM', horas_trabalhadas: null })])
    expect(item.detalhe).toBe('Abaixo do mínimo esperado')
  })
})

describe('buildAttentionListFromAggregate', () => {
  it('inclui colaboradores com pelo menos 1 dia sem lançamento ou abaixo do LM no período', () => {
    const rows = [
      agg({ colaborador_id: '1', nome: 'Ana', dias_sem_lancamento: 2 }),
      agg({ colaborador_id: '2', nome: 'Bia', dias_abaixo_lm: 1 }),
      agg({ colaborador_id: '3', nome: 'Carlos', dias_acima_jornada: 5 }), // não entra -- não é problema
      agg({ colaborador_id: '4', nome: 'Davi' }), // sem nada -- não entra
    ]
    const lista = buildAttentionListFromAggregate(rows)
    expect(lista.map((i) => i.nome)).toEqual(['Ana', 'Bia'])
  })

  it('descreve os dois tipos de dia problemático juntos quando o colaborador tem ambos', () => {
    const [item] = buildAttentionListFromAggregate([agg({ dias_sem_lancamento: 2, dias_abaixo_lm: 3 })])
    expect(item.detalhe).toBe('2 dia(s) sem lançamento · 3 dia(s) abaixo do mínimo no período')
  })
})
