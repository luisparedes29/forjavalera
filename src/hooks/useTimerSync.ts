import { useEffect } from 'react'
import { useTimerStore } from '../store/timerStore'

export default function useTimerSync(): void {
  useEffect(() => {
    const sync = (): void => useTimerStore.getState().sync()
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pageshow', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])
}
