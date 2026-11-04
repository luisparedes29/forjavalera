import { create } from 'zustand'
import { LS, load, removeL, saveL } from '../lib/storage'
import { focusOf, lastSets, suggestFor, volumeOf } from '../lib/logic'
import { normName, uid } from '../lib/util'
import type {
  BodyRecord,
  Exercise,
  HistoryExercise,
  RoutineExercise,
  SessionHistory,
  SetData,
  WeekState
} from '../lib/types'

function mapBrazosByName(n: string): string {
  const k = normName(n)
  if (/curl|predicador/.test(k)) return 'biceps'
  if (/triceps|pushdown|overhead/.test(k)) return 'triceps'
  return 'brazos'
}

export type ViewId = 'registrar' | 'plan' | 'cuerpo' | 'progreso'

export type ProgresoSub = 'resumen' | 'historial'

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
  progresoSub: ProgresoSub
  sessionStartedAt: number | null
  setView: (view: ViewId, push?: boolean) => void
  setProgresoSub: (sub: ProgresoSub, push?: boolean) => void
  startSession: () => void
  restoreSessionStart: (ts: number | null) => void
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
  setSetRir: (id: string, sid: number, rir: number | null) => void
  toggleSetDone: (id: string, sid: number) => void
  clearSession: () => void
  commitSession: () => void
  removeSession: (id: string) => void
  replaceHistory: (history: SessionHistory[]) => void
  addBodyRecord: (rec: BodyRecord) => void
  removeBodyRecord: (id: string) => void
  replaceBody: (body: BodyRecord[]) => void
  setWeek: (n: number) => void
  setDeload: (b: boolean) => void
  wipe: () => void
  restoreAll: (data: RestoreData) => void
}

function initialView(): ViewId {
  return 'registrar'
}

const RESET_WEEK: WeekState = { week: 1, deload: false }

const savedExercises = load<Exercise[]>(LS.session, [])

const savedSessionStart = (): number | null => {
  if (!savedExercises.length) {
    removeL(LS.sessionStart)
    return null
  }
  return load<number | null>(LS.sessionStart, null)
}

export const useAppStore = create<AppStore>()((set, get) => ({
  exercises: savedExercises,
  history: load<SessionHistory[]>(LS.history, []),
  body: load<BodyRecord[]>(LS.body, []),
  week: load<WeekState>(LS.week, { ...RESET_WEEK }),
  view: initialView(),
  progresoSub: 'resumen',
  sessionStartedAt: savedSessionStart(),

  setView: (view, push = false) => {
    set({ view })
    if (typeof window !== 'undefined') document.documentElement.dataset.view = view
    if (push && typeof window !== 'undefined' && window.location.hash !== `#${view}`) {
      window.location.hash = view
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },

  setProgresoSub: (progresoSub, push = false) => {
    set({ progresoSub })
    if (push && typeof window !== 'undefined') {
      const hash = progresoSub === 'historial' ? 'historial' : 'progreso'
      if (window.location.hash !== `#${hash}`) window.location.hash = hash
      else window.scrollTo({ top: 0 })
    }
  },

  startSession: () => {
    if (get().sessionStartedAt) return
    const ts = Date.now()
    set({ sessionStartedAt: ts })
    saveL(LS.sessionStart, ts)
  },

  restoreSessionStart: (ts) => {
    set({ sessionStartedAt: ts })
    if (ts) saveL(LS.sessionStart, ts)
    else removeL(LS.sessionStart)
  },

  addExercise: (ex) => {
    get().startSession()
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
    const exercises = get().exercises.filter((e) => e.id !== id)
    set({ exercises })
    saveL(LS.session, exercises)
    if (!exercises.length) {
      set({ sessionStartedAt: null })
      removeL(LS.sessionStart)
    }
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
    const exercises = get().exercises.map((e) =>
      e.id === id ? { ...e, sets: e.sets.filter((_, i) => i !== sid) } : e
    )
    set({ exercises })
    saveL(LS.session, exercises)
    if (!exercises.some((e) => e.sets.length)) {
      set({ sessionStartedAt: null })
      removeL(LS.sessionStart)
    }
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

  setSetRir: (id, sid, rir) => {
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              sets: e.sets.map((st, i) => (i === sid ? { ...st, rir } : st))
            }
          : e
      )
    }))
    saveL(LS.session, get().exercises)
  },

  toggleSetDone: (id, sid) => {
    const target = get()
      .exercises.find((e) => e.id === id)
      ?.sets[sid]
    if (target && !target.done) get().startSession()
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
    set({ exercises: [], sessionStartedAt: null })
    saveL(LS.session, [])
    removeL(LS.sessionStart)
  },

  commitSession: () => {
    const valid = get().exercises.filter((e) => e.name.trim() && e.sets.length)
    if (!valid.length) return
    const clean: HistoryExercise[] = valid.map((e) => {
      const g = e.group === 'brazos' ? mapBrazosByName(e.name) : e.group
      return {
        ...e,
        group: g,
        sets: e.sets.map((s) => {
          const out: SetData = {
            reps: Number(s.reps) || 0,
            kg: Number(s.kg) || 0,
            done: !!s.done
          }
          if (typeof s.rir === 'number') out.rir = s.rir
          return out
        }),
        sug: suggestFor(e)
      }
    })
    const volume = clean.reduce((a, e) => a + volumeOf(e.sets), 0)
    const focus = focusOf(clean) ?? ''
    const history: SessionHistory[] = [
      { id: uid(), ts: new Date().toISOString(), volume, focus, exercises: clean },
      ...get().history
    ]
    set({ history, exercises: [], sessionStartedAt: null })
    saveL(LS.history, history)
    saveL(LS.session, [])
    removeL(LS.sessionStart)
  },

  removeSession: (id) => {
    set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
    saveL(LS.history, get().history)
  },

  replaceHistory: (history) => {
    set({ history })
    saveL(LS.history, history)
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

  replaceBody: (body) => {
    set({ body })
    saveL(LS.body, body)
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
    removeL(LS.sessionStart)
    set({
      exercises: [],
      history: [],
      body: [],
      week: { ...RESET_WEEK },
      sessionStartedAt: null
    })
  },

  restoreAll: (data) => {
    const session = data.session ?? []
    const history = data.history ?? []
    const body = data.body ?? []
    const week = data.week ?? { ...RESET_WEEK }
    removeL(LS.sessionStart)
    set({ exercises: session, history, body, week, sessionStartedAt: null })
    saveL(LS.session, session)
    saveL(LS.history, history)
    saveL(LS.body, body)
    saveL(LS.week, week)
  }
}))