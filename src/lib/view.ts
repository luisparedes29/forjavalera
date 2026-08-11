import type { ViewId } from '../store/appStore'

const VALID: readonly string[] = ['cuerpo', 'progreso']

export function viewFromHash(hash?: string): ViewId {
  const h = (hash ?? (typeof window !== 'undefined' ? window.location.hash : '')).slice(1)
  return (VALID.includes(h) ? h : 'hierro') as ViewId
}