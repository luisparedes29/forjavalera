export const capFirst = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleDateString('es-ES', options)
}

export function formatLongDate(value: string | number | Date): string {
  return capFirst(
    formatDate(value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  )
}

export function formatWeekday(value: string | number | Date): string {
  return capFirst(formatDate(value, { weekday: 'short' }))
}
