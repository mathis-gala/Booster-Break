import type { BoosterRotationPeriod, BoosterRotationScheduleConfig } from './booster-rotation-types'

interface LocalDate {
  year: number
  month: number
  day: number
}

interface LocalDateTime extends LocalDate {
  hour: number
  minute: number
  second: number
}

const dayMs = 24 * 60 * 60 * 1000

export const getBoosterRotationPeriod = (
  now: Date,
  config: BoosterRotationScheduleConfig,
): BoosterRotationPeriod => {
  const anchor = parseLocalDate(config.anchorLocalDate)
  const current = getLocalDate(now, config.timeZone)

  if (config.cadenceUnit === 'month') {
    return getMonthlyPeriod(current, anchor, config)
  }

  return getDailyPeriod(current, anchor, config)
}

export const getNextBoosterRotationPeriod = (
  period: BoosterRotationPeriod,
  config: BoosterRotationScheduleConfig,
): BoosterRotationPeriod => {
  const start = parseLocalDate(period.endLocalDate)
  const anchor = parseLocalDate(config.anchorLocalDate)
  const end =
    config.cadenceUnit === 'month'
      ? addMonths(start, config.cadenceValue, anchor.day)
      : addDays(start, config.cadenceValue)

  return toPeriod(start, end, config.timeZone)
}

const getDailyPeriod = (
  current: LocalDate,
  anchor: LocalDate,
  config: BoosterRotationScheduleConfig,
): BoosterRotationPeriod => {
  const daysSinceAnchor = diffLocalDays(anchor, current)
  const periodIndex = Math.floor(daysSinceAnchor / config.cadenceValue)
  const start = addDays(anchor, periodIndex * config.cadenceValue)
  const end = addDays(start, config.cadenceValue)

  return toPeriod(start, end, config.timeZone)
}

const getMonthlyPeriod = (
  current: LocalDate,
  anchor: LocalDate,
  config: BoosterRotationScheduleConfig,
): BoosterRotationPeriod => {
  const monthsSinceAnchor = (current.year - anchor.year) * 12 + current.month - anchor.month
  let periodIndex = Math.floor(monthsSinceAnchor / config.cadenceValue)
  let start = addMonths(anchor, periodIndex * config.cadenceValue, anchor.day)

  if (compareLocalDates(current, start) < 0) {
    periodIndex -= 1
    start = addMonths(anchor, periodIndex * config.cadenceValue, anchor.day)
  }

  const end = addMonths(start, config.cadenceValue, anchor.day)

  return toPeriod(start, end, config.timeZone)
}

const toPeriod = (
  startLocalDate: LocalDate,
  endLocalDate: LocalDate,
  timeZone: string,
): BoosterRotationPeriod => ({
  startsAt: localDateTimeToUtc({ ...startLocalDate, hour: 0, minute: 0, second: 0 }, timeZone),
  endsAt: localDateTimeToUtc({ ...endLocalDate, hour: 0, minute: 0, second: 0 }, timeZone),
  startLocalDate: formatLocalDate(startLocalDate),
  endLocalDate: formatLocalDate(endLocalDate),
})

const getLocalDate = (date: Date, timeZone: string): LocalDate => {
  const parts = getLocalDateTimeParts(date, timeZone)

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  }
}

const localDateTimeToUtc = (localDateTime: LocalDateTime, timeZone: string): Date => {
  const utcGuess = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    localDateTime.hour,
    localDateTime.minute,
    localDateTime.second,
  )
  const zonedGuess = getLocalDateTimeParts(new Date(utcGuess), timeZone)
  const zonedGuessAsUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second,
  )
  const offsetMs = zonedGuessAsUtc - utcGuess

  return new Date(utcGuess - offsetMs)
}

const getLocalDateTimeParts = (date: Date, timeZone: string): LocalDateTime => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  }
}

const parseLocalDate = (value: string): LocalDate => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    throw new Error(`Invalid local date: ${value}`)
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

const formatLocalDate = (date: LocalDate): string => {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

const diffLocalDays = (from: LocalDate, to: LocalDate): number => {
  return Math.floor((toUtcDateOnly(to).getTime() - toUtcDateOnly(from).getTime()) / dayMs)
}

const toUtcDateOnly = (date: LocalDate): Date => {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

const addDays = (date: LocalDate, days: number): LocalDate => {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days))

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  }
}

const addMonths = (date: LocalDate, months: number, anchorDay: number): LocalDate => {
  const totalMonthIndex = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(totalMonthIndex / 12)
  const month = (totalMonthIndex % 12) + 1
  const day = Math.min(anchorDay, daysInMonth(year, month))

  return { year, month, day }
}

const daysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const compareLocalDates = (first: LocalDate, second: LocalDate): number => {
  return toUtcDateOnly(first).getTime() - toUtcDateOnly(second).getTime()
}
