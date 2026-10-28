# Modo GYM R2 — Sesión-first — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir FORJA y estar registrando: cuatro pestañas con `Registrar` como home, header de sesión sticky con Guardar siempre visible, fila de serie rápida de una mano, timer manual, fin de semana explícito y confirmaciones propias.

**Architecture:** `ViewId` pasa a cuatro vistas (`registrar`, `plan`, `cuerpo`, `progreso`) con `#hierro` como alias. `HierroView` se parte en `RegistrarView` (sesión + historial) y `PlanView` (stats + rutina). `sessionStartedAt` se persiste en una clave nueva y el header deriva series/volumen/tiempo de los helpers de R1. El composer baja a un `<details>` al final y ofrece autocompletado desde la rutina y el historial. La fila de serie gana estado activo, barra de herramientas, línea “La vez pasada”, auto-scroll y cadena Enter. El timer gana panel manual con presets y etiqueta de siguiente serie. `Cargar día` navega a Registrar y usa undo; las confirmaciones nativas se reemplazan por `ConfirmSheet`.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Validación: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Estado de partida: R1 cerrado con **48 tests**. Al cerrar R2 deben pasar **60 tests**.
- `tsconfig.check.json` solo incluye `src/lib/**/*.ts`, `src/data/**/*.ts`, `src/store/**/*.ts`. Los componentes se validan con `npm run build` y prueba manual.
- Sin comentarios nuevos en el código. Copy en español rioplatense (voseo). Commits en español (`feat:`, `fix:`, `test:`, `docs:`).
- No tocar las claves `forja_session`, `forja_history`, `forja_body`, `forja_week` ni la versión 3 del respaldo. La clave nueva es `forja_session_start`.
- No hacer push. Rama `dev`.
- Cada tarea termina con commit y auditoría de un subagente `general` que **no edita**: verifica el diff, corre `tsc`/`npm test`/`npm run build` y devuelve APROBADO/RECHAZADO. El resultado se marca en `PLAN-V1.md`.
- Spec de referencia (leer antes de empezar): `docs/superpowers/specs/2026-10-23-modo-gym-design.md`.
- Depende de R1: `volumeOf`, `completedSets`, `isCompletedSet`, `date.ts`, timer con `endsAt`, toasts con acción, targets de 44 px.

---

### Task 1: Cuatro vistas y alias `#hierro`

**Files:**
- Modify: `src/store/appStore.ts` (`ViewId`, `initialView`)
- Modify: `src/lib/view.ts`
- Modify: `src/layouts/Base.astro`
- Modify: `src/components/shared/tabs.tsx`
- Modify: `src/components/ViewManager.tsx`
- New: `src/components/hierro/RegistrarView.tsx`
- New: `src/components/hierro/PlanView.tsx`
- New: `src/components/hierro/Stats.tsx`
- Delete: `src/components/hierro/HierroView.tsx`
- Modify: `src/styles/global.css`
- Test: `src/lib/test/view.test.ts`

**Interfaces:**
- Produces: `type ViewId = 'registrar' | 'plan' | 'cuerpo' | 'progreso'`.
- Produces: `viewFromHash(hash?: string): ViewId` con alias `hierro → registrar`.
- `initialView()` devuelve siempre `'registrar'` para evitar hydration mismatch.

- [x] **Step 1: Escribir los tests que fallan**

Crear `src/lib/test/view.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { viewFromHash } from '../view'

describe('viewFromHash', () => {
  it('mapea las cuatro vistas', () => {
    expect(viewFromHash('#registrar')).toBe('registrar')
    expect(viewFromHash('#plan')).toBe('plan')
    expect(viewFromHash('#cuerpo')).toBe('cuerpo')
    expect(viewFromHash('#progreso')).toBe('progreso')
  })

  it('mantiene #hierro como alias de registrar', () => {
    expect(viewFromHash('#hierro')).toBe('registrar')
  })

  it('cae en registrar con hash vacío o desconocido', () => {
    expect(viewFromHash('')).toBe('registrar')
    expect(viewFromHash('#otra-cosa')).toBe('registrar')
  })
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `#registrar` y `#plan` caen en `hierro`.

- [x] **Step 3: Cambiar el tipo y el parser**

En `src/store/appStore.ts`:

```ts
export type ViewId = 'registrar' | 'plan' | 'cuerpo' | 'progreso'
```

```ts
function initialView(): ViewId {
  return 'registrar'
}
```

Reemplazar `src/lib/view.ts` por:

```ts
import type { ViewId } from '../store/appStore'

const VALID: readonly ViewId[] = ['registrar', 'plan', 'cuerpo', 'progreso']
const ALIAS: Record<string, ViewId> = { hierro: 'registrar' }

export function viewFromHash(hash?: string): ViewId {
  const h = (hash ?? (typeof window !== 'undefined' ? window.location.hash : '')).slice(1)
  if (ALIAS[h]) return ALIAS[h]
  return (VALID as readonly string[]).includes(h) ? (h as ViewId) : 'registrar'
}
```

En `src/layouts/Base.astro`, reemplazar la línea del pre-paint:

```js
var v =
  h === 'plan' || h === 'cuerpo' || h === 'progreso'
    ? h
    : 'registrar'
```

- [x] **Step 4: Actualizar las pestañas**

Reemplazar `src/components/shared/tabs.tsx` por cuatro entradas en este orden:
`Registrar`, `Plan`, `Cuerpo`, `Progreso`.

```tsx
export const TABS: Array<{ v: ViewId; label: string; icon: ReactNode }> = [
  {
    v: 'registrar',
    label: 'Registrar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 12l5 5L20 6" />
      </svg>
    )
  },
  {
    v: 'plan',
    label: 'Plan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h4M7.5 16.5h7" />
      </svg>
    )
  },
  {
    v: 'cuerpo',
    label: 'Cuerpo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M8.5 15a3.5 3.5 0 0 1 7 0" />
        <path d="M12 15l2.2-2.2" />
      </svg>
    )
  },
  {
    v: 'progreso',
    label: 'Progreso',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    )
  }
]
```

`NavTabs` y `NavTabbar` no cambian: ya renderizan `TABS`. En `src/styles/global.css`, dentro de `@media (max-width: 1020px)`, cambiar `.tabbar` de `grid-template-columns: 1fr 1fr 1fr` a `grid-template-columns: repeat(4, 1fr)` para que la cuarta pestaña no caiga en una segunda fila.

- [x] **Step 5: Partir la vista de hierro**

Crear `src/components/hierro/Stats.tsx` moviendo el bloque `<section className="stats ...">` de `HierroView.tsx`, con los cálculos de R1 (`completedSets` y `volumeOf`) y el formateo de fecha de R1. Mantener el mismo markup y clases, cambiar el id a `statsPlan`.

En `src/styles/global.css`, reemplazar los 11 selectores `#statsHierro` por `#statsPlan` (bloques en `:332-343` y `:2260-2304`). Sin eso, las stats de Plan pierden colores y layout móvil.

Crear `src/components/hierro/PlanView.tsx`:

```tsx
import Stats from './Stats'
import Rutina from './Rutina'

export default function PlanView() {
  return (
    <>
      <Stats />
      <div className="routine-wrap">
        <Rutina />
      </div>
    </>
  )
}
```

Crear `src/components/hierro/RegistrarView.tsx`:

```tsx
import Sesion from './Sesion'
import Historial from './Historial'

export default function RegistrarView() {
  return (
    <main>
      <Sesion />
      <section className="panel reveal d2" style={{ '--acc': 'var(--teal)' }}>
        <h2>
          <span className="n">02/</span> Historial
        </h2>
        <Historial />
      </section>
    </main>
  )
}
```

En `Sesion.tsx`, cambiar el número del panel de `02/` a `01/`.
En `Rutina.tsx` el panel queda en `01/` porque es la primera sección de Plan. En esta tarea, `loadDay` deja de hacer `scrollIntoView` sobre `#sessionPanel` (ese panel ahora vive en Registrar y está oculto desde Plan); el `confirm` se elimina en la Task 6 junto con el undo.

Reemplazar `src/components/ViewManager.tsx`:

```tsx
import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { viewFromHash } from '../lib/view'
import useReveal from '../hooks/useReveal'
import RegistrarView from './hierro/RegistrarView'
import PlanView from './hierro/PlanView'
import CuerpoView from './cuerpo/CuerpoView'
import ProgresoView from './progreso/ProgresoView'

export default function ViewManager() {
  const view = useAppStore((s) => s.view)
  const ref = useReveal<HTMLDivElement>()

  useEffect(() => {
    const fromHash = (): void => {
      useAppStore.getState().setView(viewFromHash(window.location.hash), false)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <div ref={ref}>
      <div id="view-registrar" className={`view${view === 'registrar' ? ' active' : ''}`}>
        <RegistrarView />
      </div>
      <div id="view-plan" className={`view${view === 'plan' ? ' active' : ''}`}>
        <PlanView />
      </div>
      <div id="view-cuerpo" className={`view${view === 'cuerpo' ? ' active' : ''}`}>
        <CuerpoView />
      </div>
      <div id="view-progreso" className={`view${view === 'progreso' ? ' active' : ''}`}>
        <ProgresoView />
      </div>
    </div>
  )
}
```

Eliminar `src/components/hierro/HierroView.tsx`.

En `src/styles/global.css`, reemplazar las reglas de vistas:

```css
:root:not([data-view]) #view-registrar,
:root[data-view='registrar'] #view-registrar,
:root[data-view='hierro'] #view-registrar,
:root[data-view='plan'] #view-plan,
:root[data-view='cuerpo'] #view-cuerpo,
:root[data-view='progreso'] #view-progreso {
  display: block;
  animation: viewIn 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
```

No cambiar `setView`: ya escribe `document.documentElement.dataset.view` y el hash.

- [x] **Step 6: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **51 passed**.
Run: `npm run build` → OK.

Run: `git add src/store/appStore.ts src/lib/view.ts src/lib/test/view.test.ts src/layouts/Base.astro src/components/shared/tabs.tsx src/components/ViewManager.tsx src/components/hierro/RegistrarView.tsx src/components/hierro/PlanView.tsx src/components/hierro/Stats.tsx src/components/hierro/Sesion.tsx src/styles/global.css`
Run: `git rm src/components/hierro/HierroView.tsx`
Run: `git commit -m "feat: dividir la app en registrar plan cuerpo progreso"`

- [x] **Step 7: Auditoría T11-1**

Subagente `general` (NO edita): verifica que `ViewId` tenga cuatro valores, que `#hierro` siga mostrando Registrar, que las cuatro vistas queden montadas, que el pre-paint y `viewFromHash` coincidan, que no queden imports de `HierroView` y corre `tsc`/`npm test` (51)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 2: Inicio de sesión persistido + header sticky

**Files:**
- Modify: `src/lib/storage.ts` (`LS.sessionStart`, `removeL`)
- Modify: `src/store/appStore.ts` (`sessionStartedAt`, `startSession`, limpieza)
- New: `src/lib/session.ts`
- New: `src/lib/test/session.test.ts`
- New: `src/hooks/useSaveSession.ts`
- New: `src/components/hierro/SessionHeader.tsx`
- Modify: `src/components/hierro/RegistrarView.tsx`
- Modify: `src/components/hierro/Sesion.tsx`
- Modify: `src/components/hierro/Rutina.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Store: `sessionStartedAt: number | null`, `startSession(): void`.
- Produces: `formatElapsed(ms: number): string`.
- Produces: `sessionSummary(exercises: Exercise[]): { done: number; total: number; volume: number }`.
- Produces: `nextPending(sets: SetData[], from?: number): number`.
- `useSaveSession(): () => boolean` centraliza la validación y el guardado de `Sesion` y `SessionHeader`.

- [x] **Step 1: Escribir los tests que fallan**

Crear `src/lib/test/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatElapsed, nextPending, sessionSummary } from '../session'
import type { Exercise, SetData } from '../types'

const set = (reps: number | null, kg: number | null, done: boolean): SetData => ({
  reps,
  kg,
  done
})

const exercise = (sets: SetData[]): Exercise => ({
  id: 'e',
  name: 'Press banca',
  group: 'pecho',
  sets
})

describe('formatElapsed', () => {
  it('muestra minutos hasta la hora', () => {
    expect(formatElapsed(0)).toBe('0 min')
    expect(formatElapsed(38 * 60_000 + 40_000)).toBe('38 min')
  })

  it('muestra horas y minutos con dos dígitos', () => {
    expect(formatElapsed(65 * 60_000)).toBe('1 h 05')
  })
})

describe('sessionSummary', () => {
  it('cuenta solo series completadas y su volumen', () => {
    const out = sessionSummary([
      exercise([set(10, 100, true), set(10, 100, false)]),
      exercise([set(8, 50, true)])
    ])
    expect(out).toEqual({ done: 2, total: 3, volume: 1400 })
  })
})

describe('nextPending', () => {
  it('devuelve la primera serie pendiente desde from', () => {
    const sets = [set(10, 100, true), set(8, 90, false), set(6, 80, false)]
    expect(nextPending(sets)).toBe(1)
    expect(nextPending(sets, 2)).toBe(2)
  })

  it('devuelve -1 si no quedan pendientes', () => {
    expect(nextPending([set(10, 100, true)])).toBe(-1)
    expect(nextPending([])).toBe(-1)
  })
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — no existe `src/lib/session.ts`.

- [x] **Step 3: Implementar los helpers**

Crear `src/lib/session.ts`:

```ts
import { isCompletedSet, volumeOf } from './logic'
import type { Exercise, SetData } from './types'

export function formatElapsed(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

export function sessionSummary(exercises: Exercise[]): {
  done: number
  total: number
  volume: number
} {
  return exercises.reduce(
    (a, e) => ({
      done: a.done + e.sets.filter(isCompletedSet).length,
      total: a.total + e.sets.length,
      volume: a.volume + volumeOf(e.sets)
    }),
    { done: 0, total: 0, volume: 0 }
  )
}

export function nextPending(sets: SetData[], from = 0): number {
  for (let i = Math.max(0, from); i < sets.length; i++) {
    if (!sets[i].done) return i
  }
  return -1
}
```

- [x] **Step 4: Persistir el inicio de sesión**

En `src/lib/storage.ts`:

```ts
export const LS = {
  session: 'forja_session',
  sessionStart: 'forja_session_start',
  history: 'forja_history',
  body: 'forja_body',
  week: 'forja_week'
} as const

export const removeL = (k: string): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(k)
}
```

En `src/store/appStore.ts`:

```ts
import { LS, load, removeL, saveL } from '../lib/storage'
```

Agregar a la interfaz:

```ts
sessionStartedAt: number | null
startSession: () => void
```

En el estado inicial:

```ts
sessionStartedAt: load<number | null>(LS.sessionStart, null),
```

Implementar cerca de `setView`:

```ts
startSession: () => {
  if (get().sessionStartedAt) return
  const ts = Date.now()
  set({ sessionStartedAt: ts })
  saveL(LS.sessionStart, ts)
},
```

Agregar también la acción que permite restaurar un inicio previo desde un undo:

```ts
restoreSessionStart: (ts: number | null) => void
```

```ts
restoreSessionStart: (ts) => {
  set({ sessionStartedAt: ts })
  if (ts) saveL(LS.sessionStart, ts)
  else removeL(LS.sessionStart)
},
```

Reglas de limpieza:

- `addExercise`: llamar `get().startSession()` antes de agregar.
- `toggleSetDone`: si la serie pasa de no completada a completada, llamar `get().startSession()` antes de actualizar.
- `removeExerciseFromSession`: si `exercises` queda vacío, `set({ sessionStartedAt: null })` y `removeL(LS.sessionStart)`.
- `removeSetFromExercise`: si ya no queda ninguna serie en `exercises`, `set({ sessionStartedAt: null })` y `removeL(LS.sessionStart)`.
- `clearSession`: `set({ exercises: [], sessionStartedAt: null })`, `saveL(LS.session, [])` y `removeL(LS.sessionStart)`.
- `commitSession`: después de guardar, `set({ history, exercises: [], sessionStartedAt: null })` y `removeL(LS.sessionStart)`.
- `wipe`: `removeL(LS.sessionStart)` y `sessionStartedAt: null` en el `set`.
- `restoreAll`: `removeL(LS.sessionStart)` y `sessionStartedAt: null` en el `set`.
- `Rutina.loadDay`: después de `replaceExercises(...)`, llamar `useAppStore.getState().startSession()`.
- Actualizar los tres undo de `Sesion.tsx` que creó R1 (borrar serie, borrar ejercicio, limpiar): capturar también `const prevStart = useAppStore.getState().sessionStartedAt` y, dentro de `run`, llamar `useAppStore.getState().restoreSessionStart(prevStart)` después de `replaceExercises(prev)`. Sin esto, deshacer una limpieza o el último borrado deja la sesión sin reloj.

- [x] **Step 5: Extraer el guardado compartido**

Crear `src/hooks/useSaveSession.ts`:

```ts
import { useCallback } from 'react'
import { GROUPS } from '../data/routine'
import { toast } from '../lib/toast'
import { useAppStore } from '../store/appStore'

export default function useSaveSession(): () => boolean {
  return useCallback((): boolean => {
    const s = useAppStore.getState()
    const valid = s.exercises.filter((e) => e.name.trim() && e.sets.length)
    if (!valid.length) {
      toast('Añade al menos un ejercicio con una serie', 'warn')
      return false
    }
    s.commitSession()
    const focus = useAppStore.getState().history[0]?.focus
    toast(`Sesión guardada · enfoque: ${GROUPS[focus ?? ''] || 'general'} 💪`)
    return true
  }, [])
}
```

En `src/components/hierro/Sesion.tsx`:

- Importar `useSaveSession`.
- Reemplazar `onSave` por `const onSave = useSaveSession()`.
- Eliminar la validación duplicada y el toast de guardado.
- Quitar `commitSession` del selector del store.

- [x] **Step 6: Crear el header sticky**

Crear `src/components/hierro/SessionHeader.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import useSaveSession from '../../hooks/useSaveSession'
import { formatElapsed, sessionSummary } from '../../lib/session'
import { fmtN } from '../../lib/util'
import { useAppStore } from '../../store/appStore'

export default function SessionHeader() {
  const exercises = useAppStore((s) => s.exercises)
  const startedAt = useAppStore((s) => s.sessionStartedAt)
  const [now, setNow] = useState<number | null>(null)
  const save = useSaveSession()

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const summary = useMemo(() => sessionSummary(exercises), [exercises])

  if (!exercises.length) return null

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
      <button type="button" className="btn btn-volt sh-save" onClick={save}>
        Guardar
      </button>
    </section>
  )
}
```

En `RegistrarView.tsx`, renderizar `<SessionHeader />` antes de `<Sesion />`.

CSS en `src/styles/global.css`:

```css
:root[data-view='registrar'] header.top {
  position: relative;
}

.session-header {
  grid-column: 1 / -1;
  position: sticky;
  top: 6px;
  z-index: 39;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 18px;
  background: rgba(14, 19, 22, 0.94);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.sh-stats {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  color: var(--muted);
}

.sh-stats b {
  font-family: Anton;
  font-weight: 400;
  font-size: 18px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.sh-save {
  flex: none;
  min-height: 44px;
  padding: 10px 18px;
}

@media (max-width: 640px) {
  .session-header {
    padding: 9px 16px;
  }
  .sh-stats {
    gap: 12px;
  }
}
```

- [x] **Step 7: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **56 passed**.
Run: `npm run build` → OK.

Prueba manual: cargar un día, recargar la página y verificar que el reloj sigue; guardar y verificar que desaparece; vaciar e importar un respaldo y verificar que no queda inicio viejo.

Run: `git add src/lib/storage.ts src/store/appStore.ts src/lib/session.ts src/lib/test/session.test.ts src/hooks/useSaveSession.ts src/components/hierro/SessionHeader.tsx src/components/hierro/RegistrarView.tsx src/components/hierro/Sesion.tsx src/components/hierro/Rutina.tsx src/styles/global.css`
Run: `git commit -m "feat: header de sesion sticky con guardar siempre visible"`

- [x] **Step 8: Auditoría T11-2**

Subagente `general` (NO edita): verifica que `sessionStartedAt` se cree al cargar un día o completar la primera serie, se conserve al recargar y se borre al guardar/vaciar/importar/borrar todo; que `Sesion` y `SessionHeader` usen el mismo `useSaveSession`; que el header no cause hydration mismatch (`now` arranca en `null`); y corre `tsc`/`npm test` (56)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 3: Composer plegado con autocompletado

**Files:**
- Modify: `src/lib/session.ts` (`ExerciseSuggestion`, `suggestExercises`, `stepValue`)
- Modify: `src/lib/test/session.test.ts`
- Modify: `src/components/hierro/Sesion.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `suggestExercises(history: SessionHistory[], query: string, limit?: number): ExerciseSuggestion[]`.
- Produces: `stepValue(value: number | string | null, delta: number, min?: number): number`.
- `ExerciseSuggestion = { name: string; group?: string; reps?: string; rest?: string; note?: string }`.

- [x] **Step 1: Escribir los tests que fallan**

Agregar a `src/lib/test/session.test.ts`:

```ts
import { stepValue, suggestExercises } from '../session'
import type { SessionHistory } from '../types'

const hist = (name: string): SessionHistory => ({
  id: 'h',
  ts: '2026-10-20T10:00:00Z',
  volume: 0,
  focus: 'espalda',
  exercises: [
    {
      id: 'e',
      name,
      group: 'espalda',
      reps: '6–10',
      rest: '2 min',
      sets: [set(10, 100, true)]
    }
  ]
})

describe('suggestExercises', () => {
  it('busca en la rutina y prioriza el historial reciente con query vacía', () => {
    const h = [hist('Remo con barra')]
    const press = suggestExercises(h, 'press')
    expect(press.length).toBeGreaterThan(0)
    expect(press.every((s) => /press/i.test(s.name))).toBe(true)
    expect(suggestExercises(h, '')[0].name).toBe('Remo con barra')
  })
})

describe('stepValue', () => {
  it('suma, resta, clampa en 0 y redondea a dos decimales', () => {
    expect(stepValue('', 2.5)).toBe(2.5)
    expect(stepValue(50, -2.5)).toBe(47.5)
    expect(stepValue(0, -2.5)).toBe(0)
    expect(stepValue('1.1', 0.2)).toBe(1.3)
  })
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `suggestExercises` y `stepValue` no existen.

- [x] **Step 3: Implementar catálogo y pasos**

En `src/lib/session.ts`, agregar:

```ts
import { ROUTINE } from '../data/routine'
import { allExerciseNames } from './logic'
import { normName } from './util'
import type { Exercise, SessionHistory, SetData } from './types'

export interface ExerciseSuggestion {
  name: string
  group?: string
  reps?: string
  rest?: string
  note?: string
}

export function suggestExercises(
  history: SessionHistory[],
  query: string,
  limit = 6
): ExerciseSuggestion[] {
  const q = normName(query)
  const routine: ExerciseSuggestion[] = ROUTINE.flatMap((d) =>
    d.ex.map((r) => ({
      name: r.n,
      group: r.g,
      reps: r.reps,
      rest: r.rest,
      note: r.note
    }))
  )
  const byName = new Map(routine.map((r) => [normName(r.name), r]))
  const recent: ExerciseSuggestion[] = allExerciseNames(history).map(
    ([, v]) => byName.get(normName(v.disp)) ?? { name: v.disp }
  )
  const pool = q ? [...routine, ...recent] : [...recent, ...routine]
  const seen = new Set<string>()
  const out: ExerciseSuggestion[] = []
  for (const item of pool) {
    const k = normName(item.name)
    if (seen.has(k)) continue
    if (q && !k.includes(q)) continue
    seen.add(k)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

export function stepValue(
  value: number | string | null,
  delta: number,
  min = 0
): number {
  const n = Number(value)
  const base = Number.isFinite(n) ? n : 0
  return Math.max(min, Math.round((base + delta) * 100) / 100)
}
```

- [x] **Step 4: Plegar el composer y conectarlo al catálogo**

En `Sesion.tsx`:

1. Importar `normName` y `suggestExercises`, `type ExerciseSuggestion`.
2. Estado nuevo:

```tsx
const [picked, setPicked] = useState<ExerciseSuggestion | null>(null)
const [acOpen, setAcOpen] = useState(false)
const suggestions = suggestExercises(history, name, 6)
```

3. En `addEx`, resolver metadata:

```tsx
const meta =
  picked && normName(picked.name) === normName(trim)
    ? picked
    : suggestions.find((s) => normName(s.name) === normName(trim)) ?? null
const ex: Exercise = {
  id: uid(),
  name: trim,
  group: meta?.group ?? group,
  reps: meta?.reps,
  rest: meta?.rest,
  note: meta?.note,
  sets: [{ reps: last?.[0]?.reps ?? '', kg: last?.[0]?.kg ?? '', done: false }]
}
```

4. Al elegir una sugerencia:

```tsx
const pickSuggestion = (s: ExerciseSuggestion): void => {
  setName(s.name)
  setPicked(s)
  if (s.group) setGroup(s.group)
  setAcOpen(false)
}
```

5. Mover el bloque `.add-ex` **después** de `#exList` y envolverlo:

```tsx
<details className="add-ex-wrap">
  <summary>+ Añadir ejercicio</summary>
  <div className="add-ex">
    <div className="ac-wrap">
      <input
        ref={nameInput}
        type="text"
        id="exName"
        placeholder="Nombre del ejercicio (p. ej. Press de banca)"
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
        <ul className="ac-list">
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
```

6. Cambiar el estado vacío:
   “Cargá tu día desde **Plan** o añadí un ejercicio abajo.”
   El enlace “Cargar el día de hoy de la rutina” pasa a “Ir a Plan” y llama `setView('plan', true)`.

CSS:

```css
.add-ex-wrap {
  margin-top: 14px;
  border-top: 1px dashed var(--line);
  padding-top: 12px;
}
.add-ex-wrap > summary {
  cursor: pointer;
  list-style: none;
  font: 700 11px 'Space Grotesk';
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  min-height: 44px;
  display: flex;
  align-items: center;
}
.add-ex-wrap > summary::-webkit-details-marker {
  display: none;
}
.add-ex-wrap[open] > summary {
  color: var(--volt);
  margin-bottom: 12px;
}
.ac-wrap {
  position: relative;
}
.ac-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--panel2);
  border: 1px solid var(--line);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.45);
  max-height: 240px;
  overflow: auto;
}
.ac-list button {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.ac-list button:hover,
.ac-list button:focus-visible {
  background: rgba(201, 242, 75, 0.08);
}
.ac-list b {
  font-size: 13px;
}
.ac-list span {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

En `@media (max-width: 600px)`, `.add-ex` ya pasa a una columna; mantener.

- [x] **Step 5: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **58 passed**.
Run: `npm run build` → OK.

Prueba manual: abrir Registrar con una sesión cargada; confirmar que los ejercicios aparecen primero y el composer queda al final. Escribir “press” y elegir “Press de banca”; verificar que se autocompletan grupo, reps, descanso y nota.

Run: `git add src/lib/session.ts src/lib/test/session.test.ts src/components/hierro/Sesion.tsx src/styles/global.css`
Run: `git commit -m "feat: composer plegado con autocompletado de ejercicios"`

- [x] **Step 6: Auditoría T11-3**

Subagente `general` (NO edita): verifica que el composer esté después de la lista, que el autocompletado no tape inputs de forma permanente, que elegir un ejercicio de la rutina complete grupo/reps/rest/nota, que el historial reciente aparezca con query vacía y corre `tsc`/`npm test` (58)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 4: Fila de serie v2 (una mano, sin scroll)

**Files:**
- Modify: `src/components/hierro/Sesion.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consume: `nextPending` y `stepValue` de `src/lib/session.ts`.
- No agrega helpers puros nuevos.

- [x] **Step 1: Agregar estado activo y barra de herramientas**

En `Sesion.tsx`:

```tsx
const [active, setActive] = useState<{ exId: string; si: number } | null>(null)
```

Cada `.set-row` recibe:

```tsx
data-set={`${e.id}-${si}`}
className={`set-row${s.done ? ' done' : ''}${
  active?.exId === e.id && active.si === si ? ' active' : ''
}`}
```

Los inputs agregan `data-field="reps"` / `data-field="kg"` y
`onFocus={() => setActive({ exId: e.id, si })}`.

En el `onClick` de `.del-set`, limpiar la selección antes de borrar: `setActive(null)`. `si` es un índice y al borrar una serie se reindexan las siguientes; sin esto, la barra de herramientas puede quedar apuntando a otra fila.

Después de la fila activa, renderizar:

```tsx
{active?.exId === e.id && active.si === si ? (
  <div className="set-tools">
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
        setSetField(e.id, si, 'reps', String(stepValue(s.reps, 1)))
      }
    >
      +1 rep
    </button>
    <button
      type="button"
      onClick={() =>
        setSetField(e.id, si, 'kg', String(stepValue(s.kg, -2.5)))
      }
    >
      −2,5 kg
    </button>
    <button
      type="button"
      onClick={() =>
        setSetField(e.id, si, 'kg', String(stepValue(s.kg, 2.5)))
      }
    >
      +2,5 kg
    </button>
    <button type="button" onClick={() => repeatSet(e, si)}>
      Repetir
    </button>
  </div>
) : null}
```

Implementar `repeatSet`:

```tsx
const repeatSet = (e: Exercise, si: number): void => {
  const last = lastSets(history, e.name)
  const hasData = (s?: SetData): boolean =>
    !!s && ((s.reps !== '' && s.reps != null) || (s.kg !== '' && s.kg != null))
  const prevSet = e.sets[si - 1]
  const src = hasData(prevSet) ? prevSet : last?.[si] ?? last?.[0]
  if (!hasData(src)) {
    toast('No hay una serie anterior para repetir', 'warn')
    return
  }
  if (src.reps !== '' && src.reps != null)
    setSetField(e.id, si, 'reps', String(src.reps))
  if (src.kg !== '' && src.kg != null)
    setSetField(e.id, si, 'kg', String(src.kg))
}
```

- [x] **Step 2: Mostrar “La vez pasada”**

Dentro de cada `ex-card`, antes de `<div className="sets">`:

```tsx
{lastSets(history, e.name)?.some(
  (s) => (s.reps !== '' && s.reps != null) || (s.kg !== '' && s.kg != null)
) ? (
  <p className="ex-last">
    La vez pasada:{' '}
    {lastSets(history, e.name)!
      .filter(
        (s) =>
          (s.reps !== '' && s.reps != null) &&
          (s.kg !== '' && s.kg != null)
      )
      .slice(0, 4)
      .map(
        (s) =>
          `${fmtN(Number(s.kg), 1)}×${String(s.reps)}`
      )
      .join(' · ')}
    {e.reps ? ` · objetivo ${e.reps}` : ''}
  </p>
) : null}
```

- [x] **Step 3: Auto-scroll y cadena Enter**

Agregar helper local:

```tsx
const focusSet = (exId: string, si: number): void => {
  window.requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `[data-set="${exId}-${si}"]`
    )
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    row?.querySelector<HTMLInputElement>('input[data-field="reps"]')?.focus({
      preventScroll: true
    })
  })
}
```

Envolver el tildado en `markDone(e, si)`:

```tsx
const markDone = (e: Exercise, si: number): void => {
  const s = e.sets[si]
  if (!s || s.done) return
  toggleSetDone(e.id, si)
  const nextInEx = nextPending(e.sets, si + 1)
  if (nextInEx >= 0) {
    focusSet(e.id, nextInEx)
  } else {
    const nextEx = exercises.find(
      (x) => x.id !== e.id && nextPending(x.sets) >= 0
    )
    if (nextEx) focusSet(nextEx.id, nextPending(nextEx.sets))
  }
  const sec = parseRest(e.rest) || 90
  useTimerStore.getState().start(sec, `${e.name} · S${si + 1}`)
}
```

Reemplazar el `onClick` del `.set-check` por:

```tsx
onClick={() => {
  if (s.done) toggleSetDone(e.id, si)
  else markDone(e, si)
}}
```

En el input de reps:

```tsx
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
```

En el input de kg:

```tsx
onKeyDown={(ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault()
    markDone(e, si)
  }
}}
```

- [x] **Step 4: Estilos de la fila v2**

En `global.css`:

```css
.set-row.active {
  background: rgba(201, 242, 75, 0.06);
}
.set-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0 10px 58px;
}
.set-tools button {
  min-height: 44px;
  min-width: 44px;
  padding: 0 10px;
  background: none;
  border: 1px solid var(--line);
  color: var(--muted);
  font: 700 11px 'Space Grotesk';
  letter-spacing: 0.04em;
  cursor: pointer;
}
.set-tools button:hover {
  border-color: var(--gc);
  color: var(--gc);
}
.ex-last {
  margin: 8px 14px 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.ex-last b {
  color: var(--teal);
}
.set-row input {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 400px) {
  .sets-head,
  .set-row {
    gap: 8px;
  }
  .set-tools {
    padding-left: 0;
  }
}
```

No achicar `.set-check` ni `.set-row input`: R1 ya los dejó en 48 px de alto.

- [x] **Step 5: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **58 passed** (sin tests nuevos).
Run: `npm run build` → OK.

Prueba manual en 390×844:
1. Cargar un día y confirmar que la primera serie está a 0 px de scroll.
2. Tocar reps, usar `+2,5 kg`, `Repetir`, tildar; verificar que el foco salta a la siguiente pendiente.
3. Completar con Enter: reps → kg → tildar.
4. Verificar que “La vez pasada” coincide con el historial y que el timer arranca con 90 s si el ejercicio no tiene descanso.

Run: `git add src/components/hierro/Sesion.tsx src/styles/global.css`
Run: `git commit -m "feat: fila de serie rapida con herramientas y autoavance"`

- [x] **Step 6: Auditoría T11-4**

Subagente `general` (NO edita): verifica que tildar avance a la próxima pendiente, que Enter haga reps → kg → tildar, que `Repetir` use la serie anterior o la última sesión, que borrar siga teniendo undo y que los controles midan ≥44 px; corre `tsc`/`npm test` (58)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 5: Timer manual + overlay con siguiente serie

**Files:**
- Modify: `src/store/timerStore.ts` (`openPanel`, `setOpenPanel`)
- Modify: `src/components/shared/Timer.tsx`
- Modify: `src/components/hierro/SessionHeader.tsx`
- Modify: `src/components/hierro/Sesion.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Timer store: `openPanel: boolean`, `setOpenPanel(open: boolean): void`.
- `Timer` consume `nextPending` para mostrar “Siguiente: …”.

- [x] **Step 1: Extender el store**

En `src/store/timerStore.ts`:

```ts
interface TimerStore {
  // ...
  openPanel: boolean
  setOpenPanel: (open: boolean) => void
}
```

Estado inicial:

```ts
openPanel: false,
setOpenPanel: (open) =>
  set((s) => ({ openPanel: open, done: open ? false : s.done })),
```

En `start`: agregar `openPanel: false` al `set`.
En `stop`: agregar `openPanel: false` al `set`.

- [x] **Step 2: Reescribir la UI del timer**

Reemplazar `src/components/shared/Timer.tsx` por:

```tsx
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
            <button type="button" onClick={() => setOpenPanel(false)} aria-label="Cerrar">
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
                {p < 60 ? `${p} s` : `${p / 60} min`}
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
            <button type="button" onClick={() => add(-15)} aria-label="Restar 15 segundos">
              −15
            </button>
            <button type="button" onClick={toggle} aria-label={paused ? 'Reanudar' : 'Pausar'}>
              {paused ? '▶' : 'II'}
            </button>
            <button type="button" onClick={() => add(15)} aria-label="Sumar 15 segundos">
              +15
            </button>
            <button type="button" onClick={stop} aria-label="Cerrar temporizador">
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [x] **Step 3: Abrir el panel desde el header**

En `SessionHeader.tsx`:

- Importar `useTimerStore`.
- Agregar antes del botón Guardar:

```tsx
<button
  type="button"
  className="btn btn-ghost sh-timer"
  onClick={() => useTimerStore.getState().setOpenPanel(true)}
>
  ⏱ Descanso
</button>
```

- En `Sesion.tsx`, el descanso por defecto ya queda en `parseRest(e.rest) || 90` (Task 4).

- [x] **Step 4: CSS del overlay**

En `global.css`, dentro de `#timer` agregar `flex-wrap: wrap;` y `max-width: min(420px, calc(100vw - 24px));`.
Agregar:

```css
.t-presets {
  width: 100%;
}
.t-presets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.t-presets-head b {
  font-family: Anton;
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.t-presets-head button {
  min-width: 44px;
  min-height: 44px;
  background: none;
  border: 1px solid var(--line);
  color: var(--muted);
  cursor: pointer;
}
.t-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.t-preset-grid button {
  min-height: 44px;
  background: none;
  border: 1px solid var(--line);
  color: var(--ink);
  font: 700 12px 'Space Grotesk';
  cursor: pointer;
}
.t-preset-grid button:hover {
  border-color: var(--orange);
  color: var(--orange);
}
.t-next {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sh-timer {
  min-height: 44px;
  padding: 10px 12px;
}
@media (max-width: 640px) {
  #timer {
    left: 12px;
    bottom: calc(12px + var(--tabbar-h));
  }
}
```

Verificar que `#timer` siga con `z-index: 99` y los toasts arriba (`z-index: 110`).

- [x] **Step 5: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **58 passed**.
Run: `npm run build` → OK.

Prueba manual: abrir “⏱ Descanso” desde el header, elegir 90 s, verificar anillo, pausa, ±15 y que “Siguiente” muestre la próxima serie pendiente. Confirmar que el overlay no tapa los toasts ni el tabbar.

Run: `git add src/store/timerStore.ts src/components/shared/Timer.tsx src/components/hierro/SessionHeader.tsx src/components/hierro/Sesion.tsx src/styles/global.css`
Run: `git commit -m "feat: timer manual con presets y siguiente serie"`

- [x] **Step 6: Auditoría T11-5**

Subagente `general` (NO edita): verifica presets 60/90/120/180, pausa real, ±15, cierre, etiqueta de siguiente serie, que al abrir el panel con `done=true` se reseteen los presets, que el timer siga por `endsAt` y que no se solape con toasts/tabbar a 360/390/412 px; corre `tsc`/`npm test` (58)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 6: Fin de semana explícito + `Cargar día` navegable + `ConfirmSheet`

**Files:**
- New: `src/lib/routine.ts`
- New: `src/lib/test/routine.test.ts`
- New: `src/components/shared/ConfirmSheet.tsx`
- Modify: `src/components/hierro/Rutina.tsx`
- Modify: `src/components/shared/FooterBar.tsx`
- Modify: `src/components/hierro/Sesion.tsx` (copy del estado vacío)
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `lastTrainedDayIdx(history: SessionHistory[]): number | null`.
- Produces: `isWeekend(date: Date): boolean`.
- `ConfirmSheet` props: `{ open: boolean; title: string; children?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/test/routine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { lastTrainedDayIdx } from '../routine'
import { ROUTINE } from '../../data/routine'
import type { SessionHistory } from '../types'

const hist = (names: string[]): SessionHistory => ({
  id: 'h',
  ts: '2026-10-23T10:00:00Z',
  volume: 0,
  focus: 'pecho',
  exercises: names.map((name, i) => ({
    id: String(i),
    name,
    group: 'pecho',
    sets: [{ reps: 10, kg: 50, done: true }]
  }))
})

describe('lastTrainedDayIdx', () => {
  it('detecta el día de la rutina por los ejercicios de la última sesión', () => {
    const friday = hist(ROUTINE[4].ex.slice(0, 2).map((e) => e.n))
    expect(lastTrainedDayIdx([friday])).toBe(4)
    const monday = hist(ROUTINE[0].ex.slice(0, 2).map((e) => e.n))
    expect(lastTrainedDayIdx([monday])).toBe(0)
  })

  it('devuelve null sin historial o con ejercicios fuera de la rutina', () => {
    expect(lastTrainedDayIdx([])).toBeNull()
    expect(lastTrainedDayIdx([hist(['Ejercicio inventado'])])).toBeNull()
  })
})
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — no existe `src/lib/routine.ts`.

- [ ] **Step 3: Implementar helpers de rutina**

Crear `src/lib/routine.ts`:

```ts
import { ROUTINE } from '../data/routine'
import type { SessionHistory } from './types'
import { normName } from './util'

export function isWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function lastTrainedDayIdx(history: SessionHistory[]): number | null {
  const last = history[0]
  if (!last) return null
  const names = new Set(last.exercises.map((e) => normName(e.name)))
  let best = -1
  let bestCount = 0
  ROUTINE.forEach((d, i) => {
    const count = d.ex.filter((r) => names.has(normName(r.n))).length
    if (count > bestCount) {
      bestCount = count
      best = i
    }
  })
  return best >= 0 && bestCount > 0 ? best : null
}
```

- [ ] **Step 4: Navegar al registrar al cargar un día y usar undo**

En `Rutina.tsx`:

1. Importar `isWeekend`, `lastTrainedDayIdx` y `useAppStore` ya está.
2. Obtener `const setView = useAppStore((s) => s.setView)`.
3. Cambiar `loadDay` para aceptar un día:

```tsx
const loadDay = (idx = dayIdx): void => {
  const target = ROUTINE[idx]
  const prev = exercises
  const prevStart = useAppStore.getState().sessionStartedAt
  const activeFor = (d: RoutineExercise): number[] => {
    let a = d.sets.filter((w) => w <= wk)
    if (deload) a = a.slice(0, Math.ceil(a.length / 2))
    return a
  }
  const buildOne = (d: RoutineExercise): Exercise => {
    const last = lastSets(history, d.n)
    const sets: SetData[] = activeFor(d).map((_, i) => ({
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
  replaceExercises(target.ex.map((d) => buildOne(d)))
  useAppStore.getState().startSession()
  setView('registrar', true)
  const had = target.ex.some((d) => lastSets(history, d.n))
  toast(
    `${target.day} cargado${had ? ' · con tus últimas cargas' : ' 💪'}`,
    'ok',
    prev.length
      ? {
          label: 'Deshacer',
          run: () => {
            useAppStore.getState().replaceExercises(prev)
            useAppStore.getState().restoreSessionStart(prevStart)
          }
        }
      : undefined
  )
}
```

4. Eliminar el `confirm()`; el `scrollIntoView` ya se quitó en la Task 1.
5. El botón `Cargar día completo en sesión` usa `onClick={() => loadDay()}`.

- [ ] **Step 5: Banner de fin de semana**

El banner no puede leer `new Date()` durante el render: `Rutina` se prerenderiza y la fecha del build no es la del usuario. Resolver la fecha después del montaje. En `Rutina.tsx`, cambiar el import a `import { useEffect, useMemo, useState } from 'react'` y agregar:

```tsx
const [today, setToday] = useState<Date | null>(null)

useEffect(() => {
  setToday(new Date())
}, [])
```

Antes de `.day-title`, renderizar:

```tsx
{today && isWeekend(today) ? (
  <div className="weekend-banner">
    <span>
      <b>Hoy no toca bloque.</b> Te preparo el lunes.
    </span>
    <button className="btn btn-volt" onClick={() => loadDay(0)}>
      Cargar lunes
    </button>
    {lastTrainedDayIdx(history) != null ? (
      <button
        className="btn btn-ghost"
        onClick={() => loadDay(lastTrainedDayIdx(history)!)}
      >
        Repetir {ROUTINE[lastTrainedDayIdx(history)!].short}
      </button>
    ) : null}
  </div>
) : null}
```

CSS:

```css
.weekend-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border: 1px solid var(--line);
  border-left: 3px solid var(--orange);
  background: var(--panel2);
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 13px;
}
.weekend-banner b {
  color: var(--orange);
}
.weekend-banner .btn {
  padding: 10px 14px;
  min-height: 44px;
}
```

- [ ] **Step 6: Crear `ConfirmSheet` y reemplazar los `window.confirm`**

Crear `src/components/shared/ConfirmSheet.tsx`:

```tsx
import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmSheet({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className={`confirm-card${danger ? ' danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        <div className="confirm-body">{children}</div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-orange' : 'btn-volt'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

CSS:

```css
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.64);
  display: grid;
  place-items: center;
  padding: 20px;
}
.confirm-card {
  width: min(440px, 100%);
  background: var(--panel2);
  border: 1px solid var(--line);
  border-top: 3px solid var(--volt);
  padding: 20px;
  box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.5);
}
.confirm-card.danger {
  border-top-color: var(--red);
}
.confirm-card h3 {
  font-family: Anton;
  font-weight: 400;
  font-size: 22px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.confirm-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}
.confirm-body b {
  color: var(--ink);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}
.confirm-actions .btn {
  min-height: 44px;
}
```

En `FooterBar.tsx`:

1. Importar `useState`, `ConfirmSheet`, `type BackupV3`.
2. Estado:

```tsx
const [pendingImport, setPendingImport] = useState<BackupV3 | null>(null)
const [wipeOpen, setWipeOpen] = useState(false)
```

3. `onImport` parsea y hace `setPendingImport(d)` en vez de `window.confirm`.
4. `wipe` hace `setWipeOpen(true)`.
5. Renderizar al final:

```tsx
<ConfirmSheet
  open={!!pendingImport}
  title="Importar respaldo"
  confirmLabel="Reemplazar datos"
  onCancel={() => setPendingImport(null)}
  onConfirm={() => {
    if (!pendingImport) return
    useAppStore.getState().restoreAll({
      session: Array.isArray(pendingImport.session) ? pendingImport.session : [],
      history: Array.isArray(pendingImport.history) ? pendingImport.history : [],
      body: Array.isArray(pendingImport.body) ? pendingImport.body : [],
      week:
        pendingImport.week && pendingImport.week.week
          ? pendingImport.week
          : undefined
    })
    setPendingImport(null)
    toast('Respaldo importado ✔')
  }}
>
  <p>
    Esto <b>reemplaza</b> tu sesión, historial, medidas y semana actuales.
    ¿Continuar?
  </p>
</ConfirmSheet>

<ConfirmSheet
  open={wipeOpen}
  title="Borrar todos los datos"
  confirmLabel="Borrar todo"
  danger
  onCancel={() => setWipeOpen(false)}
  onConfirm={() => {
    useAppStore.getState().wipe()
    setWipeOpen(false)
    toast('Todos los datos fueron borrados', 'warn')
  }}
>
  <p>
    Se borran sesión, historial, antropometría y semana. <b>No se puede deshacer.</b>
  </p>
</ConfirmSheet>
```

6. Verificar que no quede ningún `window.confirm` en `FooterBar.tsx`.

- [ ] **Step 7: Copy del estado vacío**

En `Sesion.tsx`, cambiar el enlace del estado vacío para que navegue a Plan:

```tsx
<button
  className="link-btn"
  id="sampleEx"
  onClick={() => useAppStore.getState().setView('plan', true)}
>
  Ir a Plan para cargar un día
</button>
```

Cambiar el texto “Cargá tu día de la rutina o añadí uno manual arriba” por
“Cargá tu día desde Plan o añadí un ejercicio abajo.”

- [ ] **Step 8: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **60 passed**.
Run: `npm run build` → OK.

Prueba manual:
1. En sábado/domingo, abrir Plan y ver el banner; cargar lunes y verificar que salta a Registrar.
2. Cargar un día con una sesión existente y usar “Deshacer”.
3. Importar un respaldo y borrar todos los datos: verificar que se usan las hojas propias y no `window.confirm`.

Run: `git add src/lib/routine.ts src/lib/test/routine.test.ts src/components/shared/ConfirmSheet.tsx src/components/hierro/Rutina.tsx src/components/shared/FooterBar.tsx src/components/hierro/Sesion.tsx src/styles/global.css`
Run: `git commit -m "feat: fin de semana explicito y confirmaciones propias"`

- [ ] **Step 9: Auditoría T11-6**

Subagente `general` (NO edita): verifica que no queden `window.confirm`/`confirm(` en componentes, que `Cargar día` navegue a Registrar y ofrezca undo, que el banner de fin de semana explique el lunes y permita repetir el último día, y corre `tsc`/`npm test` (60)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 7: Documentación y cierre de R2

**Files:**
- Modify: `README.md`
- Modify: `MIGRACION-ASTRO.md`
- Modify: `PLAN-V1.md` (Tarea 11)

- [ ] **Step 1: Documentar la nueva IA**

`README.md`:

- Reemplazar la descripción de tres pestañas por:
  “Cuatro vistas: **Registrar** (home, sesión en curso), **Plan** (rutina, semana y deload), **Cuerpo** (antropometría) y **Progreso** (volumen y progresión). `#hierro` sigue funcionando como alias de `#registrar`.”
- Agregar en Funcionalidades:
  “Header de sesión sticky con series completadas, volumen y tiempo; Guardar siempre visible.”
  “Composer plegado con autocompletado desde la rutina y el historial.”
  “Timer de descanso manual con presets 60/90/120/180 y aviso de la siguiente serie.”
  “Fin de semana explícito: la app propone el lunes o repetir el último día entrenado.”
- En la nota de limitaciones del timer, dejar claro que con la PWA cerrada o la pantalla apagada el sistema puede suspender el aviso; el tiempo se corrige al volver.

`MIGRACION-ASTRO.md`, en `## Estado`:

```markdown
- Decisión post-migración (2026-10-23): la app pasa a cuatro vistas (`registrar`, `plan`,
  `cuerpo`, `progreso`). `#hierro` es alias de `#registrar`. La sesión en curso se abre en
  `Registrar`; la rutina vive en `Plan`.
- Decisión post-migración (2026-10-23): `forja_session_start` guarda el inicio de la sesión
  actual. Es estado de UI: no entra en el respaldo v3 y se borra al guardar, vaciar,
  importar o borrar todos los datos.
```

En la misma sección `## Fase 3 — Componentes React (islas)`, actualizar la lista de
`src/components/hierro/`: quitar `HierroView.tsx` y listar `RegistrarView.tsx`, `PlanView.tsx`,
`Stats.tsx` y `SessionHeader.tsx`. En la línea de la URL hash, documentar
`#registrar/#plan/#cuerpo/#progreso` con `#hierro` como alias de `#registrar`. Sin esto, el
auditor final de R2 encuentra una referencia a un archivo eliminado.

- [ ] **Step 2: Marcar la Tarea 11 en PLAN-V1.md**

Bajo `## Tarea 11 — Modo GYM R2: sesión-first`, marcar T11-1 a T11-6 con `[x]` y el
resultado de cada auditoría. Agregar al final:

```markdown
- **Cierre R2 (2026-10-23)**: auditor final APROBADO (60 tests, tsc + build OK, primera
  serie sin scroll a 390×844, 4 pestañas + alias, Guardar visible, timer manual y
  ConfirmSheet sin `window.confirm`).
```

- [ ] **Step 3: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **60 passed**.
Run: `npm run build` → OK con `[forja-pwa] sw.js generado con N archivos`.

Smoke test:
Run: `npm run preview` (background, puerto 4321).
Verificar HTTP 200 de `/`, `/#registrar`, `/#plan`, `/#hierro`, `/manifest.json`, `/sw.js`.
Verificar en DevTools 360×844, 390×844 y 412×915:
1. Primera serie visible sin scroll con un día cargado.
2. Sin scroll horizontal en Registrar/Plan.
3. Header de sesión sticky con Guardar visible.
4. 4 pestañas y tabbar navegan; back/forward respeta el hash.
5. Timer manual, presets y siguiente serie.
6. Fin de semana y ConfirmSheet.

- [ ] **Step 4: Commit y auditor final**

Run: `git add README.md MIGRACION-ASTRO.md PLAN-V1.md`
Run: `git commit -m "docs: cerrar release 2 de sesion-first"`

Subagente `general` (NO edita): repasa Tasks 1–7, corre la validación completa, verifica que
no queden referencias a `HierroView`, `isEff`, `window.confirm`, ni `add15`; que `#hierro`
siga funcionando; que las cuatro vistas estén montadas; y que la primera serie quede visible
sin scroll. Devuelve APROBADO/RECHAZADO y la lista de archivos tocados.

---

## Criterio de salida de R2

- [ ] `npm test` → 60 passed.
- [ ] `npx tsc --noEmit -p tsconfig.check.json` → limpio.
- [ ] `npm run build` → OK, SW generado.
- [ ] 4 pestañas `Registrar / Plan / Cuerpo / Progreso`; `#hierro` sigue funcionando.
- [ ] Primera serie visible sin scroll a 390×844 con un día cargado.
- [ ] Registrar una serie lleva ≤ 8 s con una mano.
- [ ] Header sticky con series, volumen, tiempo y Guardar siempre visible.
- [ ] Composer plegado al final con autocompletado.
- [ ] Timer manual con presets y siguiente serie.
- [ ] Fin de semana explícito y `ConfirmSheet` sin `window.confirm`.
- [ ] Auditor final APROBADO y Tarea 11 cerrada en `PLAN-V1.md`.
