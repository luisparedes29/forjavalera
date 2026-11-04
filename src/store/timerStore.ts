import { create } from 'zustand'
import { beep, vibrate } from '../lib/audio'
import { remainingAt } from '../lib/timer'

export const RING_C = 2 * Math.PI * 24

interface TimerStore {
  running: boolean
  done: boolean
  total: number
  left: number
  paused: boolean
  label: string
  endsAt: number | null
  openPanel: boolean
  setOpenPanel: (open: boolean) => void
  start: (sec: number, label: string) => void
  finish: () => void
  toggle: () => void
  add: (sec: number) => void
  sync: () => void
  stop: () => void
}

let iv: ReturnType<typeof setInterval> | null = null

const clearTicker = (): void => {
  if (iv) clearInterval(iv)
  iv = null
}

const ensureTicker = (): void => {
  clearTicker()
  iv = setInterval(() => useTimerStore.getState().sync(), 250)
}

export const useTimerStore = create<TimerStore>()((set, get) => ({
  running: false,
  done: false,
  total: 0,
  left: 0,
  paused: false,
  label: 'descanso',
  endsAt: null,
  openPanel: false,

  setOpenPanel: (open) =>
    set((s) => ({ openPanel: open, done: open ? false : s.done })),

  start: (sec, label) => {
    if (!sec) return
    get().stop()
    set({
      total: sec,
      left: sec,
      paused: false,
      done: false,
      label,
      running: true,
      endsAt: Date.now() + sec * 1000,
      openPanel: false
    })
    ensureTicker()
  },

  sync: () => {
    const s = get()
    if (!s.running || s.paused || s.done || s.endsAt === null) return
    const left = remainingAt(s.endsAt, Date.now())
    if (left <= 0) {
      get().finish()
      return
    }
    if (left !== s.left) set({ left })
  },

  finish: () => {
    const s = get()
    if (!s.running && !s.done && s.endsAt === null) return
    clearTicker()
    if (!s.done) {
      set({ running: false, done: true, left: 0, endsAt: null, paused: false })
      beep()
      vibrate([120, 60, 120, 60, 200])
    }
  },

  toggle: () => {
    const s = get()
    if (!s.running) return
    if (s.paused) {
      set({ paused: false, endsAt: Date.now() + s.left * 1000 })
      return
    }
    const left = s.endsAt ? remainingAt(s.endsAt, Date.now()) : s.left
    set({ paused: true, left, endsAt: null })
  },

  add: (sec) => {
    const s = get()
    const baseLeft = s.running && !s.done ? s.left : 0
    const baseTotal = s.running && !s.done ? s.total : 0
    const next = Math.max(1, baseLeft + sec)
    set({
      left: next,
      total: Math.max(baseTotal, next),
      done: false,
      paused: false,
      running: true,
      endsAt: Date.now() + next * 1000
    })
    ensureTicker()
  },

  stop: () => {
    clearTicker()
    set({
      running: false,
      done: false,
      paused: false,
      endsAt: null,
      openPanel: false
    })
  }
}))
