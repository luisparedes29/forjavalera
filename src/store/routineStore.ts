import { create } from 'zustand'

export function initialDayIdx(): number {
  const wd = (new Date().getDay() + 6) % 7
  return wd < 5 ? wd : 0
}

interface RoutineUIStore {
  dayIdx: number
  setDayIdx: (i: number) => void
}

export const useRoutineStore = create<RoutineUIStore>()((set) => ({
  dayIdx: initialDayIdx(),
  setDayIdx: (i) => set({ dayIdx: i })
}))