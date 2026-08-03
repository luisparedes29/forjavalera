import { RING_C, useTimerStore } from '../../store/timerStore'

export default function Timer() {
  const running = useTimerStore((s) => s.running)
  const done = useTimerStore((s) => s.done)
  const total = useTimerStore((s) => s.total)
  const left = useTimerStore((s) => s.left)
  const paused = useTimerStore((s) => s.paused)
  const label = useTimerStore((s) => s.label)
  const add15 = useTimerStore((s) => s.add15)
  const toggle = useTimerStore((s) => s.toggle)
  const stop = useTimerStore((s) => s.stop)

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
        <span id="timerLabel">{label}</span>
      </div>
      <div className="t-btns">
        <button id="timerAdd" onClick={add15}>
          +15 s
        </button>
        <button id="timerPause" title="Pausar / reanudar" onClick={toggle}>
          {paused ? '▶' : '❚❚'}
        </button>
        <button id="timerClose" title="Cerrar" onClick={stop}>
          ✕
        </button>
      </div>
    </div>
  )
}