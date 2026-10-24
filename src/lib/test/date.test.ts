import { describe, expect, it } from 'vitest'
import { capFirst, formatDate, formatLongDate, formatWeekday } from '../date'

describe('capFirst', () => {
  it('capitaliza solo la primera letra y tolera vacío', () => {
    expect(capFirst('sábado, 24 de octubre de 2026')).toBe(
      'Sábado, 24 de octubre de 2026'
    )
    expect(capFirst('')).toBe('')
  })
})

describe('formatLongDate', () => {
  it('deja una sola mayúscula inicial y no capitaliza las preposiciones', () => {
    const out = formatLongDate(new Date(2026, 9, 24, 12, 0, 0))
    expect(out).toMatch(/^[A-ZÁÉÍÓÚÑ]/)
    expect(out).toContain('2026')
    expect(out).not.toMatch(/\bDe\b/)
  })
})

describe('formatWeekday y formatDate', () => {
  it('devuelve día corto capitalizado y fecha corta sin capitalizar', () => {
    const d = new Date(2026, 9, 24, 12, 0, 0)
    expect(formatWeekday(d)).toMatch(/^[A-ZÁÉÍÓÚÑ]/)
    expect(formatDate(d, { day: 'numeric', month: 'short' })).not.toMatch(/\bDe\b/)
  })
})
