import { isCompletedSet, volumeOf } from './logic'
import type { Exercise, SetData } from './types'

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
