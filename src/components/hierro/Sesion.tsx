import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import { useTimerStore } from '../../store/timerStore'
import type { Exercise, SetData } from '../../lib/types'
import {
  repsLabel,
  suggestFor,
  parseRest,
  focusOf,
  lastSets,
  isCompletedSet,
  volumeOf
} from '../../lib/logic'
import { GROUPS, GCOLORS } from '../../data/routine'
import { fmtN, normName, uid } from '../../lib/util'
import {
  nextSetTarget,
  stepValue,
  suggestExercises,
  type ExerciseSuggestion
} from '../../lib/session'
import { toast } from '../../lib/toast'
import useSaveSession from '../../hooks/useSaveSession'
import RirChips from './RirChips'

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
  const addExercise = useAppStore((s) => s.addExercise)
  const setSetField = useAppStore((s) => s.setSetField)
  const setSetRir = useAppStore((s) => s.setSetRir)
  const toggleSetDone = useAppStore((s) => s.toggleSetDone)
  const addSetToExercise = useAppStore((s) => s.addSetToExercise)
  const removeSetFromExercise = useAppStore((s) => s.removeSetFromExercise)
  const removeExerciseFromSession = useAppStore((s) => s.removeExerciseFromSession)
  const clearSession = useAppStore((s) => s.clearSession)
  const setView = useAppStore((s) => s.setView)

  const nameInput = useRef<HTMLInputElement | null>(null)
  const acWrap = useRef<HTMLDivElement | null>(null)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('pecho')
  const [picked, setPicked] = useState<ExerciseSuggestion | null>(null)
  const [acOpen, setAcOpen] = useState(false)
  const [active, setActive] = useState<{ exId: string; si: number } | null>(null)
  const suggestions = useMemo(
    () => suggestExercises(history, name, 6),
    [history, name]
  )

  useEffect(() => {
    if (!acOpen) return
    const onDown = (ev: PointerEvent): void => {
      if (acWrap.current && !acWrap.current.contains(ev.target as Node)) {
        setAcOpen(false)
      }
    }
    const onOut = (ev: FocusEvent): void => {
      const next = ev.relatedTarget as Node | null
      if (next && acWrap.current && !acWrap.current.contains(next)) {
        setAcOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusout', onOut)
    }
  }, [acOpen])

  const addEx = (): void => {
    const trim = name.trim()
    if (!trim) {
      toast('Escribe el nombre del ejercicio', 'warn')
      nameInput.current?.focus()
      return
    }
    const last = lastSets(history, trim)
    const matchesPick = !!picked && normName(picked.name) === normName(trim)
    const meta = matchesPick
      ? picked
      : suggestions.find((s) => normName(s.name) === normName(trim)) ?? null
    const ex: Exercise = {
      id: uid(),
      name: trim,
      group: matchesPick ? group : meta?.group ?? group,
      reps: meta?.reps,
      rest: meta?.rest,
      note: meta?.note,
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
    setPicked(null)
    setAcOpen(false)
  }

  const pickSuggestion = (s: ExerciseSuggestion): void => {
    setName(s.name)
    setPicked(s)
    if (s.group) setGroup(s.group)
    setAcOpen(false)
  }

  const total = exercises.reduce((a, e) => a + e.sets.length, 0)
  const done = exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).length,
    0
  )
  const volDone = exercises.reduce((a, e) => a + volumeOf(e.sets), 0)
  const pct = total ? (done / total) * 100 : 0

  const onSave = useSaveSession()

  const onClear = (): void => {
    setActive(null)
    const prev = exercises
    const prevStart = useAppStore.getState().sessionStartedAt
    clearSession()
    toast('Sesión vaciada', 'warn', {
      label: 'Deshacer',
      run: () => {
        const st = useAppStore.getState()
        st.replaceExercises(prev)
        st.restoreSessionStart(prevStart)
      }
    })
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
            const rirTxt =
              typeof s.rir === 'number'
                ? ` @RIR ${s.rir === 3 ? '3+' : s.rir}`
                : ''
            return `- S${si + 1}: ${
              has
                ? `${hasKg ? `${fmtN(Number(s.kg), 1)} kg` : '—'} × ${
                    hasReps ? String(s.reps) : '—'
                  }${s.done ? ' ✔' : ''}`
                : '_ kg × _ reps'
            }${rirTxt}`
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
    })}\n${focus ? `Enfoque: ${focus}\n` : ''}\n${body}\n\n*Volumen completado:* ${fmtN(
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

  const repeatSet = (e: Exercise, si: number): void => {
    const last = lastSets(history, e.name)
    const hasData = (s?: SetData): boolean =>
      !!s && ((s.reps !== '' && s.reps != null) || (s.kg !== '' && s.kg != null))
    const prevSet = e.sets[si - 1]
    const pick = [prevSet, last?.[si], last?.[0]].find(hasData)
    if (!pick) {
      toast('No hay una serie anterior para repetir', 'warn')
      return
    }
    if (pick.reps !== '' && pick.reps != null)
      setSetField(e.id, si, 'reps', String(pick.reps))
    if (pick.kg !== '' && pick.kg != null)
      setSetField(e.id, si, 'kg', String(pick.kg))
  }

  const focusSet = (exId: string, si: number): void => {
    window.requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-set="${exId}-${si}"]`
      )
      row
        ?.querySelector<HTMLInputElement>('input[data-field="reps"]')
        ?.focus({ preventScroll: true })
      window.requestAnimationFrame(() => {
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    })
  }

  const scrollSet = (exId: string, si: number): void => {
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-set="${exId}-${si}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  const toggleActive = (exId: string, si: number): void => {
    setActive((a) =>
      a?.exId === exId && a.si === si ? null : { exId, si }
    )
  }

  const markDone = (e: Exercise, si: number, focusNext = false): void => {
    const s = e.sets[si]
    if (!s || s.done) return
    toggleSetDone(e.id, si)
    const next = nextSetTarget(exercises, e.id, si)
    if (next) {
      if (focusNext) focusSet(next.exId, next.si)
      else scrollSet(next.exId, next.si)
    }
    const sec = parseRest(e.rest) || 90
    useTimerStore.getState().start(sec, `${e.name} · S${si + 1}`)
  }

  return (
    <section
      className="panel reveal d2"
      id="sessionPanel"
      style={{ '--acc': 'var(--volt)' } as CSSProperties}
    >
      <h2>
        <span className="n">01/</span> Sesión actual
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
      <div id="exList">
        {!exercises.length ? (
          <div className="empty">
            {barSVG}
            <p>
              <b>Sin ejercicios todavía.</b>
              <br />
              Cargá tu día desde Plan o añadí un ejercicio abajo.
            </p>
            <button className="link-btn" id="goPlan" onClick={() => setView('plan', true)}>
              Ir a Plan
            </button>
          </div>
        ) : (
          exercises.map((e, i) => {
            const vol = volumeOf(e.sets)
            const best = Math.max(
              0,
              ...e.sets.filter(isCompletedSet).map((s) => Number(s.kg) || 0)
            )
            const c = GCOLORS[e.group] || '#8ba0a8'
            const sug = suggestFor(e)
            const prevSets = (lastSets(history, e.name) ?? []).filter(
              (s) =>
                s.reps !== '' &&
                s.reps != null &&
                s.kg !== '' &&
                s.kg != null
            )
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
                      setActive(null)
                      const prev = useAppStore.getState().exercises
                      const prevStart = useAppStore.getState().sessionStartedAt
                      removeExerciseFromSession(e.id)
                      toast('Ejercicio eliminado', 'warn', {
                        label: 'Deshacer',
                        run: () => {
                          const st = useAppStore.getState()
                          st.replaceExercises(prev)
                          st.restoreSessionStart(prevStart)
                        }
                      })
                    }}
                  >
                    {trashSVG}
                  </button>
                </header>
                {e.note ? <p className="ex-note">▸ {e.note}</p> : null}
                {prevSets.length ? (
                  <p className="ex-last">
                    La vez pasada:{' '}
                    {prevSets
                      .slice(0, 4)
                      .map((s) => `${fmtN(Number(s.kg), 1)}×${String(s.reps)}`)
                      .join(' · ')}
                    {e.reps ? ` · objetivo ${e.reps}` : ''}
                  </p>
                ) : null}
                <div className="sets">
                  <div className="sets-head">
                    <span></span>
                    <span>Serie</span>
                    <span>Reps</span>
                    <span>Peso (kg)</span>
                    <span></span>
                  </div>
                  {e.sets.map((s, si) => {
                    const isActive = active?.exId === e.id && active.si === si
                    return (
                      <Fragment key={si}>
                        <div
                          className={`set-row${s.done ? ' done' : ''}${
                            isActive ? ' active' : ''
                          }`}
                          data-set={`${e.id}-${si}`}
                          onClick={(ev) => {
                            const target = ev.target as HTMLElement
                            if (target.closest('input, button')) return
                            toggleActive(e.id, si)
                          }}
                        >
                          <button
                            type="button"
                            className="set-check"
                            title="Marcar serie completada"
                            aria-pressed={s.done}
                            onClick={() => {
                              if (s.done) toggleSetDone(e.id, si)
                              else markDone(e, si)
                            }}
                          >
                            {checkSVG}
                          </button>
                          <button
                            type="button"
                            className="set-num"
                            title="Ajustes de la serie"
                            aria-label={`Serie ${si + 1}${
                              typeof s.rir === 'number'
                                ? `, RIR ${s.rir === 3 ? '3+' : s.rir}`
                                : ''
                            }: ajustes`}
                            aria-expanded={isActive}
                            aria-controls={
                              isActive
                                ? `set-tools-${e.id}-${si} set-rir-${e.id}-${si}`
                                : undefined
                            }
                            onClick={() => toggleActive(e.id, si)}
                          >
                            {si + 1}
                            {typeof s.rir === 'number' ? (
                              <i
                                className="rir-dot"
                                title={`RIR ${s.rir === 3 ? '3+' : s.rir}`}
                              >
                                {s.rir === 3 ? '3+' : s.rir}
                              </i>
                            ) : null}
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={s.reps ?? ''}
                            placeholder="0"
                            aria-label={`Repeticiones serie ${si + 1}`}
                            data-field="reps"
                            onFocus={() => setActive({ exId: e.id, si })}
                            onChange={(ev) =>
                              setSetField(e.id, si, 'reps', ev.target.value)
                            }
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') {
                                ev.preventDefault()
                                document
                                  .querySelector<HTMLInputElement>(
                                    `[data-set="${e.id}-${si}"] input[data-field="kg"]`
                                  )
                                  ?.focus()
                              }
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={s.kg ?? ''}
                            placeholder="0.0"
                            aria-label={`Peso serie ${si + 1}`}
                            data-field="kg"
                            onFocus={() => setActive({ exId: e.id, si })}
                            onChange={(ev) =>
                              setSetField(e.id, si, 'kg', ev.target.value)
                            }
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') {
                                ev.preventDefault()
                                if (s.done) {
                                  const next = nextSetTarget(exercises, e.id, si)
                                  if (next) focusSet(next.exId, next.si)
                                  return
                                }
                                markDone(e, si, true)
                              }
                            }}
                          />
                          <button
                            className="icon-btn del-set"
                            title="Eliminar serie"
                            onClick={() => {
                              setActive(null)
                              const prev = useAppStore.getState().exercises
                              const prevStart =
                                useAppStore.getState().sessionStartedAt
                              removeSetFromExercise(e.id, si)
                              toast(`Serie ${si + 1} eliminada`, 'warn', {
                                label: 'Deshacer',
                                run: () => {
                                  const st = useAppStore.getState()
                                  st.replaceExercises(prev)
                                  st.restoreSessionStart(prevStart)
                                }
                              })
                            }}
                          >
                            {trashSVG}
                          </button>
                        </div>
                        {isActive ? (
                          <div
                            className="set-tools"
                            id={`set-tools-${e.id}-${si}`}
                            role="group"
                            aria-label={`Herramientas serie ${si + 1} de ${e.name}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSetField(
                                  e.id,
                                  si,
                                  'reps',
                                  String(stepValue(s.reps, -1))
                                )
                              }
                            >
                              −1 rep
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSetField(
                                  e.id,
                                  si,
                                  'reps',
                                  String(stepValue(s.reps, 1))
                                )
                              }
                            >
                              +1 rep
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSetField(
                                  e.id,
                                  si,
                                  'kg',
                                  String(stepValue(s.kg, -2.5))
                                )
                              }
                            >
                              −2,5 kg
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSetField(
                                  e.id,
                                  si,
                                  'kg',
                                  String(stepValue(s.kg, 2.5))
                                )
                              }
                            >
                              +2,5 kg
                            </button>
                            <button type="button" onClick={() => repeatSet(e, si)}>
                              Repetir
                            </button>
                          </div>
                        ) : null}
                        {isActive ? (
                          <div
                            className="set-tools-rir"
                            id={`set-rir-${e.id}-${si}`}
                          >
                            <span>RIR</span>
                            <RirChips
                              value={s.rir}
                              onChange={(v) => setSetRir(e.id, si, v)}
                            />
                          </div>
                        ) : null}
                      </Fragment>
                    )
                  })}
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
      <details className="add-ex-wrap">
        <summary>+ Añadir ejercicio</summary>
        <div className="add-ex">
          <div className="ac-wrap" ref={acWrap}>
            <input
              ref={nameInput}
              type="text"
              id="exName"
              placeholder="Nombre del ejercicio (p. ej. Press de banca)"
              aria-label="Nombre del ejercicio"
              value={name}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value)
                setPicked(null)
                setAcOpen(true)
              }}
              onFocus={() => setAcOpen(true)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') addEx()
                if (e.key === 'Escape') setAcOpen(false)
              }}
            />
            {acOpen && suggestions.length ? (
              <ul className="ac-list" aria-label="Sugerencias de ejercicios">
                {suggestions.map((s) => (
                  <li key={s.name}>
                    <button type="button" onClick={() => pickSuggestion(s)}>
                      <b>{s.name}</b>
                      {s.group ? <span>{GROUPS[s.group] || s.group}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <select
            id="exGroup"
            aria-label="Grupo del ejercicio"
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
      </details>
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