import { useCallback } from 'react'
import { GROUPS } from '../data/routine'
import { toast } from '../lib/toast'
import { useAppStore } from '../store/appStore'

export default function useSaveSession(): () => boolean {
  return useCallback((): boolean => {
    const s = useAppStore.getState()
    const valid = s.exercises.filter((e) => e.name.trim() && e.sets.length)
    if (!valid.length) {
      toast('Añade al menos un ejercicio con una serie', 'warn')
      return false
    }
    s.commitSession()
    const focus = useAppStore.getState().history[0]?.focus
    toast(`Sesión guardada · enfoque: ${GROUPS[focus ?? ''] || 'general'} 💪`)
    return true
  }, [])
}
