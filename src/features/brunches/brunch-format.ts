import type { BrunchRow } from '#/lib/schemas/brunch'

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export const formatStartsAt = (startsAt: string | null) =>
  startsAt ? dateTimeFormat.format(new Date(startsAt)) : 'No date yet'

const time = (startsAt: string | null) =>
  startsAt ? new Date(startsAt).getTime() : Infinity

export function splitUpcomingAndPast(brunches: BrunchRow[], now = Date.now()) {
  const upcoming = brunches
    .filter((b) => time(b.starts_at) >= now)
    .sort((a, b) => time(a.starts_at) - time(b.starts_at))
  const past = brunches
    .filter((b) => time(b.starts_at) < now)
    .sort((a, b) => time(b.starts_at) - time(a.starts_at))
  return { upcoming, past }
}
