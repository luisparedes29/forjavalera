import type { ViewId } from '../store/appStore'

const VALID: readonly ViewId[] = ['registrar', 'plan', 'cuerpo', 'progreso']
const ALIAS: Record<string, ViewId> = { hierro: 'registrar' }

export function viewFromHash(hash?: string): ViewId {
  const h = (hash ?? (typeof window !== 'undefined' ? window.location.hash : '')).slice(1)
  if (Object.prototype.hasOwnProperty.call(ALIAS, h)) return ALIAS[h]
  return (VALID as readonly string[]).includes(h) ? (h as ViewId) : 'registrar'
}
