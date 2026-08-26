import { useEffect, useMemo, useState } from 'react'
import { GCOLORS, GROUPS, PROG_METRIC, SET_GUIDE } from '../../data/routine'
import { allExerciseNames, exerciseSeries, mondayOf, weeklyVolume } from '../../lib/logic'
import { fmtN } from '../../lib/util'
import { useAppStore } from '../../store/appStore'
import ChartLine from '../shared/ChartLine'
import AnimatedNumber from '../shared/AnimatedNumber'

type Metric = 'kg' | 'e1rm' | 'vol'

export default function ProgresoView() {
  const history = useAppStore((s) => s.history)

  const [metric, setMetric] = useState<Metric>('kg')
  const [selected, setSelected] = useState<string | null>(null)
  const [weekRange, setWeekRange] = useState<string | null>(null)
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
    const startMs = mondayOf(Date.now())
    const start = new Date(startMs)
    const end = new Date(startMs + 6 * 24 * 60 * 60 * 1000)
    setWeekRange(`semana del ${fmt.format(start)} al ${fmt.format(end)}`)
  }, [])

  const wv = useMemo(() => weeklyVolume(history), [history])

  const groups = Object.keys(SET_GUIDE)
  let totalSets = 0
  let totalVol = 0
  let inRange = 0
  groups.forEach((g) => {
    const d = wv[g]
    const sets = d ? d.sets : 0
    totalSets += sets
    totalVol += d ? d.volume : 0
    if (sets >= SET_GUIDE[g].min && sets <= SET_GUIDE[g].max) inRange++
  })

  const names = useMemo(() => allExerciseNames(history), [history])
  const keySel = selected
    ? names.some(([k]) => k === selected)
      ? selected
      : names[0]?.[0] ?? null
    : names[0]?.[0] ?? null

  const M = PROG_METRIC[metric]
  const series = useMemo(
    () => (keySel ? exerciseSeries(history, keySel) : []),
    [history, keySel]
  )
  const vals = series.map((p) => p[metric])
  const md = (v: number): string =>
    metric === 'vol' ? fmtN(Math.round(v)) : fmtN(v, 1)

  let pr: number | null = null
  let last: number | null = null
  let delta: number | null = null
  if (vals.length) {
    pr = Math.max(...vals)
    last = vals[vals.length - 1]
    delta = last - vals[0]
  }

  return (
    <>
      <section className="stats stats-progreso">
        <div className="stat">
          <AnimatedNumber value={totalSets} />
          <span>series esta semana</span>
        </div>
        <div className="stat">
          <b>
            {inRange}/{groups.length}
          </b>
          <span>grupos en rango</span>
        </div>
        <div className="stat">
          <AnimatedNumber value={names.length} />
          <span>ejercicios</span>
        </div>
        <div className="stat">
          <AnimatedNumber value={Math.round(totalVol)} />
          <span>kg esta semana</span>
        </div>
      </section>

      <div className="progreso-main">
        <section className="panel" style={{ '--acc': 'var(--teal)' }}>
          <h2>
            <span className="n">01/</span> Volumen semanal
          </h2>
          <p className="vol-legend">
            <i></i>
            <span>
              zona = objetivo recomendado · series efectivas de la semana (lun–dom)
              {weekRange ? ` · ${weekRange}` : ''}
            </span>
          </p>
          <div id="volList">
            {!history.length ? (
              <div className="empty">
                <p>
                  Guardá tus sesiones para ver el volumen por grupo muscular.
                  <br />
                  <b>El volumen semanal es la clave de la hipertrofia.</b>
                </p>
              </div>
            ) : (
              groups.map((g) => {
                const d = wv[g] || { sets: 0, volume: 0, ex: new Set<string>() }
                const guide = SET_GUIDE[g]
                const sets = d.sets
                const c = GCOLORS[g]
                let status: string
                let cls: string
                if (sets === 0) {
                  status = 'sin trabajo'
                  cls = 'none'
                } else if (sets < guide.min) {
                  status = 'bajo'
                  cls = 'low'
                } else if (sets > guide.max) {
                  status = 'alto'
                  cls = 'high'
                } else {
                  status = 'en rango'
                  cls = 'ok'
                }
                const SCALE = 24
                const zoneL = (guide.min / SCALE) * 100
                const zoneW = ((guide.max - guide.min) / SCALE) * 100
                const fillW = (Math.min(sets, SCALE) / SCALE) * 100
                return (
                  <div className="vol-row" style={{ '--gc': c }} key={g}>
                    <div className="vol-top">
                      <span className="vol-name">
                        <i style={{ background: c }}></i>
                        {GROUPS[g]}
                      </span>
                      <span className={`vol-status ${cls}`}>{status}</span>
                      <span className="vol-num">
                        <b>{sets}</b> series
                      </span>
                    </div>
                    <div className="vol-track">
                      <span
                        className="vol-zone"
                        style={{ left: `${zoneL}%`, width: `${zoneW}%` }}
                      ></span>
                      <span
                        className={`vol-fill ${cls}`}
                        style={{ width: `${fillW}%` }}
                      ></span>
                    </div>
                    <div className="vol-sub">
                      objetivo {guide.min}–{guide.max} series ·{' '}
                      {fmtN(Math.round(d.volume))} kg · {d.ex.size} ej
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="panel" style={{ '--acc': 'var(--volt)' }}>
          <h2>
            <span className="n">02/</span> Progresión por ejercicio
          </h2>
          <div className="prog-ctl">
            <select
              id="progEx"
              aria-label="Elegir ejercicio"
              disabled={!names.length}
              value={keySel ?? ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {!names.length ? (
                <option value="">Sin ejercicios aún</option>
              ) : (
                names.map(([k, o]) => (
                  <option key={k} value={k}>
                    {o.disp}
                  </option>
                ))
              )}
            </select>
            <div className="seg" id="progSeg">
              {(['kg', 'e1rm', 'vol'] as Metric[]).map((m) => (
                <button
                  key={m}
                  data-m={m}
                  className={metric === m ? 'on' : ''}
                  onClick={() => setMetric(m)}
                >
                  {m === 'kg' ? 'Kg' : m === 'e1rm' ? 'e1RM' : 'Vol'}
                </button>
              ))}
            </div>
          </div>
          <div className="prog-stats">
            <div className="prog-stat">
              <span>PR</span>
              <b id="progPr">{pr != null ? md(pr) : '—'}</b>
            </div>
            <div className="prog-stat">
              <span>Última</span>
              <b id="progLast">{last != null ? md(last) : '—'}</b>
            </div>
            <div className="prog-stat">
              <span>Cambio</span>
              <b
                id="progDelta"
                className={`prog-delta ${
                  delta === null
                    ? ''
                    : delta > 0
                      ? 'up'
                      : delta < 0
                        ? 'down'
                        : ''
                }`}
              >
                {delta === null
                  ? '—'
                  : `${delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '= '}${md(Math.abs(delta))}`}
              </b>
            </div>
            <div className="prog-stat">
              <span>Sesiones</span>
              <b>{series.length}</b>
            </div>
          </div>
          <div className="chart-box">
            <h3>
              {M.lab}{' '}
              <span id="progRange">
                {vals.length
                  ? `${md(Math.min(...vals))}–${md(Math.max(...vals))} ${M.unit}`
                  : ''}
              </span>
            </h3>
            {vals.length ? (
              <ChartLine points={vals} height={150} unit={M.unit} />
            ) : (
              <p className="chart-empty" id="progEmpty">
                Guardá sesiones con este ejercicio para ver su progresión.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}