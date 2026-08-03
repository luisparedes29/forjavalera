export const uid = (): string =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : 'id' + Date.now() + Math.random().toString(16).slice(2)

export const esc = (s: string | number): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c] as string
  )

export const fmtN = (n: string | number, d = 0): string =>
  (+n).toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d
  })

export const normName = (s: string): string =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()