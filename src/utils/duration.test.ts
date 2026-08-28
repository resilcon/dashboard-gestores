import { describe, expect, it } from 'vitest'
import { intervalToHm, intervalToMinutes, minutesToHm, truncateToHm } from '@/utils/duration'

describe('intervalToMinutes', () => {
  it('converte um interval simples "HH:MM:SS"', () => {
    expect(intervalToMinutes('08:12:00')).toBe(492)
  })

  it('converte segundos parciais como fração de minuto', () => {
    expect(intervalToMinutes('00:00:30')).toBe(0.5)
  })

  it('converte um interval com dias ("1 day HH:MM:SS")', () => {
    expect(intervalToMinutes('1 day 03:12:00')).toBe(27 * 60 + 12)
  })

  it('devolve null pra valores vazios/ausentes', () => {
    expect(intervalToMinutes(null)).toBeNull()
    expect(intervalToMinutes(undefined)).toBeNull()
    expect(intervalToMinutes('')).toBeNull()
  })

  it('devolve null pra texto que não bate com o formato de interval', () => {
    expect(intervalToMinutes('não é um interval')).toBeNull()
  })

  it('trata "00:00:00" como zero, não como ausente (SEM LANÇAMENTO real vs. sem dado)', () => {
    expect(intervalToMinutes('00:00:00')).toBe(0)
  })
})

describe('minutesToHm', () => {
  it('formata horas e minutos com padding de 2 dígitos', () => {
    expect(minutesToHm(492)).toBe('8h 12m')
    expect(minutesToHm(65)).toBe('1h 05m')
  })

  it('arredonda minutos fracionários', () => {
    expect(minutesToHm(0.5)).toBe('0h 01m')
  })

  it('mostra sinal negativo pra diferenças negativas', () => {
    expect(minutesToHm(-90)).toBe('-1h 30m')
  })

  it('mostra sinal "+" só quando withSign=true e o valor é positivo', () => {
    expect(minutesToHm(90, true)).toBe('+1h 30m')
    expect(minutesToHm(90, false)).toBe('1h 30m')
  })

  it('devolve null pra null/undefined/NaN', () => {
    expect(minutesToHm(null)).toBeNull()
    expect(minutesToHm(undefined)).toBeNull()
    expect(minutesToHm(Number.NaN)).toBeNull()
  })
})

describe('intervalToHm', () => {
  it('combina parse + formatação', () => {
    expect(intervalToHm('08:12:00')).toBe('8h 12m')
  })

  it('devolve null pra interval ausente', () => {
    expect(intervalToHm(null)).toBeNull()
  })
})

describe('truncateToHm', () => {
  it('corta um horário "HH:MM:SS" pra "HH:MM"', () => {
    expect(truncateToHm('08:12:00')).toBe('08:12')
  })

  it('devolve null pra valor vazio', () => {
    expect(truncateToHm(null)).toBeNull()
    expect(truncateToHm(undefined)).toBeNull()
    expect(truncateToHm('')).toBeNull()
  })
})
