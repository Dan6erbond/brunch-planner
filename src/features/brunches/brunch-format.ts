import { formatDayTime, timeOf } from '#/lib/date'
import type { BrunchRow } from '#/lib/schemas/brunch'

export const formatStartsAt = (startsAt: string | null) =>
  startsAt ? formatDayTime(startsAt) : 'No date yet'

export function splitUpcomingAndPast(brunches: BrunchRow[], now = Date.now()) {
  const upcoming = brunches
    .filter((b) => timeOf(b.starts_at) >= now)
    .sort((a, b) => timeOf(a.starts_at) - timeOf(b.starts_at))
  const past = brunches
    .filter((b) => timeOf(b.starts_at) < now)
    .sort((a, b) => timeOf(b.starts_at) - timeOf(a.starts_at))
  return { upcoming, past }
}
