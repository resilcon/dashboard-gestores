import { describe, expect, it } from 'vitest'
import type { TarefaGclick } from '@/types/domain'
import {
  FILTROS_PADRAO,
  dividirPeriodo,
  filtrarLancamentos,
  formatarMinutos,
  mediana,
  normalizarLancamentos,
  periodosPredefinidos,
  porColaborador,
  porDepartamento,
  porDia,
  porTipo,
  resumir,
  tipoDeTarefa,
  type InfoColaborador,
} from '@/utils/tarefas-gclick'

const COLABS = new Map<string, InfoColaborador>([
  ['a', { nome: 'Ana', supervisor: 'Gestor 1' }],
  ['b', { nome: 'Bruno', supervisor: 'Gestor 2' }],
])

function linha(p: Partial<TarefaGclick>): TarefaGclick {
  return {
    id: Math.random().toString(36),
    colaborador_id: 'a',
    data: '2026-09-02', // quarta-feira
    hora: '09:00:00',
    categoria: 'premiacao',
    inscricao: null,
    cliente: 'CLIENTE X',
    sistema: '100-1',
    departamento: 'Fiscal',
    tarefa: 'DAS - Fulano',
    duracao: '00:10:00',
    ...p,
  }
}

describe('tipoDeTarefa', () => {
  it('pega o trecho antes do primeiro " - "', () => {
    expect(tipoDeTarefa('Fechamento de Folha - 5º Dia (V+) - JULHO')).toBe('Fechamento de Folha')
  })

  it('corta observação livre separada por 2+ espaços', () => {
    expect(tipoDeTarefa('Pedido de CND       Aguardando retorno da Resilcon')).toBe('Pedido de CND')
  })

  it('remove o marcador jurídico (A)/(R)/(Prazo) do começo', () => {
    expect(tipoDeTarefa('(A) Cumprimento de Sentença       protocolado')).toBe('Cumprimento de Sentença')
    expect(tipoDeTarefa('(Prazo) Apelação Cível     1')).toBe('Apelação Cível')
    expect(tipoDeTarefa('(PRAZO) Renúncia de Mandato')).toBe('Renúncia de Mandato')
  })

  it('mantém códigos entre parênteses quando fazem parte do nome', () => {
    expect(tipoDeTarefa('COFINS (5856/2172)/ PIS (6912/8109)')).toBe('COFINS (5856/2172)/ PIS (6912/8109)')
  })

  it('devolve "Sem descrição" pra texto vazio', () => {
    expect(tipoDeTarefa('')).toBe('Sem descrição')
    expect(tipoDeTarefa(null)).toBe('Sem descrição')
  })
})

describe('normalizarLancamentos', () => {
  it('converte duração em minutos, marca interna e resolve o nome do colaborador', () => {
    const [l] = normalizarLancamentos([linha({ duracao: '01:30:00', sistema: '001-1' })], COLABS)
    expect(l.min).toBe(90)
    expect(l.interna).toBe(true)
    expect(l.colaborador).toBe('Ana')
    expect(l.supervisor).toBe('Gestor 1')
  })

  it('agrupa tipos que só diferem por caixa/acento sob a mesma chave', () => {
    const ls = normalizarLancamentos([linha({ tarefa: 'Admissão - X' }), linha({ tarefa: 'ADMISSAO - Y' })], COLABS)
    expect(ls[0].tipoChave).toBe(ls[1].tipoChave)
  })

  it('trata colaborador desconhecido sem quebrar', () => {
    const [l] = normalizarLancamentos([linha({ colaborador_id: 'zzz' })], COLABS)
    expect(l.colaborador).toBe('Colaborador removido')
  })
})

describe('filtrarLancamentos', () => {
  const ls = normalizarLancamentos(
    [
      linha({ id: '1' }),
      linha({ id: '2', sistema: '001-1' }),
      linha({ id: '3', data: '2026-09-05' }), // sábado
      linha({ id: '4', colaborador_id: 'b', departamento: 'Pessoal', duracao: '00:00:01' }),
    ],
    COLABS,
  )

  it('por padrão exclui fim de semana e mantém internas', () => {
    expect(filtrarLancamentos(ls, FILTROS_PADRAO).map((l) => l.id)).toEqual(['1', '2', '4'])
  })

  it('ocultar internas remove o sistema 001-1', () => {
    expect(filtrarLancamentos(ls, { ...FILTROS_PADRAO, incluirInternas: false }).map((l) => l.id)).toEqual(['1', '4'])
  })

  it('filtra por colaborador e departamento', () => {
    expect(filtrarLancamentos(ls, { ...FILTROS_PADRAO, colaboradorId: 'b' }).map((l) => l.id)).toEqual(['4'])
    expect(filtrarLancamentos(ls, { ...FILTROS_PADRAO, departamento: 'Fiscal' }).map((l) => l.id)).toEqual(['1', '2'])
  })

  it('incluir fim de semana traz o sábado de volta', () => {
    expect(filtrarLancamentos(ls, { ...FILTROS_PADRAO, incluirFimDeSemana: true })).toHaveLength(4)
  })

  it('duração mínima descarta lançamentos curtos', () => {
    expect(filtrarLancamentos(ls, { ...FILTROS_PADRAO, minimoMin: 1 }).map((l) => l.id)).toEqual(['1', '2'])
  })
})

describe('agregações', () => {
  const ls = normalizarLancamentos(
    [
      linha({ colaborador_id: 'a', data: '2026-09-01', tarefa: 'DAS - A', departamento: 'Fiscal', duracao: '01:00:00' }),
      linha({ colaborador_id: 'a', data: '2026-09-02', tarefa: 'DAS - B', departamento: 'Fiscal', duracao: '00:30:00' }),
      linha({ colaborador_id: 'b', data: '2026-09-02', tarefa: 'Admissão - C', departamento: 'Pessoal', duracao: '00:30:00' }),
    ],
    COLABS,
  )

  it('resumir calcula total, médias e mediana', () => {
    const r = resumir(ls)
    expect(r.totalMin).toBe(120)
    expect(r.qtd).toBe(3)
    expect(r.mediaMin).toBe(40)
    expect(r.medianaMin).toBe(30)
    expect(r.colaboradores).toBe(2)
    expect(r.dias).toBe(2)
    expect(r.mediaPorColaboradorMin).toBe(60)
    expect(r.mediaDiariaPorColaboradorMin).toBe(40) // 3 pares colaborador-dia
  })

  it('resumir de lista vazia não gera NaN', () => {
    const r = resumir([])
    expect(r.mediaMin).toBe(0)
    expect(r.mediaPorColaboradorMin).toBe(0)
    expect(r.mediaDiariaPorColaboradorMin).toBe(0)
  })

  it('porColaborador ordena por tempo e traz departamento/tarefa principais', () => {
    const g = porColaborador(ls)
    expect(g.map((x) => x.rotulo)).toEqual(['Ana', 'Bruno'])
    expect(g[0].totalMin).toBe(90)
    expect(g[0].dias).toBe(2)
    expect(g[0].principais.departamento).toBe('Fiscal')
    expect(g[0].principais.tipo).toBe('DAS')
    expect(g[0].pct).toBeCloseTo(0.75)
  })

  it('porDepartamento soma e calcula participação', () => {
    const g = porDepartamento(ls)
    expect(g[0]).toMatchObject({ rotulo: 'Fiscal', totalMin: 90, qtd: 2, mediaMin: 45 })
    expect(g[1].rotulo).toBe('Pessoal')
  })

  it('porTipo junta lançamentos do mesmo tipo e aponta o departamento principal', () => {
    const g = porTipo(ls)
    expect(g[0]).toMatchObject({ rotulo: 'DAS', qtd: 2, totalMin: 90 })
    expect(g[0].principais.departamento).toBe('Fiscal')
  })

  it('porDia devolve a série em ordem cronológica', () => {
    expect(porDia(ls).map((x) => x.chave)).toEqual(['2026-09-01', '2026-09-02'])
  })
})

describe('mediana', () => {
  it('lida com quantidade par, ímpar e vazia', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([4, 1, 3, 2])).toBe(2.5)
    expect(mediana([])).toBe(0)
  })
})

describe('formatarMinutos', () => {
  it('usa "min" abaixo de 1h e "Xh YYm" a partir de 1h', () => {
    expect(formatarMinutos(12.4)).toBe('12 min')
    expect(formatarMinutos(60)).toBe('1h 00m')
    expect(formatarMinutos(185)).toBe('3h 05m')
    expect(formatarMinutos(null)).toBe('—')
  })
})

describe('periodosPredefinidos', () => {
  it('calcula mês atual, mês passado, 30 dias e ano', () => {
    const p = Object.fromEntries(periodosPredefinidos('2026-10-05').map((x) => [x.id, x]))
    expect(p.mes).toMatchObject({ inicio: '2026-10-01', fim: '2026-10-05' })
    expect(p['mes-passado']).toMatchObject({ inicio: '2026-09-01', fim: '2026-09-30' })
    expect(p['30d']).toMatchObject({ inicio: '2026-09-06', fim: '2026-10-05' })
    expect(p.ano).toMatchObject({ inicio: '2026-01-01', fim: '2026-10-05' })
  })

  it('vira o ano corretamente em janeiro', () => {
    const p = Object.fromEntries(periodosPredefinidos('2027-01-10').map((x) => [x.id, x]))
    expect(p['mes-passado']).toMatchObject({ inicio: '2026-12-01', fim: '2026-12-31' })
  })
})

describe('dividirPeriodo', () => {
  it('quebra em janelas consecutivas sem sobreposição e com a última encurtada', () => {
    expect(dividirPeriodo('2026-09-01', '2026-09-17', 7)).toEqual([
      ['2026-09-01', '2026-09-07'],
      ['2026-09-08', '2026-09-14'],
      ['2026-09-15', '2026-09-17'],
    ])
  })

  it('período menor que a janela vira uma janela só', () => {
    expect(dividirPeriodo('2026-10-01', '2026-10-05', 7)).toEqual([['2026-10-01', '2026-10-05']])
  })

  it('um único dia gera uma janela de um dia', () => {
    expect(dividirPeriodo('2026-10-05', '2026-10-05', 7)).toEqual([['2026-10-05', '2026-10-05']])
  })

  it('início depois do fim não gera janelas', () => {
    expect(dividirPeriodo('2026-10-06', '2026-10-05', 7)).toEqual([])
  })

  it('cobre o ano todo sem buracos (cada janela começa um dia depois da anterior)', () => {
    const janelas = dividirPeriodo('2026-01-01', '2026-10-05', 7)
    for (let i = 1; i < janelas.length; i++) {
      const [, fimAnterior] = janelas[i - 1]
      const [inicioAtual] = janelas[i]
      expect(inicioAtual).toBe(new Date(Date.parse(`${fimAnterior}T12:00:00Z`) + 86400000).toISOString().slice(0, 10))
    }
    expect(janelas[0][0]).toBe('2026-01-01')
    expect(janelas[janelas.length - 1][1]).toBe('2026-10-05')
  })
})
