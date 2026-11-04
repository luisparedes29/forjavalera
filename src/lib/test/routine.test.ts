import { describe, expect, it } from 'vitest'
import { lastTrainedDayIdx } from '../routine'
import { ROUTINE } from '../../data/routine'
import type { SessionHistory } from '../types'

const hist = (names: string[]): SessionHistory => ({
  id: 'h',
  ts: '2026-10-23T10:00:00Z',
  volume: 0,
  focus: 'pecho',
  exercises: names.map((name, i) => ({
    id: String(i),
    name,
    group: 'pecho',
    sets: [{ reps: 10, kg: 50, done: true }]
  }))
})

describe('lastTrainedDayIdx', () => {
  it('detecta el día de la rutina por los ejercicios de la última sesión', () => {
    const friday = hist(ROUTINE[4].ex.slice(0, 2).map((e) => e.n))
    expect(lastTrainedDayIdx([friday])).toBe(4)
    const monday = hist(ROUTINE[0].ex.slice(0, 2).map((e) => e.n))
    expect(lastTrainedDayIdx([monday])).toBe(0)
  })

  it('devuelve null sin historial o con ejercicios fuera de la rutina', () => {
    expect(lastTrainedDayIdx([])).toBeNull()
    expect(lastTrainedDayIdx([hist(['Ejercicio inventado'])])).toBeNull()
  })
})
