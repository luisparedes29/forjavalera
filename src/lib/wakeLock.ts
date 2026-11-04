interface WakeLockLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

type WakeLockNavigator = {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> }
}

let sentinel: WakeLockLike | null = null

export async function requestWakeLock(): Promise<void> {
  try {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
    const wl = (navigator as unknown as WakeLockNavigator).wakeLock
    if (!wl) return
    if (sentinel && !sentinel.released) return
    sentinel = await wl.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await sentinel?.release()
  } catch {
    sentinel = null
  } finally {
    sentinel = null
  }
}
