export const LS = {
  session: 'forja_session',
  history: 'forja_history',
  body: 'forja_body',
  week: 'forja_week'
} as const

export const load = <T>(k: string, fb: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(k) as string) as T) ?? fb
  } catch (e) {
    return fb
  }
}

export const saveL = (k: string, v: unknown): void =>
  localStorage.setItem(k, JSON.stringify(v))