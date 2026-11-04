import { describe, expect, it } from 'vitest'
import { progresoSubFromHash, viewFromHash } from '../view'

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

  it('mapea #historial a progreso', () => {
    expect(viewFromHash('#historial')).toBe('progreso')
  })

  it('cae en registrar con hash vacío o desconocido', () => {
    expect(viewFromHash('')).toBe('registrar')
    expect(viewFromHash('#otra-cosa')).toBe('registrar')
    expect(viewFromHash('#constructor')).toBe('registrar')
    expect(viewFromHash('#toString')).toBe('registrar')
  })
})

describe('progresoSubFromHash', () => {
  it('elige historial solo con #historial', () => {
    expect(progresoSubFromHash('#historial')).toBe('historial')
  })

  it('cae en resumen con el resto de los hashes', () => {
    expect(progresoSubFromHash('#progreso')).toBe('resumen')
    expect(progresoSubFromHash('#plan')).toBe('resumen')
    expect(progresoSubFromHash('')).toBe('resumen')
    expect(progresoSubFromHash('#otra-cosa')).toBe('resumen')
  })
})
