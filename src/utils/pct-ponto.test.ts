import { describe, expect, it } from 'vitest'
import { calcularPctPonto, formatarPctPonto, mediaPctPonto, pctPontoEhBaixo, LIMIAR_PCT_PONTO_BAIXO } from '@/utils/pct-ponto'

describe('calcularPctPonto', () => {
  it('calcula G-Click sobre Tangerino, em percentual', () => {
    expect(calcularPctPonto(342, 237)).toBeCloseTo(144.3037974, 5)
  })

  it('devolve null quando não há Tangerino (base zero ou ausente)', () => {
    expect(calcularPctPonto(100, 0)).toBeNull()
    expect(calcularPctPonto(100, null)).toBeNull()
  })

  it('devolve null quando o G-Click é null/undefined (não calculável), mas aceita zero como valor real', () => {
    expect(calcularPctPonto(null, 100)).toBeNull()
    expect(calcularPctPonto(0, 100)).toBe(0)
  })
})

describe('formatarPctPonto', () => {
  it('formata no padrão BR (vírgula decimal) com 2 casas', () => {
    expect(formatarPctPonto(144.34)).toBe('144,34%')
  })

  it('mostra travessão pra valor não calculável', () => {
    expect(formatarPctPonto(null)).toBe('—')
  })
})

describe('pctPontoEhBaixo', () => {
  it(`é true abaixo de ${LIMIAR_PCT_PONTO_BAIXO}%`, () => {
    expect(pctPontoEhBaixo(84.99)).toBe(true)
    expect(pctPontoEhBaixo(0)).toBe(true)
  })

  it(`é false a partir de ${LIMIAR_PCT_PONTO_BAIXO}% (limite exato não conta como baixo)`, () => {
    expect(pctPontoEhBaixo(85)).toBe(false)
    expect(pctPontoEhBaixo(200)).toBe(false)
  })

  it('nunca é baixo quando não há valor calculável', () => {
    expect(pctPontoEhBaixo(null)).toBe(false)
  })
})

describe('mediaPctPonto', () => {
  it('conta dia sem % calculável como 0 na média, não descarta do divisor (feedback real: excluir inflava a média de quem só tinha Tangerino batido nos dias bons)', () => {
    // Caso real: Bruno, só sextas-feiras de julho -- 2 de 5 sextas com % calculável.
    const resultado = mediaPctPonto([89.68, null, 86.56, null, null])
    expect(resultado.media).toBeCloseTo(35.248, 3) // (89.68 + 86.56 + 0 + 0 + 0) / 5, NÃO / 2
    expect(resultado.comDado).toBe(2)
    expect(resultado.total).toBe(5)
  })

  it('todo mundo com dado -- média idêntica a antes (nenhum zero entra)', () => {
    const resultado = mediaPctPonto([80, 100])
    expect(resultado.media).toBe(90)
    expect(resultado.comDado).toBe(2)
    expect(resultado.total).toBe(2)
  })

  it('ninguém tem dado -- média numérica 0 (quem decide se esconde a linha é comDado===0, não este cálculo)', () => {
    const resultado = mediaPctPonto([null, null])
    expect(resultado.media).toBe(0)
    expect(resultado.comDado).toBe(0)
    expect(resultado.total).toBe(2)
  })

  it('lista vazia devolve média null', () => {
    expect(mediaPctPonto([]).media).toBeNull()
  })
})
