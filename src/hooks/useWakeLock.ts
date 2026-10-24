import { useEffect } from 'react'
import { releaseWakeLock, requestWakeLock } from '../lib/wakeLock'

export default function useWakeLock(active: boolean): void {
  useEffect(() => {
    const onVisibility = (): void => {
      if (active && document.visibilityState === 'visible') void requestWakeLock()
    }
    if (active) void requestWakeLock()
    else void releaseWakeLock()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void releaseWakeLock()
    }
  }, [active])
}
