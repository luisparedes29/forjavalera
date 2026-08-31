import { describe, expect, it } from 'vitest'
import {
  allExerciseNames,
  exerciseSeries,
  focusOf,
  isEff,
  lastSets,
  mondayOf,
  parseRest,
  repRange,
  stagnant,
  suggestFor,
  weeklyVolume
} from '../logic'
import type { HistoryExercise, SessionHistory, SetData } from '../types'

const set = (reps: number | null = 10, kg: number | null = 100, done = false): SetData => ({
  reps,
  kg,
  done
})

const ex = (name: string, sets: SetData[], reps = '6–10') => ({
  id: 'x',
  name,
  group: 'pecho',
  reps,
  rest: '2 min',
  sets
})

const hist = (
  ts: string,
  exercises: Array<{ name: string; sets: SetData[] }>
): SessionHistory => ({
  id: 'h',
  ts,
  volume: 0,
  focus: 'pecho',
  exercises: exercises.map(({ name, sets }): HistoryExercise => ({
    id: 'e',
    name,
    group: 'pecho',
    reps: '6–10',
    rest: '2 min',
    sets
  }))
})

describe('repRange', () => {
  it.each([
    ['6–10', [6, 10]],
    ['8-12', [8, 12]],
    ['12–15', [12, 15]]
  ])('%s → [%i, %i]', (input, expected) => {
    expect(repRange({ reps: input })).toEqual(expected)
  })

  it('devuelve null para "al fallo" y sin reps', () => {
    expect(repRange({ reps: 'al fallo' })).toBeNull()
    expect(repRange({})).toBeNull()
  })
})

describe('suggestFor', () => {
  it('sugiere subir cuando todas las series llegan al tope del rango', () => {
    expect(suggestFor(ex('Press banca', [set(11, 80, true), set(10, 80, true), set(10, 80, true)]))).toEqual({
      t: 'up',
      msg: '▲ Subí ~2,5 kg la próxima'
    })
  })

  it('sugiere bajar/repetir si alguna serie está por debajo del mínimo', () => {
    expect(suggestFor(ex('Press banca', [set(10, 80, true), set(5, 80, true), set(10, 80, true)]))).toEqual({
      t: 'down',
      msg: '▼ Repetí o bajá la carga'
    })
  })

  it('mantiene carga si está en rango', () => {
    expect(suggestFor(ex('Press banca', [set(8, 80, true), set(7, 80, true)]))).toEqual({
      t: 'ok',
      msg: '✓ En rango · mantené la carga'
    })
  })

  it('devuelve null si no todas las series están hechas o si reps es al fallo', () => {
    expect(suggestFor(ex('Press banca', [set(10, 80, false), set(10, 80, true)]))).toBeNull()
    expect(suggestFor(ex('Press banca', [set(10, 80, true)], 'al fallo'))).toBeNull()
  })
})

describe('parseRest', () => {
  it.each([
    ['2 min', 120],
    ['60–90 s', 90],
    ['90 s', 90],
    ['2.5-3 min', 180],
    ['2.5–3 min', 180]
  ])('%s → %i seg', (input, expected) => {
    expect(parseRest(input)).toBe(expected)
  })

  it('devuelve 0 sin descanso', () => {
    expect(parseRest('')).toBe(0)
    expect(parseRest(undefined)).toBe(0)
    expect(parseRest(null)).toBe(0)
  })
})

describe('isEff', () => {
  it('cuenta series marcadas o con reps cargadas', () => {
    expect(isEff(set(0, 0, true))).toBe(true)
    expect(isEff(set(10, 0, false))).toBe(true)
    expect(isEff(set(0, 0, false))).toBe(false)
  })
})

describe('lastSets', () => {
  it('encuentra el ejercicio más reciente por nombre normalizado', () => {
    // Estado de la app: historial con la sesión más reciente al inicio
    const h: SessionHistory[] = [
      hist('2026-07-25T10:00:00Z', [{ name: 'Press banca', sets: [set(8, 100)] }]),
      hist('2026-07-20T10:00:00Z', [
        { name: 'Press de banca (barra)', sets: [set(8, 90), set(6, 90)] }
      ])
    ]
    expect(lastSets(h, 'Press banca')).toEqual([set(8, 100)])
  })

  it('devuelve null si no existe', () => {
    expect(lastSets([], 'Remo')).toBeNull()
  })
})

describe('stagnant', () => {
  // La app guarda el historial con la sesión más reciente al inicio.
  const mk = (kg: number[]) =>
    kg
      .map((k, i) =>
        hist(`2026-07-${String(20 + i).padStart(2, '0')}T10:00:00Z`, [
          { name: 'Press banca', sets: [set(8, k, true)] }
        ])
      )
      .reverse()

  it('marca estancado si el score no sube (igual o en descenso)', () => {
    expect(stagnant(mk([100, 100, 100]))['press banca']).toBe(true)
    expect(stagnant(mk([100, 100, 95]))['press banca']).toBe(true)
  })

  it('no marca si está progresando o hay menos de 3 sesiones', () => {
    expect(stagnant(mk([90, 95, 100]))['press banca']).toBeUndefined()
    expect(stagnant(mk([100, 100]))['press banca']).toBeUndefined()
  })
})

describe('focusOf', () => {
  it('devuelve el grupo con más series', () => {
    const exs = [
      { group: 'pecho', sets: [set(), set()] },
      { group: 'espalda', sets: [set()] }
    ]
    expect(focusOf(exs)).toBe('pecho')
  })
})

describe('mondayOf', () => {
  it('devuelve el lunes 00:00 local de la semana de now', () => {
    const now = new Date(2026, 7, 3, 12, 0, 0).getTime()
    expect(mondayOf(now)).toBe(new Date(2026, 7, 3, 0, 0, 0).getTime())
  })

  it('si now es domingo, devuelve el lunes anterior', () => {
    const now = new Date(2026, 7, 9, 23, 59, 59).getTime()
    expect(mondayOf(now)).toBe(new Date(2026, 7, 3, 0, 0, 0).getTime())
  })
})

describe('weeklyVolume (semana calendario lun-dom local)', () => {
  const now = new Date(2026, 7, 3, 12, 0, 0).getTime()

  it('excluye sesiones de la semana anterior aunque esten a menos de 7 dias', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 1, 10, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toBeUndefined()
  })

  it('incluye sesiones desde el lunes 00:00 local inclusive', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 3, 0, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toEqual({
      sets: 1,
      volume: 1000,
      ex: new Set(['press banca'])
    })
  })

  it('excluye el domingo 23:59:59 de la semana previa', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 2, 23, 59, 59).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toBeUndefined()
  })

  it('acumula sesiones de la misma semana', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 4, 10, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true), set(0, 0, false)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toEqual({
      sets: 1,
      volume: 1000,
      ex: new Set(['press banca'])
    })
  })

  it('separa brazos histórico en biceps/triceps por nombre', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 3, 10, 0, 0).toISOString(), [
        { name: 'Curl de bíceps con barra EZ', sets: [set(10, 50, true)] }
      ]),
      hist(new Date(2026, 7, 3, 11, 0, 0).toISOString(), [
        { name: 'Pushdown tríceps en polea', sets: [set(10, 50, true)] }
      ])
    ]
    h[0].exercises[0].group = 'brazos'
    h[1].exercises[0].group = 'brazos'
    const out = weeklyVolume(h, now)
    expect(out['biceps'].sets).toBe(1)
    expect(out['triceps'].sets).toBe(1)
    expect(out['brazos']).toBeUndefined()
  })
})

describe('allExerciseNames', () => {
  it('ordena por sesión más reciente', () => {
    const h: SessionHistory[] = [
      hist('2026-07-20T10:00:00Z', [{ name: 'Remo', sets: [set()] }]),
      hist('2026-07-01T10:00:00Z', [{ name: 'Press banca', sets: [set()] }])
    ]
    const names = allExerciseNames(h)
    expect(names[0][0]).toBe('remo')
    expect(names[1][0]).toBe('press banca')
  })
})

describe('exerciseSeries (e1RM Epley)', () => {
  it('calcula mejor kg, e1RM y volumen', () => {
    const h: SessionHistory[] = [
      hist('2026-07-25T10:00:00Z', [
        {
          name: 'Press banca',
          sets: [
            { reps: 10, kg: 100, done: true },
            { reps: 8, kg: 102.5, done: true }
          ]
        }
      ])
    ]
    const series = exerciseSeries(h, 'press banca')
    expect(series).toHaveLength(1)
    expect(series[0].kg).toBe(102.5)
    expect(series[0].e1rm).toBeCloseTo(100 * (1 + 10 / 30))
    expect(series[0].vol).toBe(1000 + 820)
  })
})