import { create } from 'zustand'
import { beep, vibrate } from '../lib/audio'

export const RING_C = 2 * Math.PI * 24

interface TimerStore {
  running: boolean
  done: boolean
  total: number
  left: number
  paused: boolean
  label: string
  start: (sec: number, label: string) => void
  finish: () => void
  toggle: () => void
  add15: () => void
  stop: () => void
}

let iv: ReturnType<typeof setInterval> | null = null

export const useTimerStore = create<TimerStore>()((set, get) => ({
  running: false,
  done: false,
  total: 0,
  left: 0,
  paused: false,
  label: 'descanso',

  start: (sec, label) => {
    if (!sec) return
    get().stop()
    set({ total: sec, left: sec, paused: false, label, running: true })
    iv = setInterval(() => {
      if (get().paused) return
      set((s) => ({ left: s.left - 1 }))
      if (get().left <= 0) get().finish()
    }, 1000)
  },

  finish: () => {
    if (iv) clearInterval(iv)
    iv = null
    set({ running: false, done: true })
    beep()
    vibrate([120, 60, 120, 60, 200])
  },

  toggle: () => {
    if (!get().running) return
    set((s) => ({ paused: !s.paused }))
  },

  add15: () => {
    set((s) => ({
      left: s.left + 15,
      total: Math.max(s.total, s.left + 15),
      done: false
    }))
    if (!get().running) {
      set({ running: true })
      iv = setInterval(() => {
        if (get().paused) return
        set((s) => ({ left: s.left - 1 }))
        if (get().left <= 0) get().finish()
      }, 1000)
    }
  },

  stop: () => {
    if (iv) clearInterval(iv)
    iv = null
    set({ running: false, done: false })
  }
}))