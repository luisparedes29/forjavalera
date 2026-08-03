import { useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import type { BodyRecord } from '../../lib/types'
import { MEASURES, DELTA_UNITS } from '../../data/routine'
import { lastDelta } from '../../lib/logic'
import { fmtN, uid } from '../../lib/util'
import { toast } from '../../lib/toast'
import ChartLine from '../shared/ChartLine'

const DELTA_KEYS: Array<[string, string]> = [
  ['peso', 'Peso'],
  ['cintura', 'Cintura'],
  ['cadera', 'Cadera'],
  ['brazo', 'Brazo'],
  ['muslo', 'Muslo']
]

const loadSVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5" />
  </svg>
)

const trashSVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6" />
  </svg>
)

const num = (el: HTMLInputElement | null): number | null => {
  if (!el) return null
  const v = parseFloat(el.value)
  return Number.isNaN(v) ? null : v
}

export default function CuerpoView() {
  const body = useAppStore((s) => s.body)
  const addBodyRecord = useAppStore((s) => s.addBodyRecord)
  const removeBodyRecord = useAppStore((s) => s.removeBodyRecord)

  const pesoRef = useRef<HTMLInputElement | null>(null)
  const alturaRef = useRef<HTMLInputElement | null>(null)
  const measRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const toggle = (id: string): void => setOpen((o) => ({ ...o, [id]: !o[id] }))

  const load = (r: BodyRecord): void => {
    if (pesoRef.current) pesoRef.current.value = r.peso != null ? String(r.peso) : ''
    if (alturaRef.current) alturaRef.current.value = r.altura != null ? String(r.altura) : ''
    MEASURES.forEach(([k]) => {
      if (measRefs.current[k]) {
        measRefs.current[k].value = r.m?.[k] != null ? String(r.m[k]) : ''
      }
    })
    toast('Registro cargado en el formulario')
  }

  const save = (e: FormEvent): void => {
    e.preventDefault()
    const rec: BodyRecord = {
      id: uid(),
      ts: new Date().toISOString(),
      peso: num(pesoRef.current),
      altura: num(alturaRef.current),
      m: {}
    }
    MEASURES.forEach(([k]) => (rec.m[k] = num(measRefs.current[k])))
    if (
      rec.peso == null &&
      rec.altura == null &&
      !Object.values(rec.m).some((v) => v != null)
    ) {
      toast('Escribe al menos un valor', 'warn')
      return
    }
    addBodyRecord(rec)
    toast('Registro antropométrico guardado')
  }

  const lastW = [...body].reverse().find((r) => r.peso != null)
  const lastH = [...body].reverse().find((r) => r.altura != null)
  const delta = lastDelta(body, 'peso')
  const weights = body
    .filter((r) => r.peso != null)
    .map((r) => r.peso as number)
    .slice(-14)

  const recs = [...body].reverse()
  const deltas = DELTA_KEYS
    .map(([k, l]) => {
      const d = lastDelta(body, k)
      if (d == null) return null
      const cls = d > 0 ? 'up' : d < 0 ? 'down' : ''
      const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '='
      const unit = DELTA_UNITS[k] || ''
      return (
        <span key={k} className="delta">
          {l} <b className={cls}>{arrow} {fmtN(Math.abs(d), 1)} {unit}</b>
        </span>
      )
    })
    .filter(Boolean)

  return (
    <>
      <section className="stats stats-cuerpo">
        <div className="stat">
          <b>{lastW ? fmtN(Number(lastW.peso), 1) : '—'}</b>
          <span>kg actuales</span>
        </div>
        <div className="stat">
          <b className={delta == null ? '' : delta > 0 ? 'up' : 'down'}>
            {delta == null
              ? '—'
              : (delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '') + fmtN(Math.abs(delta), 1)}
          </b>
          <span>kg vs. anterior</span>
        </div>
        <div className="stat">
          <b>{lastH ? fmtN(Number(lastH.altura), 0) : '—'}</b>
          <span>cm de altura</span>
        </div>
        <div className="stat">
          <b>{fmtN(body.length)}</b>
          <span>registros</span>
        </div>
      </section>

      <form className="cuerpo-main" onSubmit={save}>
        <section className="panel" style={{ '--acc': 'var(--orange)' } as CSSProperties}>
          <h2>
            <span className="n">01/</span> Registro antropométrico
          </h2>
          <div className="duo">
            <div className="big-field">
              <label htmlFor="peso">Peso corporal</label>
              <div className="wrap">
                <input
                  ref={pesoRef}
                  type="number"
                  id="peso"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                />
                <em>kg</em>
              </div>
            </div>
            <div className="big-field">
              <label htmlFor="altura">Altura</label>
              <div className="wrap">
                <input
                  ref={alturaRef}
                  type="number"
                  id="altura"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                />
                <em>cm</em>
              </div>
            </div>
          </div>
          <h3 className="sub">Medidas corporales</h3>
          <div className="meas-grid" id="measGrid">
            {MEASURES.map(([k, l]) => (
              <label key={k} className="meas">
                <span>{l}</span>
                <div className="meas-in">
                  <input
                    ref={(el) => {
                      measRefs.current[k] = el
                    }}
                    type="number"
                    id={`m_${k}`}
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                  />
                  <em>cm</em>
                </div>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="btn btn-orange"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Guardar registro
          </button>
        </section>

        <section className="panel" style={{ '--acc': 'var(--orange)' } as CSSProperties}>
          <h2>
            <span className="n">02/</span> Evolución
          </h2>
          <div className="chart-box">
            <h3>
              Peso corporal
              {weights.length ? <span id="chartRange">{chartRange(weights)}</span> : null}
            </h3>
            {weights.length ? (
              <ChartLine points={weights} unit="kg" />
            ) : (
              <p className="chart-empty">
                Guarda tu peso de forma regular para ver la curva.
              </p>
            )}
          </div>
          <div
            className="deltas"
            id="deltas"
            style={deltas.length ? undefined : { display: 'none' }}
          >
            {deltas}
          </div>
          <h3 className="sub">Registros</h3>
          <div id="bodyList">
            {!recs.length ? (
              <div className="empty">
                <p>
                  Sin registros aún.
                  <br />
                  Anota tu peso y medidas para seguir tu evolución.
                </p>
              </div>
            ) : (
              recs.map((r) => {
                const medidas: Array<[string, number, string]> = []
                if (r.peso != null) medidas.push(['Peso', Number(r.peso), 'kg'])
                if (r.altura != null) medidas.push(['Altura', Number(r.altura), 'cm'])
                MEASURES.forEach(([k, l]) => {
                  if (r.m?.[k] != null) medidas.push([l, Number(r.m[k]), 'cm'])
                })
                const isOpen = !!open[r.id]
                return (
                  <div key={r.id} className={`body-rec${isOpen ? ' open' : ''}`}>
                    <div className="br-head">
                      <button
                        type="button"
                        className="br-toggle"
                        aria-expanded={isOpen}
                        onClick={() => toggle(r.id)}
                      >
                        <span className="br-date">
                          {new Date(r.ts).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </span>
                        <span className="br-main">
                          {r.peso != null ? <b>{fmtN(Number(r.peso), 1)}</b> : <span>sin peso</span>}
                          {r.peso != null ? ' kg' : ''}
                          {medidas.length ? (
                            <span>· {medidas.length} medidas</span>
                          ) : null}
                        </span>
                        <span className="chev">▾</span>
                      </button>
                      <span className="br-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Cargar en el formulario"
                          onClick={() => load(r)}
                        >
                          {loadSVG}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Eliminar registro"
                          onClick={() => {
                            removeBodyRecord(r.id)
                            toast('Registro eliminado')
                          }}
                        >
                          {trashSVG}
                        </button>
                      </span>
                    </div>
                    <div className="br-body">
                      {medidas.length ? (
                        <div className="br-meas">
                          {medidas.map(([l, v, u]) => (
                            <div key={l} className="br-m">
                              <span>{l}</span>
                              <b>{fmtN(v, 1)}</b> <em>{u}</em>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="br-empty">Sin medidas en este registro</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </form>
    </>
  )
}

function chartRange(pts: number[]): string {
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  return `${fmtN(min, 1)}–${fmtN(max, 1)} kg`
}