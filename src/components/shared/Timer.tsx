import { RING_C, useTimerStore } from '../../store/timerStore'
import useTimerSync from '../../hooks/useTimerSync'
import useWakeLock from '../../hooks/useWakeLock'

export default function Timer() {
  const running = useTimerStore((s) => s.running)
  const done = useTimerStore((s) => s.done)
  const total = useTimerStore((s) => s.total)
  const left = useTimerStore((s) => s.left)
  const paused = useTimerStore((s) => s.paused)
  const label = useTimerStore((s) => s.label)
  const add = useTimerStore((s) => s.add)
  const toggle = useTimerStore((s) => s.toggle)
  const stop = useTimerStore((s) => s.stop)

  useTimerSync()
  useWakeLock(running)

  const safe = Math.max(0, left)
  const m = Math.floor(safe / 60)
  const secs = safe % 60
  const time = done ? '¡Listo!' : `${m}:${String(secs).padStart(2, '0')}`
  const offset = RING_C * (1 - safe / (total || 1))

  return (
    <div
      id="timer"
      role="timer"
      aria-live="polite"
      className={`timer ${running || done ? 'on' : ''}${done ? ' done' : ''}`}
    >
      <svg viewBox="0 0 56 56">
        <circle className="tr-bg" cx="28" cy="28" r="24" />
        <circle
          className="tr-fg"
          id="timerRing"
          cx="28"
          cy="28"
          r="24"
          strokeDashoffset={offset}
        />
      </svg>
      <div className="t-info">
        <b id="timerTime">{time}</b>
        <span id="timerLabel">{paused ? 'pausado' : label}</span>
      </div>
      <div className="t-btns">
        <button type="button" onClick={() => add(-15)} aria-label="Restar 15 segundos">
          −15
        </button>
        <button
          id="timerPause"
          type="button"
          onClick={toggle}
          aria-label={paused ? 'Reanudar' : 'Pausar'}
        >
          {paused ? '▶' : 'II'}
        </button>
        <button
          id="timerAdd"
          type="button"
          onClick={() => add(15)}
          aria-label="Sumar 15 segundos"
        >
          +15
        </button>
        <button id="timerClose" type="button" onClick={stop} aria-label="Cerrar temporizador">
          ✕
        </button>
      </div>
    </div>
  )
}
