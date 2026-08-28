import { describe, expect, it } from 'vitest'
import { chaveDia, criarSetDiasAbonados, ehDiaAbonado, filterNaoAbonados } from '@/utils/abonado'

describe('chaveDia', () => {
  it('combina colaborador_id e data de forma única', () => {
    expect(chaveDia('c1', '2026-08-24')).toBe('c1|2026-08-24')
  })
})

describe('criarSetDiasAbonados', () => {
  it('monta um Set a partir das justificativas marcadas como abonadas', () => {
    const set = criarSetDiasAbonados([
      { colaborador_id: 'c1', data: '2026-08-24' },
      { colaborador_id: 'c2', data: '2026-08-25' },
    ])
    expect(set.has('c1|2026-08-24')).toBe(true)
    expect(set.has('c2|2026-08-25')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('lista vazia devolve Set vazio', () => {
    expect(criarSetDiasAbonados([]).size).toBe(0)
  })
})

describe('ehDiaAbonado', () => {
  it('true só pra combinação exata de colaborador_id + data', () => {
    const set = criarSetDiasAbonados([{ colaborador_id: 'c1', data: '2026-08-24' }])
    expect(ehDiaAbonado(set, 'c1', '2026-08-24')).toBe(true)
    expect(ehDiaAbonado(set, 'c1', '2026-08-25')).toBe(false) // mesma pessoa, outro dia
    expect(ehDiaAbonado(set, 'c2', '2026-08-24')).toBe(false) // mesmo dia, outra pessoa
  })
})

describe('filterNaoAbonados', () => {
  it('remove só as linhas que batem com o Set de abonados', () => {
    const rows = [
      { colaborador_id: 'c1', data: '2026-08-24', valor: 1 },
      { colaborador_id: 'c1', data: '2026-08-25', valor: 2 },
      { colaborador_id: 'c2', data: '2026-08-24', valor: 3 },
    ]
    const abonados = criarSetDiasAbonados([{ colaborador_id: 'c1', data: '2026-08-24' }])
    const resultado = filterNaoAbonados(rows, abonados)
    expect(resultado).toHaveLength(2)
    expect(resultado.map((r) => r.valor)).toEqual([2, 3])
  })

  it('Set vazio devolve a lista intacta (mesma referência, sem custo de filter)', () => {
    const rows = [{ colaborador_id: 'c1', data: '2026-08-24', valor: 1 }]
    expect(filterNaoAbonados(rows, new Set())).toBe(rows)
  })
})
