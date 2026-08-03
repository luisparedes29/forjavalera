import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../store/appStore'
import { useRoutineStore } from '../../store/routineStore'
import type { Exercise, RoutineExercise, SetData } from '../../lib/types'
import { GROUPS, GCOLORS, ROUTINE } from '../../data/routine'
import { lastSets, repsLabel, stagnant } from '../../lib/logic'
import { normName, uid } from '../../lib/util'
import { toast } from '../../lib/toast'

export default function Rutina() {
  const week = useAppStore((s) => s.week)
  const history = useAppStore((s) => s.history)
  const exercises = useAppStore((s) => s.exercises)
  const replaceExercises = useAppStore((s) => s.replaceExercises)
  const setWeek = useAppStore((s) => s.setWeek)
  const setDeload = useAppStore((s) => s.setDeload)
  const addRoutineExerciseToSession = useAppStore(
    (s) => s.addRoutineExerciseToSession
  )

  const dayIdx = useRoutineStore((s) => s.dayIdx)
  const setDayIdx = useRoutineStore((s) => s.setDayIdx)

  const day = ROUTINE[dayIdx]
  const wk = week.week
  const deload = week.deload

  const activeSets = (d: RoutineExercise): number[] => {
    let a = d.sets.filter((w) => w <= wk)
    if (deload) a = a.slice(0, Math.ceil(a.length / 2))
    return a
  }

  const stallMap = useMemo(() => stagnant(history), [history])

  const stallList = useMemo(() => {
    const names = new Set<string>()
    ROUTINE.forEach((rd) =>
      rd.ex.forEach((d) => {
        if (stallMap[normName(d.n)]) names.add(d.n)
      })
    )
    return [...names]
  }, [stallMap])

  const total = day.ex.reduce((a, d) => a + activeSets(d).length, 0)

  const loadDay = (): void => {
    if (
      exercises.length &&
      !confirm(
        'Esto reemplaza la sesión actual por el día seleccionado. ¿Continuar?'
      )
    )
      return
    const buildOne = (d: RoutineExercise): Exercise => {
      const last = lastSets(history, d.n)
      const sets: SetData[] = activeSets(d).map((_, i) => ({
        reps: last?.[i]?.reps ?? '',
        kg: last?.[i]?.kg ?? '',
        done: false
      }))
      return {
        id: uid(),
        name: d.n,
        group: d.g,
        reps: d.reps,
        rest: d.rest,
        note: d.note,
        sets
      }
    }
    replaceExercises(day.ex.map((d) => buildOne(d)))
    const had = day.ex.some((d) => lastSets(history, d.n))
    toast(`${day.day} cargado${had ? ' · con tus últimas cargas' : ' 💪'}`)
    if (typeof document !== 'undefined') {
      try {
        document
          .getElementById('sessionPanel')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {
        /* noop */
      }
    }
  }

  return (
    <section
      className="panel reveal d1"
      style={{ '--acc': 'var(--blue)' } as CSSProperties}
    >
      <h2>
        <span className="n">01/</span> Rutina · Bloque actual
        <span className="rir">RIR objetivo 1–2</span>
      </h2>
      <div className="routine-bar">
        <div className="day-tabs" id="dayTabs">
          {ROUTINE.map((d, i) => (
            <button
              key={d.id}
              className={`day-tab${i === dayIdx ? ' active' : ''}`}
              style={{ '--dc': d.side } as CSSProperties}
              onClick={() => setDayIdx(i)}
            >
              <b>{d.short}</b>
              <span>{d.title.replace('Tren ', '')}</span>
            </button>
          ))}
        </div>
        <div className="week-ctl">
          <span
            className={`badge-deload${deload ? '' : ' hide'}`}
            id="deloadBadge"
          >
            DELOAD · ~50% volumen
          </span>
          <div className="wk">
            <span className="wk-label">Semana</span>
            <button
              id="wkMinus"
              aria-label="Semana anterior"
              disabled={wk <= 1}
              onClick={() => setWeek(Math.max(1, wk - 1))}
            >
              −
            </button>
            <b id="wkNum">{wk}</b>
            <button
              id="wkPlus"
              aria-label="Semana siguiente"
              disabled={wk >= 6}
              onClick={() => setWeek(Math.min(6, wk + 1))}
            >
              +
            </button>
            <span className={`pips${deload ? ' deload' : ''}`} id="pips">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <i key={i} className={i <= wk ? 'on' : ''} />
              ))}
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              id="deload"
              checked={deload}
              onChange={(e) => {
                setDeload(e.target.checked)
                toast(
                  e.target.checked
                    ? 'DELOAD activo: se cargan ~50% de series'
                    : 'DELOAD desactivado'
                )
              }}
            />
            <span className="sw-track" />
            <span className="sw-label">DELOAD</span>
          </label>
        </div>
      </div>
      <div className={`stall-banner${stallList.length ? '' : ' hide'}`} id="stallBanner">
        <b>⚠ Estancamiento:</b>
        <span id="stallList">
          {stallList.map((n, i) => (
            <span key={n}>
              {i > 0 ? ', ' : ''}
              <b>{n}</b>
            </span>
          ))}
        </span>
        {'\u00A0'}llevás 2+ sesiones sin progresar. Según tu bloque:{' '}
        <b>toca deload</b> o revisar sueño/nutrición.
        <button
          className="btn-mini"
          id="stallDeload"
          onClick={() => {
            setDeload(true)
            toast('DELOAD activado — descargá y volvé más fuerte')
          }}
        >
          Activar DELOAD
        </button>
      </div>
      <div className="day-title" id="dayTitle">
        <b>{day.day}</b> {day.title} ·{' '}
        <span style={{ color: day.side }}>{day.focus}</span>
        {deload ? <span className="badge-deload">DELOAD</span> : null}
      </div>
      <div id="rtList">
        {day.ex.map((d, i) => {
          const c = GCOLORS[d.g] || '#8ba0a8'
          const act = activeSets(d)
          const locked = d.sets.find((w) => w > wk)
          const isStall = !!stallMap[normName(d.n)]
          return (
            <div
              className="rt-row"
              key={`${d.n}-${i}`}
              style={{ '--gc': c } as CSSProperties}
            >
              <span className="rt-idx">{i + 1}</span>
              <div className="rt-info">
                <b>{d.n}</b>
                {d.note ? <i>▸ {d.note}</i> : null}
                {isStall ? (
                  <i className="stall-i">
                    ⚠ 2+ sesiones sin progreso — revisá deload
                  </i>
                ) : null}
              </div>
              <span className="tag" style={{ '--gc': c } as CSSProperties}>
                {GROUPS[d.g]}
              </span>
              <span className="rt-meta">
                {repsLabel(d)} · ⏱ {d.rest}
              </span>
              <span className="rt-sets">
                <b>{act.length}</b> series
                {locked ? (
                  <i>
                    S{d.sets.indexOf(locked) + 1} desde sem {locked}
                  </i>
                ) : null}
              </span>
              <button
                className="rt-add"
                onClick={() => {
                  addRoutineExerciseToSession(
                    { ...d, name: d.n, reps: d.reps, rest: d.rest, note: d.note },
                    week.week,
                    week.deload
                  )
                  toast(`"${d.n}" añadido a la sesión`)
                }}
              >
                + sesión
              </button>
            </div>
          )
        })}
      </div>
      <div className="routine-actions">
        <button className="btn btn-volt" id="loadDay" onClick={loadDay}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          Cargar día completo en sesión
        </button>
        <span className="day-hint" id="dayHint">
          {day.ex.length} ejercicios · <b>{total}</b> series{' '}
          {deload ? '(deload)' : ''} esta semana
        </span>
      </div>
      <details className="notes">
        <summary>▸ Notas del bloque</summary>
        <ul>
          <li>
            <b>RIR 1–2:</b> guardar 1–2 reps antes del fallo. Los compuestos
            pesados (sentadilla, press de banca, peso muerto rumano) se quedan
            en RIR 2; los aislamientos y las máquinas pueden llegar a RIR 1 con
            seguridad.
          </li>
          <li>
            <b>Segundo toque:</b> cada grupo muscular recibe un segundo
            estímulo semanal (espalda, pecho, isquios, bíceps, tríceps,
            deltoides lateral y posterior). El face pull pasa de 1 a 2 veces por
            semana.
          </li>
          <li>
            <b>Descansos:</b> 2.5–3 min en los tres grandes (sentadilla, press
            de banca, peso muerto rumano); 2 min en el resto de compuestos;
            60–90 s en aislamiento. El objetivo es mantener rendimiento y
            técnica, no acumular fatiga.
          </li>
          <li>
            <b>Progresión:</b> las series son fijas — el progreso viene de subir
            carga o reps semana a semana. Si dos semanas seguidas no subís nada,
            es señal de que toca deload o de que la recuperación
            (sueño/nutrición) no está acompañando.
          </li>
          <li>
            <b>Estiramiento:</b> varios ejercicios cargan el músculo en posición
            estirada (extensión de cuádriceps, curl de isquios sentado, tríceps
            overhead) — la evidencia reciente asocia el trabajo en longitud
            larga con mayor hipertrofia.
          </li>
          <li>
            <b>Deload:</b> cada 5–6 semanas, reducir volumen a ~50% (menos
            series, mismo peso o levemente inferior) antes de iniciar un nuevo
            bloque.
          </li>
          <li>
            <b>Lunes y Viernes:</b> son los días más largos (7 ejercicios cada
            uno). Si alguno se siente muy cargado de fatiga acumulada, se puede
            mover un día y correr la semana.
          </li>
        </ul>
      </details>
    </section>
  )
}