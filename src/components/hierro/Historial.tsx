import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../store/appStore'
import type { SessionHistory } from '../../lib/types'
import { GCOLORS, GROUPS } from '../../data/routine'
import { fmtN } from '../../lib/util'
import { isCompletedSet, volumeOf } from '../../lib/logic'
import { formatDate, formatWeekday } from '../../lib/date'
import { toast } from '../../lib/toast'

export default function Historial() {
  const history = useAppStore((s) => s.history)
  const removeSession = useAppStore((s) => s.removeSession)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const toggle = (id: string): void => setOpen((o) => ({ ...o, [id]: !o[id] }))

  if (!history.length) {
    return (
      <div id="historyList">
        <div className="empty">
          <p>
            Aquí se acumulan tus sesiones guardadas.
            <br />
            <b>El hierro no miente.</b>
          </p>
        </div>
      </div>
    )
  }

  const totalsOf = (h: SessionHistory): { done: number; total: number; volume: number } =>
    h.exercises.reduce(
      (a, e) => ({
        done: a.done + e.sets.filter(isCompletedSet).length,
        total: a.total + e.sets.length,
        volume: a.volume + volumeOf(e.sets)
      }),
      { done: 0, total: 0, volume: 0 }
    )

  return (
    <div id="historyList">
      {history.map((h) => {
        const d = new Date(h.ts)
        const weekday = formatWeekday(d)
        const date = formatDate(d, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
        const gc = GCOLORS[h.focus] ?? '#8ba0a8'
        const totals = totalsOf(h)
        const isOpen = !!open[h.id]
        return (
          <article className={`hist-item${isOpen ? ' open' : ''}`} key={h.id}>
            <button
              className="hist-head"
              aria-expanded={isOpen}
              onClick={() => toggle(h.id)}
            >
              <span className="hist-date">
                <b>{weekday}</b>
                {date}
              </span>
              <span className="tag" style={{ '--gc': gc } as CSSProperties}>
                {GROUPS[h.focus] || 'General'}
              </span>
              <span className="hist-meta">
                {h.exercises.length} ej · {totals.done}/{totals.total} series ·{' '}
                <b>{fmtN(Math.round(totals.volume))} kg</b>
              </span>
              <span className="chev">▸</span>
            </button>
            <div className="hist-body">
                {h.exercises.map((e, i) => (
                  <div className="hist-ex" key={i}>
                    <span>
                      {e.name}
                      {e.sug ? (
                        <em className={`sug sug-${e.sug.t}`}>{e.sug.msg}</em>
                      ) : null}
                    </span>
                    <span className="muted">
                      {e.sets
                        .map(
                          (s) =>
                            `${s.reps}×${fmtN(Number(s.kg) || 0, 1)}${
                              s.done ? '✔' : ''
                            }`
                        )
                        .join(' · ')}
                    </span>
                  </div>
                ))}
                <button
                  className="del-hist"
                  onClick={() => {
                    removeSession(h.id)
                    toast('Sesión eliminada')
                  }}
                >
                  Eliminar sesión
                </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}