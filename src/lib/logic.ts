import type { SessionHistory, SetData, Suggest } from '../lib/types'
import { normName } from '../lib/util'

export function repsLabel(d: { reps?: string }): string {
  return d.reps === 'al fallo' ? 'al fallo técnico' : `${d.reps} reps`
}

export function repRange(e: { reps?: string }): [number, number] | null {
  if (!e.reps || e.reps === 'al fallo') return null
  const m = String(e.reps).match(/(\d+)[^\d]+(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

export function suggestFor(
  e: { reps?: string; sets: SetData[] }
): Suggest | null {
  const rr = repRange(e)
  if (!rr) return null
  const done = e.sets.filter((s) => s.done && Number(s.reps) > 0)
  if (!done.length || done.length !== e.sets.length) return null
  if (done.every((s) => Number(s.reps) >= rr[1]))
    return { t: 'up', msg: '▲ Subí ~2,5 kg la próxima' }
  if (done.some((s) => Number(s.reps) < rr[0]))
    return { t: 'down', msg: '▼ Repetí o bajá la carga' }
  return { t: 'ok', msg: '✓ En rango · mantené la carga' }
}

export function lastSets(
  history: SessionHistory[],
  name: string
): SetData[] | null {
  const k = normName(name)
  for (const h of history) {
    const e = h.exercises.find((x) => normName(x.name) === k)
    if (e) return e.sets
  }
  return null
}

export function stagnant(history: SessionHistory[]): Record<string, boolean> {
  const occ: Record<string, number[]> = {}
    ;[...history].reverse().forEach((h) =>
      h.exercises.forEach((e) => {
        const k = normName(e.name)
        const score = Math.max(
          0,
          ...e.sets.map(
            (s) => (Number(s.kg) || 0) * 10 + (Number(s.reps) || 0) / 100
          )
        )
          ; (occ[k] = occ[k] || []).push(score)
      })
    )
  const out: Record<string, boolean> = {}
  for (const k in occ) {
    const a = occ[k]
    if (a.length >= 3) {
      const n = a.length
      if (a[n - 1] <= a[n - 2] && a[n - 2] <= a[n - 3]) out[k] = true
    }
  }
  return out
}

export function parseRest(rest?: string | null): number {
  if (!rest) return 0
  const nums = [
    ...String(rest).matchAll(/(\d+(?:[.,]\d+)?)\s*(s|seg|min)/gi)
  ].map((m) => {
    const v = parseFloat(m[1].replace(',', '.'))
    return /m/i.test(m[2]) ? v * 60 : v
  })
  return nums.length ? Math.round(Math.max(...nums)) : 0
}

export function focusOf(
  exs: { group: string; sets: unknown[] }[]
): string | undefined {
  const c: Record<string, number> = {}
  exs.forEach((e) => (c[e.group] = (c[e.group] || 0) + e.sets.length))
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]
}

export const isEff = (s: SetData): boolean => s.done || Number(s.reps) > 0

export function mondayOf(now: number): number {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function lastDelta(
  body: Array<{ peso?: number | null; m?: Record<string, number | null | undefined> }>,
  key: string
): number | null {
  const arr = body.filter((r) => (key === 'peso' ? r.peso != null : r.m?.[key] != null))
  if (arr.length < 2) return null
  const a = arr[arr.length - 1]
  const b = arr[arr.length - 2]
  const av = key === 'peso' ? a.peso : a.m?.[key]
  const bv = key === 'peso' ? b.peso : b.m?.[key]
  if (av == null || bv == null) return null
  return (av as number) - (bv as number)
}

export function weeklyVolume(
  history: SessionHistory[],
  now: number = Date.now()
): Record<string, { sets: number; volume: number; ex: Set<string> }> {
  const weekStart = mondayOf(now)
  const out: Record<string, { sets: number; volume: number; ex: Set<string> }> =
    {}
  history.forEach((h) => {
    if (new Date(h.ts).getTime() < weekStart) return
    h.exercises.forEach((e) => {
      const g = e.group
      if (!out[g]) out[g] = { sets: 0, volume: 0, ex: new Set<string>() }
      e.sets.forEach((s) => {
        if (isEff(s)) {
          out[g].sets++
          out[g].volume += (Number(s.reps) || 0) * (Number(s.kg) || 0)
        }
      })
      out[g].ex.add(normName(e.name))
    })
  })
  return out
}

export function allExerciseNames(
  history: SessionHistory[]
): Array<[string, { disp: string; ts: string }]> {
  const seen = new Map<string, { disp: string; ts: string }>()
  history.forEach((h) => {
    h.exercises.forEach((e) => {
      const k = normName(e.name)
      if (!seen.has(k)) seen.set(k, { disp: e.name, ts: h.ts })
    })
  })
  return [...seen.entries()].sort((a, b) => (b[1].ts < a[1].ts ? -1 : 1))
}

export function exerciseSeries(
  history: SessionHistory[],
  name: string
): Array<{ ts: string; kg: number; e1rm: number; vol: number }> {
  const k = normName(name)
  const out: Array<{ ts: string; kg: number; e1rm: number; vol: number }> = []
    ;[...history].reverse().forEach((h) => {
      const e = h.exercises.find((x) => normName(x.name) === k)
      if (!e) return
      let bestKg = 0
      let bestE = 0
      let vol = 0
      e.sets.forEach((s) => {
        const kg = Number(s.kg) || 0
        const reps = Number(s.reps) || 0
        vol += kg * reps
        if (kg > bestKg) bestKg = kg
        const e1 = kg * (1 + reps / 30) // fórmula de Epley
        if (e1 > bestE) bestE = e1
      })
      if (bestKg > 0 || vol > 0)
        out.push({ ts: h.ts, kg: bestKg, e1rm: bestE, vol })
    })
  return out
}