import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../store/appStore'
import type { SessionHistory } from '../../lib/types'
import { GCOLORS, GROUPS } from '../../data/routine'
import { fmtN } from '../../lib/util'
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

  const setsOf = (h: SessionHistory): number =>
    h.exercises.reduce((a, e) => a + e.sets.length, 0)

  return (
    <div id="historyList">
      {history.map((h) => {
        const d = new Date(h.ts)
        const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' })
        const date = d.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
        const gc = GCOLORS[h.focus] ?? '#8ba0a8'
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
                {h.exercises.length} ej · {setsOf(h)} series ·{' '}
                <b>{fmtN(Math.round(h.volume))} kg</b>
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