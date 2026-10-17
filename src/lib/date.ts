const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dayTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const shortDayTimeFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export const formatDay = (date: Date) => dayFormat.format(date)

export const formatDayTime = (iso: string) =>
  dayTimeFormat.format(new Date(iso))

export const formatShortDayTime = (iso: string) =>
  shortDayTimeFormat.format(new Date(iso))

export const timeOf = (iso: string | null) =>
  iso ? new Date(iso).getTime() : Infinity
