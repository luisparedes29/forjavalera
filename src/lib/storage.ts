export const LS = {
  session: 'forja_session',
  sessionStart: 'forja_session_start',
  history: 'forja_history',
  body: 'forja_body',
  week: 'forja_week'
} as const

export const removeL = (k: string): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(k)
}

export const load = <T>(k: string, fb: T): T => {
  if (typeof window === 'undefined') return fb
  try {
    return (JSON.parse(window.localStorage.getItem(k) as string) as T) ?? fb
  } catch (e) {
    return fb
  }
}

export const saveL = (k: string, v: unknown): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(k, JSON.stringify(v))
}