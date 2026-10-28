import { ROUTINE } from '../data/routine'
import type { SessionHistory } from './types'
import { normName } from './util'

export function isWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function lastTrainedDayIdx(history: SessionHistory[]): number | null {
  const last = history[0]
  if (!last) return null
  const names = new Set(last.exercises.map((e) => normName(e.name)))
  let best = -1
  let bestCount = 0
  ROUTINE.forEach((d, i) => {
    const count = d.ex.filter((r) => names.has(normName(r.n))).length
    if (count > bestCount) {
      bestCount = count
      best = i
    }
  })
  return best >= 0 && bestCount > 0 ? best : null
}
