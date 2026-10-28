import { describe, expect, it } from 'vitest'
import { formatElapsed, nextPending, sessionSummary } from '../session'
import type { Exercise, SetData } from '../types'

const set = (reps: number | null, kg: number | null, done: boolean): SetData => ({
  reps,
  kg,
  done
})

const exercise = (sets: SetData[]): Exercise => ({
  id: 'e',
  name: 'Press banca',
  group: 'pecho',
  sets
})

describe('formatElapsed', () => {
  it('muestra minutos hasta la hora', () => {
    expect(formatElapsed(0)).toBe('0 min')
    expect(formatElapsed(38 * 60_000 + 40_000)).toBe('38 min')
  })

  it('muestra horas y minutos con dos dígitos', () => {
    expect(formatElapsed(65 * 60_000)).toBe('1 h 05')
  })
})

describe('sessionSummary', () => {
  it('cuenta solo series completadas y su volumen', () => {
    const out = sessionSummary([
      exercise([set(10, 100, true), set(10, 100, false)]),
      exercise([set(8, 50, true)])
    ])
    expect(out).toEqual({ done: 2, total: 3, volume: 1400 })
  })
})

describe('nextPending', () => {
  it('devuelve la primera serie pendiente desde from', () => {
    const sets = [set(10, 100, true), set(8, 90, false), set(6, 80, false)]
    expect(nextPending(sets)).toBe(1)
    expect(nextPending(sets, 2)).toBe(2)
  })

  it('devuelve -1 si no quedan pendientes', () => {
    expect(nextPending([set(10, 100, true)])).toBe(-1)
    expect(nextPending([])).toBe(-1)
  })
})
