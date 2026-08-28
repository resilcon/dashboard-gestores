import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDateBr,
  isWeekend,
  previousBusinessDay,
  startOfWeekMonday,
  todayIso,
  weekDates,
  weekdayIndex,
  weekdayName,
} from '@/utils/date'

describe('addDays', () => {
  it('soma dias sem escorregar por fuso horário', () => {
    expect(addDays('2026-08-27', 1)).toBe('2026-08-28')
    expect(addDays('2026-08-27', -1)).toBe('2026-08-26')
  })

  it('atravessa virada de mês/ano corretamente', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('startOfWeekMonday', () => {
  it('uma quarta-feira volta pra segunda da mesma semana', () => {
    // 2026-08-26 é uma quarta-feira.
    expect(startOfWeekMonday('2026-08-26')).toBe('2026-08-24')
  })

  it('um domingo volta pra segunda da semana anterior (não fica parado no domingo)', () => {
    // 2026-08-30 é domingo.
    expect(startOfWeekMonday('2026-08-30')).toBe('2026-08-24')
  })

  it('uma segunda-feira já é o início da própria semana', () => {
    expect(startOfWeekMonday('2026-08-24')).toBe('2026-08-24')
  })
})

describe('weekDates', () => {
  it('devolve as 7 datas seg-a-dom a partir do início da semana', () => {
    expect(weekDates('2026-08-24')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ])
  })
})

describe('isWeekend', () => {
  it('identifica sábado e domingo', () => {
    expect(isWeekend('2026-08-29')).toBe(true) // sábado
    expect(isWeekend('2026-08-30')).toBe(true) // domingo
  })

  it('dias úteis não são fim de semana', () => {
    expect(isWeekend('2026-08-24')).toBe(false) // segunda
    expect(isWeekend('2026-08-28')).toBe(false) // sexta
  })
})

describe('previousBusinessDay', () => {
  it('dia útil comum volta 1 dia', () => {
    expect(previousBusinessDay('2026-08-26')).toBe('2026-08-25') // quarta -> terça
  })

  it('segunda-feira pula o fim de semana e volta pra sexta anterior', () => {
    expect(previousBusinessDay('2026-08-24')).toBe('2026-08-21') // segunda -> sexta
  })

  it('domingo também pula até a sexta', () => {
    expect(previousBusinessDay('2026-08-30')).toBe('2026-08-28')
  })
})

describe('weekdayIndex / weekdayName', () => {
  it('domingo é índice 0, sábado é índice 6 (getUTCDay)', () => {
    expect(weekdayIndex('2026-08-30')).toBe(0)
    expect(weekdayIndex('2026-08-29')).toBe(6)
  })

  it('nomeia o dia da semana em português', () => {
    expect(weekdayName('2026-08-26')).toBe('Quarta-feira')
  })
})

describe('formatDateBr', () => {
  it('formata "YYYY-MM-DD" como "DD/MM/YYYY"', () => {
    expect(formatDateBr('2026-08-05')).toBe('05/08/2026')
  })
})

describe('todayIso', () => {
  it('devolve uma data no formato YYYY-MM-DD', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
