/**
 * Duração vinda do Postgres (tipo `interval`) no formato que o PostgREST
 * devolve por padrão, ex.: "08:12:00" ou, quando passa de 24h, "1 day
 * 03:12:00". Convertida pra minutos (número) em todo lugar que precisa somar,
 * comparar ou ordenar -- portado 1:1 do dashboard antigo (intervalParaMin).
 */
export type PgInterval = string | null | undefined

const INTERVAL_RE = /^(?:(\d+)\s+days?\s+)?(-?\d{1,3}):(\d{2}):(\d{2})/

export function intervalToMinutes(value: PgInterval): number | null {
  if (value === null || value === undefined || value === '') return null
  const match = INTERVAL_RE.exec(String(value))
  if (!match) return null
  const days = Number.parseInt(match[1] ?? '0', 10)
  const hours = days * 24 + Number.parseInt(match[2], 10)
  const minutes = Number.parseInt(match[3], 10)
  const seconds = Number.parseInt(match[4], 10)
  return hours * 60 + minutes + seconds / 60
}

export function minutesToHm(minutes: number | null | undefined, withSign = false): string | null {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return null
  const sign = minutes < 0 ? '-' : withSign ? '+' : ''
  const abs = Math.round(Math.abs(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h ${String(m).padStart(2, '0')}m`
}

export function intervalToHm(value: PgInterval): string | null {
  const minutes = intervalToMinutes(value)
  return minutes === null ? null : minutesToHm(minutes, false)
}

/** Só o "HH:MM" inicial de um horário tipo "08:12:00" — usado pra início/fim de turno. */
export function truncateToHm(value: string | null | undefined): string | null {
  if (!value) return null
  return String(value).slice(0, 5)
}
