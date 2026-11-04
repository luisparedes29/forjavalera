import { describe, expect, it } from 'vitest'
import {
  formatElapsed,
  nextPending,
  nextSetTarget,
  sessionSummary,
  stepValue,
  suggestExercises
} from '../session'
import type { Exercise, SessionHistory, SetData } from '../types'

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

describe('nextSetTarget', () => {
  const ex = (id: string, done: boolean[]): Exercise => ({
    id,
    name: id,
    group: 'pecho',
    sets: done.map((d) => set(10, 100, d))
  })

  it('elige la próxima pendiente del mismo ejercicio', () => {
    const exercises = [ex('a', [true, false, false]), ex('b', [false])]
    expect(nextSetTarget(exercises, 'a', 0)).toEqual({ exId: 'a', si: 1 })
  })

  it('salta al primer ejercicio con pendientes', () => {
    const exercises = [
      ex('a', [true]),
      ex('b', [true, false]),
      ex('c', [false])
    ]
    expect(nextSetTarget(exercises, 'a', 0)).toEqual({ exId: 'b', si: 1 })
  })

  it('devuelve null sin pendientes o con un ejercicio inexistente', () => {
    expect(nextSetTarget([ex('a', [true])], 'a', 0)).toBeNull()
    expect(nextSetTarget([ex('a', [false])], 'z', 0)).toBeNull()
    expect(nextSetTarget([], 'a', 0)).toBeNull()
  })
})

const hist = (name: string): SessionHistory => ({
  id: 'h',
  ts: '2026-10-20T10:00:00Z',
  volume: 0,
  focus: 'espalda',
  exercises: [
    {
      id: 'e',
      name,
      group: 'espalda',
      reps: '6–10',
      rest: '2 min',
      sets: [set(10, 100, true)]
    }
  ]
})

describe('suggestExercises', () => {
  it('busca en la rutina y prioriza el historial reciente con query vacía', () => {
    const h = [hist('Remo con barra')]
    const press = suggestExercises(h, 'press')
    expect(press.length).toBeGreaterThan(0)
    expect(press.every((s) => /press/i.test(s.name))).toBe(true)
    expect(suggestExercises(h, '')[0].name).toBe('Remo con barra')
  })
})

describe('stepValue', () => {
  it('suma, resta, clampa en 0 y redondea a dos decimales', () => {
    expect(stepValue('', 2.5)).toBe(2.5)
    expect(stepValue(50, -2.5)).toBe(47.5)
    expect(stepValue(0, -2.5)).toBe(0)
    expect(stepValue('1.1', 0.2)).toBe(1.3)
  })
})
