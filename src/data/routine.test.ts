import { describe, expect, it } from 'vitest'
import { GROUPS, MEASURES, ROUTINE, SET_GUIDE } from '../data/routine'

describe('ROUTINE', () => {
  it('tiene 5 días y 32 ejercicios', () => {
    expect(ROUTINE).toHaveLength(5)
    const total = ROUTINE.reduce((a, d) => a + d.ex.length, 0)
    expect(total).toBe(33)
  })

  it('cada ejercicio tiene grupo válido y sets por semana', () => {
    ROUTINE.forEach((d) => {
      expect(d.ex.length).toBeGreaterThan(0)
      d.ex.forEach((e) => {
        expect(GROUPS[e.g]).toBeTruthy()
        expect(e.sets.length).toBeGreaterThan(0)
        expect(e.sets.every((w) => w >= 1)).toBe(true)
      })
    })
  })
})

describe('MEASURES', () => {
  it('tiene 9 medidas con clave y etiqueta', () => {
    expect(MEASURES).toHaveLength(9)
    MEASURES.forEach(([k, l]) => {
      expect(k).toBeTruthy()
      expect(l).toBeTruthy()
    })
  })
})

describe('SET_GUIDE', () => {
  it('tiene 7 grupos con min ≤ max', () => {
    expect(Object.keys(SET_GUIDE)).toHaveLength(7)
    Object.values(SET_GUIDE).forEach(({ min, max }) => {
      expect(min).toBeLessThanOrEqual(max)
    })
  })
})