import type { ProgresoSub, ViewId } from '../store/appStore'

const VALID: readonly ViewId[] = ['registrar', 'plan', 'cuerpo', 'progreso']
const ALIAS: Record<string, ViewId> = { hierro: 'registrar', historial: 'progreso' }

function hashOf(hash?: string): string {
  return (hash ?? (typeof window !== 'undefined' ? window.location.hash : '')).slice(1)
}

export function viewFromHash(hash?: string): ViewId {
  const h = hashOf(hash)
  if (Object.prototype.hasOwnProperty.call(ALIAS, h)) return ALIAS[h]
  return (VALID as readonly string[]).includes(h) ? (h as ViewId) : 'registrar'
}

export function progresoSubFromHash(hash?: string): ProgresoSub {
  return hashOf(hash) === 'historial' ? 'historial' : 'resumen'
}
