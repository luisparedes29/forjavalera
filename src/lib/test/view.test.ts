import { describe, expect, it } from 'vitest'
import { viewFromHash } from '../view'

describe('viewFromHash', () => {
  it('mapea las cuatro vistas', () => {
    expect(viewFromHash('#registrar')).toBe('registrar')
    expect(viewFromHash('#plan')).toBe('plan')
    expect(viewFromHash('#cuerpo')).toBe('cuerpo')
    expect(viewFromHash('#progreso')).toBe('progreso')
  })

  it('mantiene #hierro como alias de registrar', () => {
    expect(viewFromHash('#hierro')).toBe('registrar')
  })

  it('cae en registrar con hash vacío o desconocido', () => {
    expect(viewFromHash('')).toBe('registrar')
    expect(viewFromHash('#otra-cosa')).toBe('registrar')
    expect(viewFromHash('#constructor')).toBe('registrar')
    expect(viewFromHash('#toString')).toBe('registrar')
  })
})
