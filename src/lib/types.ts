export interface SetData {
  reps: number | string | null
  kg: number | string | null
  done: boolean
}

export interface Exercise {
  id: string
  name: string
  group: string
  reps?: string
  rest?: string
  note?: string
  sets: SetData[]
}

export interface HistoryExercise extends Exercise {
  sug?: Suggest | null
}

export type SuggestKind = 'up' | 'down' | 'ok'

export interface Suggest {
  t: SuggestKind
  msg: string
}

export interface SessionHistory {
  id: string
  ts: string
  volume: number
  focus: string
  exercises: HistoryExercise[]
}

export interface BodyRecord {
  id: string
  ts: string
  peso?: number | null
  altura?: number | null
  m: Record<string, number | null | undefined>
}

export interface WeekState {
  week: number
  deload: boolean
}

export interface RoutineExercise {
  n: string
  g: string
  reps: string
  rest: string
  sets: number[]
  note: string
}

export interface RoutineDay {
  id: string
  day: string
  short: string
  title: string
  focus: string
  side: string
  ex: RoutineExercise[]
}

export interface WeeklyVolumeEntry {
  sets: number
  volume: number
  ex: Set<string>
}