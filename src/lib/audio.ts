let audioCtx: AudioContext | null = null

export const ensureAudio = (): void => {
  try {
    if (typeof window === 'undefined') return
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) audioCtx = new AC()
    }
    if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume()
  } catch (e) {
    /* silencioso */
  }
}

export const beep = (): void => {
  try {
    ensureAudio()
    if (!audioCtx) return
    ;[
      [880, 0],
      [1174, 0.2]
    ].forEach(([f, d]) => {
      const o = audioCtx!.createOscillator()
      const g = audioCtx!.createGain()
      o.connect(g)
      g.connect(audioCtx!.destination)
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.16, audioCtx!.currentTime + d)
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + d + 0.55)
      o.start(audioCtx!.currentTime + d)
      o.stop(audioCtx!.currentTime + d + 0.55)
    })
  } catch (e) {
    /* silencioso */
  }
}

export const vibrate = (pattern: number[]): void => {
  try {
    if (typeof navigator !== 'undefined') navigator.vibrate?.(pattern)
  } catch (e) {
    /* silencioso */
  }
}