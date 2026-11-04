import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from '../backup'
import type { Exercise } from '../types'

describe('respaldo con RIR', () => {
  it('conserva rir sin cambiar la versión del respaldo', () => {
    const session: Exercise[] = [
      {
        id: 'e1',
        name: 'Press banca',
        group: 'pecho',
        reps: '6–10',
        rest: '2 min',
        sets: [{ reps: 10, kg: 100, done: true, rir: 2 }]
      }
    ]
    const out = buildBackup({ week: 1, deload: false }, session, [], [])
    expect(out.version).toBe(3)
    expect(out.session[0].sets[0].rir).toBe(2)
    expect(parseBackup(JSON.stringify(out)).session[0].sets[0].rir).toBe(2)
  })
})
