import { create } from 'zustand'
import { LS, load, saveL } from '../lib/storage'
import { focusOf, lastSets, suggestFor } from '../lib/logic'
import { normName, uid } from '../lib/util'

function mapBrazosByName(n: string): string {
  const k = normName(n)
  if (/curl|predicador/.test(k)) return 'biceps'
  if (/triceps|tríceps|pushdown|overhead/.test(k)) return 'triceps'
  return 'brazos'
}
import type {
  BodyRecord,
  Exercise,
  HistoryExercise,
  RoutineExercise,
  SessionHistory,
  SetData,
  WeekState
} from '../lib/types'

export type ViewId = 'hierro' | 'cuerpo' | 'progreso'

export type RoutineExerciseExt = RoutineExercise & {
  name: string
  sets: number[]
  reps?: string
  rest?: string
  note?: string
}

type SetField = 'reps' | 'kg'

interface RestoreData {
  session?: Exercise[]
  history?: SessionHistory[]
  body?: BodyRecord[]
  week?: WeekState
}

interface AppStore {
  exercises: Exercise[]
  history: SessionHistory[]
  body: BodyRecord[]
  week: WeekState
  view: ViewId
  setView: (view: ViewId, push?: boolean) => void
  addExercise: (ex: Exercise) => void
  addRoutineExerciseToSession: (
    r: RoutineExerciseExt,
    week: number,
    deload: boolean
  ) => void
  removeExerciseFromSession: (id: string) => void
  replaceExercises: (exs: Exercise[]) => void
  addSetToExercise: (id: string) => void
  removeSetFromExercise: (id: string, sid: number) => void
  setSetField: (id: string, sid: number, field: SetField, value: string) => void
  toggleSetDone: (id: string, sid: number) => void
  clearSession: () => void
  commitSession: () => void
  removeSession: (id: string) => void
  addBodyRecord: (rec: BodyRecord) => void
  removeBodyRecord: (id: string) => void
  setWeek: (n: number) => void
  setDeload: (b: boolean) => void
  wipe: () => void
  restoreAll: (data: RestoreData) => void
}

function initialView(): ViewId {
  return 'hierro'
}

const RESET_WEEK: WeekState = { week: 1, deload: false }

export const useAppStore = create<AppStore>()((set, get) => ({
  exercises: load<Exercise[]>(LS.session, []),
  history: load<SessionHistory[]>(LS.history, []),
  body: load<BodyRecord[]>(LS.body, []),
  week: load<WeekState>(LS.week, { ...RESET_WEEK }),
  view: initialView(),

  setView: (view, push = false) => {
    set({ view })
    if (typeof window !== 'undefined') document.documentElement.dataset.view = view
    if (push && typeof window !== 'undefined' && window.location.hash !== `#${view}`) {
      window.location.hash = view
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },

  addExercise: (ex) => {
    set((s) => ({ exercises: [...s.exercises, ex] }))
    saveL(LS.session, get().exercises)
  },

  addRoutineExerciseToSession: (r, week, deload) => {
    let active = r.sets.filter((w) => w <= week)
    if (deload) active = active.slice(0, Math.ceil(active.length / 2))
    const sets: SetData[] = active.map(() => ({ reps: '', kg: '', done: false }))
    const last = lastSets(get().history, r.name)
    if (last) {
      sets.forEach((s, i) => {
        if (last[i]) {
          s.reps = last[i].reps ?? ''
          s.kg = last[i].kg ?? ''
        }
      })
    }
    const g = r.g === 'brazos' ? mapBrazosByName(r.name) : r.g
    const ex: Exercise = {
      id: uid(),
      name: r.name,
      group: g,
      reps: r.reps,
      rest: r.rest,
      note: r.note,
      sets
    }
    get().addExercise(ex)
  },

  removeExerciseFromSession: (id) => {
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) }))
    saveL(LS.session, get().exercises)
  },

  replaceExercises: (exs) => {
    set({ exercises: exs })
    saveL(LS.session, exs)
  },

  addSetToExercise: (id) => {
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id ? { ...e, sets: [...e.sets, { reps: '', kg: '', done: false }] } : e
      )
    }))
    saveL(LS.session, get().exercises)
  },

  removeSetFromExercise: (id, sid) => {
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id ? { ...e, sets: e.sets.filter((_, i) => i !== sid) } : e
      )
    }))
    saveL(LS.session, get().exercises)
  },

  setSetField: (id, sid, field, value) => {
    const v: '' | number = value === '' ? '' : +value
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              sets: e.sets.map((st, i) =>
                i === sid ? { ...st, [field]: v } : st
              )
            }
          : e
      )
    }))
    saveL(LS.session, get().exercises)
  },

  toggleSetDone: (id, sid) => {
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              sets: e.sets.map((st, i) =>
                i === sid ? { ...st, done: !st.done } : st
              )
            }
          : e
      )
    }))
    saveL(LS.session, get().exercises)
  },

  clearSession: () => {
    set({ exercises: [] })
    saveL(LS.session, [])
  },

  commitSession: () => {
    const valid = get().exercises.filter((e) => e.name.trim() && e.sets.length)
    if (!valid.length) return
    const clean: HistoryExercise[] = valid.map((e) => {
      const g = e.group === 'brazos' ? mapBrazosByName(e.name) : e.group
      return {
        ...e,
        group: g,
        sets: e.sets.map((s) => ({
          reps: Number(s.reps) || 0,
          kg: Number(s.kg) || 0,
          done: !!s.done
        })),
        sug: suggestFor(e)
      }
    })
    const volume = clean.reduce(
      (a, e) => a + e.sets.reduce((x, s) => x + Number(s.reps) * Number(s.kg), 0),
      0
    )
    const focus = focusOf(clean) ?? ''
    const history: SessionHistory[] = [
      { id: uid(), ts: new Date().toISOString(), volume, focus, exercises: clean },
      ...get().history
    ]
    set({ history, exercises: [] })
    saveL(LS.history, history)
    saveL(LS.session, [])
  },

  removeSession: (id) => {
    set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
    saveL(LS.history, get().history)
  },

  addBodyRecord: (rec) => {
    const body = [...get().body, rec].sort((a, b) => a.ts.localeCompare(b.ts))
    set({ body })
    saveL(LS.body, body)
  },

  removeBodyRecord: (id) => {
    set((s) => ({ body: s.body.filter((r) => r.id !== id) }))
    saveL(LS.body, get().body)
  },

  setWeek: (n) => {
    set((s) => ({ week: { ...s.week, week: n } }))
    saveL(LS.week, get().week)
  },

  setDeload: (b) => {
    set((s) => ({ week: { ...s.week, deload: b } }))
    saveL(LS.week, get().week)
  },

  wipe: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LS.session)
      window.localStorage.removeItem(LS.history)
      window.localStorage.removeItem(LS.body)
      window.localStorage.removeItem(LS.week)
    }
    set({ exercises: [], history: [], body: [], week: { ...RESET_WEEK } })
  },

  restoreAll: (data) => {
    const session = data.session ?? []
    const history = data.history ?? []
    const body = data.body ?? []
    const week = data.week ?? { ...RESET_WEEK }
    set({ exercises: session, history, body, week })
    saveL(LS.session, session)
    saveL(LS.history, history)
    saveL(LS.body, body)
    saveL(LS.week, week)
  }
}))