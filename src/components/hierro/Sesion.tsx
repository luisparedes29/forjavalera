import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import { useRoutineStore } from '../../store/routineStore'
import { useTimerStore } from '../../store/timerStore'
import type { Exercise, RoutineExercise, SetData } from '../../lib/types'
import {
  repsLabel,
  suggestFor,
  parseRest,
  focusOf,
  lastSets
} from '../../lib/logic'
import { GROUPS, GCOLORS, ROUTINE } from '../../data/routine'
import { fmtN, uid } from '../../lib/util'
import { toast } from '../../lib/toast'

const barSVG = (
  <svg width="46" height="23" viewBox="0 0 48 24">
    <rect x="1" y="8" width="4" height="8" fill="#8ba0a8" />
    <rect x="6" y="4.5" width="4.5" height="15" fill="#8ba0a8" />
    <rect x="11.5" y="10.5" width="25" height="3" fill="#5a6c74" />
    <rect x="37.5" y="4.5" width="4.5" height="15" fill="#8ba0a8" />
    <rect x="43" y="8" width="4" height="8" fill="#8ba0a8" />
  </svg>
)

const checkSVG = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
    <path d="M4 12l5 5L20 6" />
  </svg>
)

const trashSVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6" />
  </svg>
)

const saveSVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
)

export default function Sesion() {
  const exercises = useAppStore((s) => s.exercises)
  const history = useAppStore((s) => s.history)
  const week = useAppStore((s) => s.week)
  const addExercise = useAppStore((s) => s.addExercise)
  const replaceExercises = useAppStore((s) => s.replaceExercises)
  const setSetField = useAppStore((s) => s.setSetField)
  const toggleSetDone = useAppStore((s) => s.toggleSetDone)
  const addSetToExercise = useAppStore((s) => s.addSetToExercise)
  const removeSetFromExercise = useAppStore((s) => s.removeSetFromExercise)
  const removeExerciseFromSession = useAppStore((s) => s.removeExerciseFromSession)
  const clearSession = useAppStore((s) => s.clearSession)
  const commitSession = useAppStore((s) => s.commitSession)

  const dayIdx = useRoutineStore((s) => s.dayIdx)

  const nameInput = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('pecho')

  const addEx = (): void => {
    const trim = name.trim()
    if (!trim) {
      toast('Escribe el nombre del ejercicio', 'warn')
      nameInput.current?.focus()
      return
    }
    const last = lastSets(history, trim)
    const ex: Exercise = {
      id: uid(),
      name: trim,
      group,
      sets: [
        {
          reps: last?.[0]?.reps ?? '',
          kg: last?.[0]?.kg ?? '',
          done: false
        }
      ]
    }
    addExercise(ex)
    setName('')
    nameInput.current?.focus()
  }

  const buildOne = (d: RoutineExercise): Exercise => {
    let active = d.sets.filter((w) => w <= week.week)
    if (week.deload) active = active.slice(0, Math.ceil(active.length / 2))
    const last = lastSets(history, d.n)
    const sets: SetData[] = active.map((_, i) => ({
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

  const loadToday = (): void => {
    const day = ROUTINE[dayIdx]
    replaceExercises(day.ex.map((r) => buildOne(r)))
    toast(`${day.day} cargado en la sesión`)
  }

  const total = exercises.reduce((a, e) => a + e.sets.length, 0)
  const done = exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).length,
    0
  )
  const volDone = exercises.reduce(
    (a, e) =>
      a +
      e.sets.reduce(
        (x, s) => x + (Number(s.reps) || 0) * (Number(s.kg) || 0) * (s.done ? 1 : 0),
        0
      ),
    0
  )
  const pct = total ? (done / total) * 100 : 0

  const onSave = (): void => {
    const valid = exercises.filter((e) => e.name.trim() && e.sets.length)
    if (!valid.length) {
      toast('Añade al menos un ejercicio con una serie', 'warn')
      return
    }
    commitSession()
    const focus = useAppStore.getState().history[0]?.focus
    toast(`Sesión guardada · enfoque: ${GROUPS[focus ?? ''] || 'general'} 💪`)
  }

  const onClear = (): void => {
    if (exercises.length && !confirm('¿Vaciar la sesión actual?')) return
    clearSession()
    toast('Sesión vaciada')
  }

  const onCopy = (): void => {
    if (!exercises.length) {
      toast('No hay sesión que copiar', 'warn')
      return
    }
    const d = new Date()
    const focus = GROUPS[focusOf(exercises) ?? ''] || ''
    let T = 0
    let D = 0
    let V = 0
    const body = exercises
      .map((e, i) => {
        const sets = e.sets
          .map((s, si) => {
            T++
            if (s.done) {
              D++
              V += (Number(s.reps) || 0) * (Number(s.kg) || 0)
            }
            const hasReps = s.reps !== '' && s.reps != null
            const hasKg = s.kg !== '' && s.kg != null
            const has = hasReps || hasKg
            return `- S${si + 1}: ${
              has
                ? `${hasKg ? `${fmtN(Number(s.kg), 1)} kg` : '—'} × ${
                    hasReps ? String(s.reps) : '—'
                  }${s.done ? ' ✔' : ''}`
                : '_ kg × _ reps'
            }`
          })
          .join('\n')
        return `${i + 1}. ${e.name}${
          e.reps && e.reps !== 'al fallo' ? ` (${e.reps} reps)` : ''
        }${e.rest ? ` — ⏱ ${e.rest}` : ''}\n${sets}`
      })
      .join('\n\n')
    const txt = `🏋️ SESIÓN — ${d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })}\n${focus ? `Enfoque: ${focus} · ` : ''}RIR 1–2\n\n${body}\n\n*Volumen completado:* ${fmtN(
      Math.round(V)
    )} kg · ${D}/${T} series`
    const doneCopy = (): void => toast('Sesión copiada al portapapeles')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(txt)
        .then(doneCopy)
        .catch(() => fallbackCopy(txt, doneCopy))
    } else {
      fallbackCopy(txt, doneCopy)
    }
  }

  return (
    <section
      className="panel reveal d2"
      id="sessionPanel"
      style={{ '--acc': 'var(--volt)' } as CSSProperties}
    >
      <h2>
        <span className="n">02/</span> Sesión actual
        <span className="autosave">
          <span className="dot"></span>borrador autoguardado
        </span>
      </h2>
      <div className={`sess-prog${total ? '' : ' hide'}`} id="sessProg">
        <div className="sp-bar">
          <i id="spFill" style={{ width: `${pct}%` }}></i>
        </div>
        <span id="spText">
          <b>
            {done}/{total}
          </b>{' '}
          series · {fmtN(Math.round(volDone))} kg completados
        </span>
      </div>
      <div className="add-ex">
        <input
          ref={nameInput}
          type="text"
          id="exName"
          placeholder="Nombre del ejercicio (p. ej. Press de banca)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') addEx()
          }}
        />
        <select
          id="exGroup"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {Object.entries(GROUPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn btn-volt" id="addEx" onClick={addEx}>
          + Añadir
        </button>
      </div>
      <div id="exList">
        {!exercises.length ? (
          <div className="empty">
            {barSVG}
            <p>
              <b>Sin ejercicios todavía.</b>
              <br />
              Cargá tu día de la rutina o añadí uno manual arriba.
            </p>
            <button className="link-btn" id="sampleEx" onClick={loadToday}>
              Cargar el día de hoy de la rutina
            </button>
          </div>
        ) : (
          exercises.map((e, i) => {
            const vol = e.sets.reduce(
              (a, s) => a + (Number(s.reps) || 0) * (Number(s.kg) || 0),
              0
            )
            const best = Math.max(0, ...e.sets.map((s) => Number(s.kg) || 0))
            const c = GCOLORS[e.group] || '#8ba0a8'
            const sug = suggestFor(e)
            return (
              <article
                className="ex-card"
                key={e.id}
                style={{ '--gc': c } as CSSProperties}
              >
                <header className="ex-head">
                  <span className="ex-idx">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="ex-name">{e.name || 'Ejercicio'}</h3>
                  <span className="tag" style={{ '--gc': c } as CSSProperties}>
                    {GROUPS[e.group] || e.group}
                  </span>
                  {e.reps || e.rest ? (
                    <span className="ex-meta">
                      {e.reps ? repsLabel(e) : ''}
                      {e.rest ? ` · ⏱ ${e.rest}` : ''}
                    </span>
                  ) : null}
                  <span className="ex-vol">
                    vol <b>{fmtN(Math.round(vol))}</b> kg
                  </span>
                  <button
                    className="icon-btn del-ex"
                    title="Eliminar ejercicio"
                    onClick={() => {
                      removeExerciseFromSession(e.id)
                      toast('Ejercicio eliminado')
                    }}
                  >
                    {trashSVG}
                  </button>
                </header>
                {e.note ? <p className="ex-note">▸ {e.note}</p> : null}
                <div className="sets">
                  <div className="sets-head">
                    <span></span>
                    <span>Serie</span>
                    <span>Reps</span>
                    <span>Peso (kg)</span>
                    <span></span>
                  </div>
                  {e.sets.map((s, si) => (
                    <div className={`set-row${s.done ? ' done' : ''}`} key={si}>
                      <button
                        className="set-check"
                        title="Marcar serie completada"
                        aria-pressed={s.done}
                        onClick={() => {
                          const wasDone = s.done
                          toggleSetDone(e.id, si)
                          if (!wasDone && e.rest) {
                            useTimerStore
                              .getState()
                              .start(
                                parseRest(e.rest),
                                `${e.name} · Serie ${si + 1}`
                              )
                          }
                        }}
                      >
                        {checkSVG}
                      </button>
                      <span className="set-num">{si + 1}</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={s.reps ?? ''}
                        placeholder="0"
                        aria-label={`Repeticiones serie ${si + 1}`}
                        onChange={(ev) =>
                          setSetField(e.id, si, 'reps', ev.target.value)
                        }
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={s.kg ?? ''}
                        placeholder="0.0"
                        aria-label={`Peso serie ${si + 1}`}
                        onChange={(ev) =>
                          setSetField(e.id, si, 'kg', ev.target.value)
                        }
                      />
                      <button
                        className="icon-btn del-set"
                        title="Eliminar serie"
                        onClick={() => removeSetFromExercise(e.id, si)}
                      >
                        {trashSVG}
                      </button>
                    </div>
                  ))}
                </div>
                <footer className="ex-foot">
                  <button className="add-set" onClick={() => addSetToExercise(e.id)}>
                    + Añadir serie
                  </button>
                  <span
                    className={`prog${sug ? '' : ' hide'}`}
                    data-t={sug ? sug.t : undefined}
                  >
                    {sug ? sug.msg : ''}
                  </span>
                  <span className={`best${best ? '' : ' hide'}`}>
                    Mejor serie: <b>{fmtN(best, 1)} kg</b>
                  </span>
                </footer>
              </article>
            )
          })
        )}
      </div>
      <div className="session-actions">
        <button className="btn btn-volt" id="saveSession" onClick={onSave}>
          {saveSVG}
          Guardar sesión
        </button>
        <button className="btn btn-ghost" id="copySession" onClick={onCopy}>
          Copiar como texto
        </button>
        <button className="btn btn-ghost" id="clearSession" onClick={onClear}>
          Limpiar
        </button>
      </div>
    </section>
  )
}

function fallbackCopy(txt: string, cb: () => void): void {
  const ta = document.createElement('textarea')
  ta.value = txt
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.append(ta)
  ta.select()
  try {
    document.execCommand('copy')
    cb()
  } catch {
    toast('No se pudo copiar', 'warn')
  }
  ta.remove()
}