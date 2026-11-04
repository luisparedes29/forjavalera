import { useEffect, useMemo, useState } from 'react'
import useSaveSession from '../../hooks/useSaveSession'
import { formatElapsed, sessionSummary } from '../../lib/session'
import { fmtN } from '../../lib/util'
import { useAppStore } from '../../store/appStore'
import { useTimerStore } from '../../store/timerStore'

export default function SessionHeader() {
  const exercises = useAppStore((s) => s.exercises)
  const startedAt = useAppStore((s) => s.sessionStartedAt)
  const [now, setNow] = useState<number | null>(null)
  const save = useSaveSession()
  const hasExercises = exercises.length > 0

  useEffect(() => {
    if (!hasExercises) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [hasExercises])

  const summary = useMemo(() => sessionSummary(exercises), [exercises])

  if (!hasExercises) return null

  return (
    <section className="session-header" aria-label="Resumen de la sesión">
      <div className="sh-stats">
        <span>
          <b>
            {summary.done}/{summary.total}
          </b>{' '}
          series
        </span>
        <span>
          <b>{fmtN(Math.round(summary.volume))}</b> kg
        </span>
        <span>
          <b>{startedAt && now ? formatElapsed(now - startedAt) : '—'}</b>
        </span>
      </div>
      <button
        type="button"
        className="btn btn-ghost sh-timer"
        onClick={() => useTimerStore.getState().setOpenPanel(true)}
      >
        ⏱ Descanso
      </button>
      <button type="button" className="btn btn-volt sh-save" onClick={save}>
        Guardar
      </button>
    </section>
  )
}
