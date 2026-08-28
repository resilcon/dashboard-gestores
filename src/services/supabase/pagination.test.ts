import { describe, expect, it } from 'vitest'
import { fetchAllPages } from '@/services/supabase/pagination'

/**
 * Regressão de um bug real encontrado ao testar a migração ao vivo: com
 * `maxRows` menor que o total disponível e o total sendo um múltiplo exato
 * do tamanho de página (1000), o loop pedia uma última página com
 * `from > to` (ex.: range(5000, 4999)) e o PostgREST respondia 416
 * "Requested range not satisfiable" -- o dashboard inteiro ficava com 0
 * linhas, sem nenhum erro visível na tela (só um erro engolido). Estes
 * testes fixam esse comportamento pra não voltar a quebrar.
 */
describe('fetchAllPages', () => {
  it('agrega todas as páginas até a fonte parar de devolver linha nova', async () => {
    const paginas = [Array(1000).fill(0), Array(1000).fill(0), Array(300).fill(0)]
    let chamadas = 0
    const resultado = await fetchAllPages(async () => ({ data: paginas[chamadas++], error: null }))
    expect(resultado).toHaveLength(2300)
    expect(chamadas).toBe(3)
  })

  it('para na primeira página vazia', async () => {
    const resultado = await fetchAllPages(async () => ({ data: [], error: null }))
    expect(resultado).toEqual([])
  })

  it('nunca pede uma página com from > to quando maxRows é múltiplo exato do tamanho de página', async () => {
    const ranges: Array<[number, number]> = []
    await fetchAllPages(async (from, to) => {
      ranges.push([from, to])
      return { data: Array(to - from + 1).fill(0), error: null } // sempre devolve página cheia
    }, 5000)

    for (const [from, to] of ranges) {
      expect(from).toBeLessThanOrEqual(to)
    }
    // não deve ter pedido nada além do necessário pra cobrir os 5000 -- 5 páginas de 1000.
    expect(ranges).toHaveLength(5)
    expect(ranges[ranges.length - 1]).toEqual([4000, 4999])
  })

  it('respeita maxRows quando ele não é múltiplo exato do tamanho de página', async () => {
    const ranges: Array<[number, number]> = []
    const resultado = await fetchAllPages(async (from, to) => {
      ranges.push([from, to])
      return { data: Array(to - from + 1).fill(0), error: null }
    }, 2500)

    expect(resultado).toHaveLength(2500)
    expect(ranges[ranges.length - 1]).toEqual([2000, 2499])
  })

  it('propaga erro da fonte em vez de silenciar', async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom')
  })
})
