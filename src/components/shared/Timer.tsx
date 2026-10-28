import { useMemo } from 'react'
import useTimerSync from '../../hooks/useTimerSync'
import useWakeLock from '../../hooks/useWakeLock'
import { nextPending } from '../../lib/session'
import { fmtN } from '../../lib/util'
import { RING_C, useTimerStore } from '../../store/timerStore'
import { useAppStore } from '../../store/appStore'

const PRESETS = [60, 90, 120, 180]

export default function Timer() {
  const running = useTimerStore((s) => s.running)
  const done = useTimerStore((s) => s.done)
  const total = useTimerStore((s) => s.total)
  const left = useTimerStore((s) => s.left)
  const paused = useTimerStore((s) => s.paused)
  const label = useTimerStore((s) => s.label)
  const openPanel = useTimerStore((s) => s.openPanel)
  const setOpenPanel = useTimerStore((s) => s.setOpenPanel)
  const add = useTimerStore((s) => s.add)
  const start = useTimerStore((s) => s.start)
  const toggle = useTimerStore((s) => s.toggle)
  const stop = useTimerStore((s) => s.stop)
  const exercises = useAppStore((s) => s.exercises)

  useTimerSync()
  useWakeLock(running)

  const next = useMemo(() => {
    for (const e of exercises) {
      const i = nextPending(e.sets)
      if (i >= 0) {
        const s = e.sets[i]
        const kg =
          s.kg !== '' && s.kg != null ? ` · ${fmtN(Number(s.kg), 1)} kg` : ''
        const reps = e.reps ? ` × ${e.reps}` : ''
        return `${e.name} · S${i + 1}${kg}${reps}`
      }
    }
    return null
  }, [exercises])

  const safe = Math.max(0, left)
  const m = Math.floor(safe / 60)
  const secs = safe % 60
  const time = done ? '¡Listo!' : `${m}:${String(secs).padStart(2, '0')}`
  const offset = RING_C * (1 - safe / (total || 1))
  const visible = running || done || openPanel

  return (
    <div
      id="timer"
      role="timer"
      aria-live="polite"
      className={`timer${visible ? ' on' : ''}${done ? ' done' : ''}`}
    >
      {!running && !done ? (
        <div className="t-presets">
          <div className="t-presets-head">
            <b>Descanso</b>
            <button
              type="button"
              onClick={() => setOpenPanel(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="t-preset-grid">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => start(p, 'descanso manual')}
              >
                {p < 120 ? `${p} s` : `${p / 60} min`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
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
            {next ? <span className="t-next">Siguiente: {next}</span> : null}
          </div>
          <div className="t-btns">
            <button
              type="button"
              onClick={() => add(-15)}
              aria-label="Restar 15 segundos"
            >
              −15
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={paused ? 'Reanudar' : 'Pausar'}
            >
              {paused ? '▶' : 'II'}
            </button>
            <button
              type="button"
              onClick={() => add(15)}
              aria-label="Sumar 15 segundos"
            >
              +15
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Cerrar temporizador"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}
