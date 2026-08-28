import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Datas do domínio trafegam sempre como string "YYYY-MM-DD" (é o formato que
 * o Postgres/PostgREST devolve pra uma coluna `date`). Todo cálculo de
 * dia-a-dia usa meio-dia UTC como âncora (em vez de `new Date('YYYY-MM-DD')`,
 * que o navegador interpreta como meia-noite UTC e pode "voltar" um dia
 * dependendo do fuso local) -- mesma técnica já validada no dashboard antigo,
 * só que agora com date-fns cuidando da FORMATAÇÃO (não do cálculo de dia).
 */
export type IsoDate = string

function toUtcNoon(isoDate: IsoDate): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function fromUtcNoon(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

export function addDays(isoDate: IsoDate, amount: number): IsoDate {
  const date = toUtcNoon(isoDate)
  date.setUTCDate(date.getUTCDate() + amount)
  return fromUtcNoon(date)
}

export function startOfWeekMonday(isoDate: IsoDate): IsoDate {
  const date = toUtcNoon(isoDate)
  const dow = date.getUTCDay() // 0=domingo..6=sábado
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(isoDate, offset)
}

export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function isWeekend(isoDate: IsoDate): boolean {
  const dow = toUtcNoon(isoDate).getUTCDay()
  return dow === 0 || dow === 6
}

/** Dia útil anterior a `isoDate`, pulando sábado/domingo. */
export function previousBusinessDay(isoDate: IsoDate): IsoDate {
  let candidate = addDays(isoDate, -1)
  while (isWeekend(candidate)) candidate = addDays(candidate, -1)
  return candidate
}

export function weekdayIndex(isoDate: IsoDate): number {
  return toUtcNoon(isoDate).getUTCDay()
}

const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export function weekdayName(isoDate: IsoDate): string {
  return WEEKDAY_NAMES[weekdayIndex(isoDate)]
}

export function formatDateBr(isoDate: IsoDate): string {
  return format(toUtcNoon(isoDate), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateBrShort(isoDate: IsoDate): string {
  return format(toUtcNoon(isoDate), 'dd MMM yyyy', { locale: ptBR })
}

export function todayIso(): IsoDate {
  return fromUtcNoon(new Date())
}

/** Parseia um "dd/MM/yyyy" digitado pelo usuário de volta pra "YYYY-MM-DD". */
export function parseBrDate(value: string): IsoDate | null {
  const parsed = parse(value, 'dd/MM/yyyy', new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return format(parsed, 'yyyy-MM-dd')
}
