import { ROUTINE } from '../data/routine'
import { allExerciseNames, isCompletedSet, volumeOf } from './logic'
import { normName } from './util'
import type { Exercise, SessionHistory, SetData } from './types'

export function formatElapsed(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

export function sessionSummary(exercises: Exercise[]): {
  done: number
  total: number
  volume: number
} {
  return exercises.reduce(
    (a, e) => ({
      done: a.done + e.sets.filter(isCompletedSet).length,
      total: a.total + e.sets.length,
      volume: a.volume + volumeOf(e.sets)
    }),
    { done: 0, total: 0, volume: 0 }
  )
}

export function nextPending(sets: SetData[], from = 0): number {
  for (let i = Math.max(0, from); i < sets.length; i++) {
    if (!sets[i].done) return i
  }
  return -1
}

export interface ExerciseSuggestion {
  name: string
  group?: string
  reps?: string
  rest?: string
  note?: string
}

export function suggestExercises(
  history: SessionHistory[],
  query: string,
  limit = 6
): ExerciseSuggestion[] {
  const q = normName(query)
  const routine: ExerciseSuggestion[] = ROUTINE.flatMap((d) =>
    d.ex.map((r) => ({
      name: r.n,
      group: r.g,
      reps: r.reps,
      rest: r.rest,
      note: r.note
    }))
  )
  const byName = new Map(routine.map((r) => [normName(r.name), r]))
  const recent: ExerciseSuggestion[] = allExerciseNames(history).map(
    ([, v]) => byName.get(normName(v.disp)) ?? { name: v.disp }
  )
  const pool = q ? [...routine, ...recent] : [...recent, ...routine]
  const seen = new Set<string>()
  const out: ExerciseSuggestion[] = []
  for (const item of pool) {
    const k = normName(item.name)
    if (seen.has(k)) continue
    if (q && !k.includes(q)) continue
    seen.add(k)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

export function stepValue(
  value: number | string | null,
  delta: number,
  min = 0
): number {
  const n = Number(value)
  const base = Number.isFinite(n) ? n : 0
  return Math.max(min, Math.round((base + delta) * 100) / 100)
}
