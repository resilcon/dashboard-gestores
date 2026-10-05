import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TarefaGclick } from '@/types/domain'
import { exportarTarefas } from '@/utils/export-excel'
import {
  normalizarLancamentos,
  porCliente,
  porColaborador,
  porDepartamento,
  porTipo,
  type InfoColaborador,
} from '@/utils/tarefas-gclick'

const abas: { nome: string; dados: Record<string, unknown>[] }[] = []
let arquivo = ''

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (dados: Record<string, unknown>[]) => ({ dados }),
    book_new: () => ({}),
    book_append_sheet: (_wb: unknown, ws: { dados: Record<string, unknown>[] }, nome: string) => abas.push({ nome, dados: ws.dados }),
  },
  writeFile: (_wb: unknown, nome: string) => {
    arquivo = nome
  },
}))

const COLABS = new Map<string, InfoColaborador>([['a', { nome: 'Ana', supervisor: 'Gestor 1' }]])

function linha(p: Partial<TarefaGclick>): TarefaGclick {
  return {
    id: '1',
    colaborador_id: 'a',
    data: '2026-09-02',
    hora: '09:30:00',
    categoria: 'premiacao',
    cliente: 'CLIENTE X',
    sistema: '001-1',
    departamento: 'Fiscal',
    tarefa: 'DAS - Fulano',
    duracao: '01:30:00',
    ...p,
  }
}

describe('exportarTarefas', () => {
  beforeEach(() => {
    abas.length = 0
    arquivo = ''
  })

  it('gera uma aba por dimensão mais os lançamentos, com valores formatados', async () => {
    const lancamentos = normalizarLancamentos([linha({ id: '1' }), linha({ id: '2', duracao: '00:30:00', sistema: '100-1' })], COLABS)

    await exportarTarefas(
      {
        colaboradores: porColaborador(lancamentos),
        departamentos: porDepartamento(lancamentos),
        tarefas: porTipo(lancamentos),
        clientes: porCliente(lancamentos),
        lancamentos,
      },
      '2026-09-01',
      '2026-09-30',
    )

    expect(arquivo).toBe('tarefas_gclick_2026-09-01_a_2026-09-30.xlsx')
    expect(abas.map((a) => a.nome)).toEqual(['Por colaborador', 'Por departamento', 'Por tarefa', 'Por cliente', 'Lançamentos'])

    const colab = abas[0].dados[0]
    expect(colab).toMatchObject({
      Colaborador: 'Ana',
      'Departamento principal': 'Fiscal',
      'Tarefa principal': 'DAS',
      'Tempo total': '2h 00m',
      'Tempo total (horas)': 2,
      '% do total': 100,
      Lançamentos: 2,
      'Média por lançamento (min)': 60,
    })

    const detalhe = abas[4].dados
    expect(detalhe).toHaveLength(2)
    expect(detalhe[0]).toMatchObject({
      Data: '02/09/2026',
      Hora: '09:30',
      Colaborador: 'Ana',
      Gestor: 'Gestor 1',
      'Tipo de tarefa': 'DAS',
      Interna: 'Sim',
      'Duração (min)': 90,
    })
    expect(detalhe[1]).toMatchObject({ Interna: 'Não', 'Duração (min)': 30 })
  })

  it('exporta abas vazias sem quebrar quando não há lançamentos', async () => {
    await exportarTarefas({ colaboradores: [], departamentos: [], tarefas: [], clientes: [], lancamentos: [] }, '2026-10-01', '2026-10-05')
    expect(abas).toHaveLength(5)
    expect(abas.every((a) => a.dados.length === 0)).toBe(true)
  })
})
