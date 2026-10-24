# Modo GYM R1 — Confiabilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que FORJA no mienta ni se rompa durante el entrenamiento: volumen canónico, fechas correctas, overlays sin solaparse, timer exacto tras suspensión, undo real, targets de 44 px y iconos PWA completos.

**Architecture:** Los helpers de volumen viven en `src/lib/logic.ts` y son la única fuente (`isCompletedSet`/`volumeOf`). El timer pasa de `setInterval` que descuenta a `endsAt` + `sync()` por timestamp, con resincronización en `visibilitychange`/`pageshow`/`focus` y Wake Lock opcional. Las fechas se formatean con un helper puro y se elimina `text-transform: capitalize`. Los toasts se mueven arriba y el timer queda abajo. El undo se implementa con acciones en el snackbar y snapshots de las colecciones del store.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Validación: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Estado base verificado: **33 tests** pasan y `tsc` está limpio. Al cerrar R1 deben pasar **48 tests**.
- `tsconfig.check.json` solo incluye `src/lib/**/*.ts`, `src/data/**/*.ts`, `src/store/**/*.ts`. Los componentes se validan con `npm run build` y prueba manual.
- Sin comentarios nuevos en el código. Copy en español rioplatense (voseo). Commits en español (`feat:`, `fix:`, `test:`, `docs:`).
- No tocar las claves `forja_session`, `forja_history`, `forja_body`, `forja_week` ni la versión 3 del respaldo.
- No hacer push. Rama `dev`.
- Cada tarea termina con commit y auditoría de un subagente `general` que **no edita**: verifica el diff, corre `tsc`/`npm test`/`npm run build` y devuelve APROBADO/RECHAZADO. El resultado se marca en `PLAN-V1.md`.
- Spec de referencia (leer antes de empezar): `docs/superpowers/specs/2026-10-23-modo-gym-design.md`.

---

### Task 1: Volumen canónico (solo series `done`)

**Files:**
- Modify: `src/lib/logic.ts` (`isEff`, `stagnant`, `weeklyVolume`, `exerciseSeries`)
- Modify: `src/store/appStore.ts` (`commitSession`)
- Modify: `src/components/hierro/HierroView.tsx` (stats)
- Modify: `src/components/hierro/Historial.tsx` (series y volumen)
- Modify: `src/components/hierro/Sesion.tsx` (volumen de sesión, volumen por ejercicio, mejor serie)
- Test: `src/lib/test/logic.test.ts`

**Interfaces:**
- Produces: `isCompletedSet(s: SetData): boolean`, `setVolume(s: SetData): number`, `completedSets(sets: SetData[]): SetData[]`, `volumeOf(sets: SetData[]): number`.
- Removes: `isEff` (sin consumidores fuera de `logic.ts` y sus tests).
- `weeklyVolume` conserva la firma y pasa a devolver `Record<string, WeeklyVolumeEntry>`; `exerciseSeries` y `stagnant` conservan sus firmas.
- Produces: `WeeklyVolumeEntry` (`{ sets: number; volume: number; ex: Set<string> }`).

- [x] **Step 1: Escribir los tests que fallan**

En `src/lib/test/logic.test.ts`, cambiar el import:

```ts
import {
  allExerciseNames,
  completedSets,
  exerciseSeries,
  focusOf,
  isCompletedSet,
  lastSets,
  mondayOf,
  parseRest,
  repRange,
  setVolume,
  stagnant,
  suggestFor,
  volumeOf,
  weeklyVolume
} from '../logic'
```

Reemplazar el bloque `describe('isEff', ...)` (líneas 111–117) por:

```ts
describe('isCompletedSet', () => {
  it('solo cuenta series con done=true', () => {
    expect(isCompletedSet(set(10, 100, true))).toBe(true)
    expect(isCompletedSet(set(10, 100, false))).toBe(false)
    expect(isCompletedSet(set(0, 0, false))).toBe(false)
  })
})

describe('completedSets', () => {
  it('devuelve solo las series completadas', () => {
    const sets = [set(10, 100, true), set(8, 80, false), set(6, 60, true)]
    expect(completedSets(sets)).toHaveLength(2)
    expect(completedSets(sets).every((s) => s.done)).toBe(true)
  })
})

describe('volumeOf', () => {
  it('suma solo series completadas y usa setVolume', () => {
    expect(
      volumeOf([set(10, 100, true), set(10, 100, false), { reps: 8, kg: 50, done: true }])
    ).toBe(1400)
    expect(setVolume(set(10, 100, true))).toBe(1000)
    expect(setVolume({ reps: '', kg: '', done: false })).toBe(0)
  })
})
```

Agregar dos casos al bloque `describe('weeklyVolume ...')`, antes del test de brazos:

```ts
it('ignora series con reps cargadas pero no completadas', () => {
  const h: SessionHistory[] = [
    hist(new Date(2026, 7, 3, 10, 0, 0).toISOString(), [
      { name: 'Press banca', sets: [set(10, 100, true), set(10, 100, false)] }
    ])
  ]
  expect(weeklyVolume(h, now)['pecho']).toEqual({
    sets: 1,
    volume: 1000,
    ex: new Set(['press banca'])
  })
})

it('cuenta una serie completada aunque no tenga reps ni kg', () => {
  const h: SessionHistory[] = [
    hist(new Date(2026, 7, 3, 10, 0, 0).toISOString(), [
      { name: 'Press banca', sets: [set(0, 0, true)] }
    ])
  ]
  expect(weeklyVolume(h, now)['pecho']).toEqual({
    sets: 1,
    volume: 0,
    ex: new Set(['press banca'])
  })
})
```

Agregar al bloque `describe('stagnant', ...)`:

```ts
it('ignora series no completadas al calcular el score', () => {
  const h = [
    hist('2026-07-22T10:00:00Z', [
      { name: 'Press banca', sets: [set(8, 100, true), set(8, 200, false)] }
    ]),
    hist('2026-07-21T10:00:00Z', [
      { name: 'Press banca', sets: [set(8, 100, true)] }
    ]),
    hist('2026-07-20T10:00:00Z', [
      { name: 'Press banca', sets: [set(8, 100, true)] }
    ])
  ]
  expect(stagnant(h)['press banca']).toBe(true)
})
```

Agregar al bloque `describe('exerciseSeries (e1RM Epley)', ...)`:

```ts
it('ignora series no completadas y omite sesiones sin completadas', () => {
  const h: SessionHistory[] = [
    hist('2026-07-26T10:00:00Z', [
      { name: 'Press banca', sets: [set(10, 120, false)] }
    ]),
    hist('2026-07-25T10:00:00Z', [
      { name: 'Press banca', sets: [set(10, 100, true), set(8, 150, false)] }
    ])
  ]
  const series = exerciseSeries(h, 'press banca')
  expect(series).toHaveLength(1)
  expect(series[0].kg).toBe(100)
  expect(series[0].vol).toBe(1000)
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `isCompletedSet`, `setVolume`, `completedSets` y `volumeOf` no existen; los casos nuevos de `weeklyVolume`, `stagnant` y `exerciseSeries` fallan.

- [x] **Step 3: Implementar los helpers y corregir la lógica**

En `src/lib/logic.ts`, reemplazar `isEff` (línea 94) por:

```ts
export const isCompletedSet = (s: SetData): boolean => s.done === true

export const setVolume = (s: SetData): number =>
  (Number(s.reps) || 0) * (Number(s.kg) || 0)

export const completedSets = (sets: SetData[]): SetData[] =>
  sets.filter(isCompletedSet)

export const volumeOf = (sets: SetData[]): number =>
  sets.reduce((a, s) => a + (isCompletedSet(s) ? setVolume(s) : 0), 0)
```

En `stagnant` (líneas 47–69), reemplazar el `forEach` interno por:

```ts
h.exercises.forEach((e) => {
  const k = normName(e.name)
  const done = completedSets(e.sets)
  if (!done.length) return
  const score = Math.max(
    0,
    ...done.map((s) => (Number(s.kg) || 0) * 10 + (Number(s.reps) || 0) / 100)
  )
  ;(occ[k] = occ[k] || []).push(score)
})
```

En `weeklyVolume` (líneas 118–124), exportar el tipo de entrada y reemplazar la firma:

```ts
export interface WeeklyVolumeEntry {
  sets: number
  volume: number
  ex: Set<string>
}

export function weeklyVolume(
  history: SessionHistory[],
  now: number = Date.now()
): Record<string, WeeklyVolumeEntry> {
  const weekStart = mondayOf(now)
  const out: Record<string, WeeklyVolumeEntry> = {}
```

En el mismo `weeklyVolume`, reemplazar `if (isEff(s))` por `if (isCompletedSet(s))`.

En `exerciseSeries` (líneas 167–174), reemplazar `e.sets.forEach((s) => {` por:

```ts
completedSets(e.sets).forEach((s) => {
```

- [x] **Step 4: Cambiar los consumidores**

`src/store/appStore.ts`, en `commitSession` (líneas 206–209), reemplazar el cálculo de `volume` por:

```ts
const volume = clean.reduce((a, e) => a + volumeOf(e.sets), 0)
```

Agregar `volumeOf` al import de `../lib/logic`.

`src/components/hierro/HierroView.tsx`, reemplazar el cálculo de stats (líneas 12–19) por:

```tsx
let v = 0
let sets = 0
exercises.forEach((e) => {
  v += volumeOf(e.sets)
  sets += completedSets(e.sets).length
})
```

Agregar `completedSets, volumeOf` al import de `../../lib/logic`.

`src/components/hierro/Historial.tsx`:

1. Agregar `isCompletedSet, volumeOf` al import de `../../lib/logic`.
2. Reemplazar `setsOf` por:

```tsx
const totalsOf = (h: SessionHistory): { done: number; total: number; volume: number } =>
  h.exercises.reduce(
    (a, e) => ({
      done: a.done + e.sets.filter(isCompletedSet).length,
      total: a.total + e.sets.length,
      volume: a.volume + volumeOf(e.sets)
    }),
    { done: 0, total: 0, volume: 0 }
  )
```

3. Dentro del `map`, agregar `const totals = totalsOf(h)`.
4. Reemplazar el bloque `<span className="hist-meta">` por:

```tsx
<span className="hist-meta">
  {h.exercises.length} ej · {totals.done}/{totals.total} series ·{' '}
  <b>{fmtN(Math.round(totals.volume))} kg</b>
</span>
```

`src/components/hierro/Sesion.tsx`:

1. Agregar `isCompletedSet, volumeOf` al import de `../../lib/logic`.
2. Reemplazar `volDone` (líneas 123–131) por:

```tsx
const volDone = exercises.reduce((a, e) => a + volumeOf(e.sets), 0)
```

3. En el `map` de ejercicios, reemplazar `const vol` (líneas 270–273) por:

```tsx
const vol = volumeOf(e.sets)
```

4. Reemplazar `const best` (línea 274) por:

```tsx
const best = Math.max(
  0,
  ...e.sets.filter(isCompletedSet).map((s) => Number(s.kg) || 0)
)
```

- [x] **Step 5: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **39 passed** (33 base − 1 `isEff` + 3 tests de helpers —`setVolume` se cubre dentro de `volumeOf`— + 2 `weeklyVolume` + 1 `stagnant` + 1 `exerciseSeries` = 39).
Run: `npm run build` → OK.

Run: `git add src/lib/logic.ts src/lib/test/logic.test.ts src/store/appStore.ts src/components/hierro/HierroView.tsx src/components/hierro/Historial.tsx src/components/hierro/Sesion.tsx`
Run: `git commit -m "feat: unificar volumen en series completadas"`

- [x] **Step 6: Auditoría T10-1**

Lanzar subagente `general` (NO edita): verifica que no quede ningún uso de `isEff`, que `weeklyVolume`, `exerciseSeries`, `stagnant`, `commitSession`, stats e historial usen `isCompletedSet`, que el volumen de la barra de sesión coincida con el historial para los mismos datos, y corre `tsc`/`npm test` (39)/`npm run build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 2: Fechas sin mayúsculas internas

**Files:**
- New: `src/lib/date.ts`
- New: `src/lib/test/date.test.ts`
- Modify: `src/components/shared/TopBar.tsx`
- Modify: `src/components/hierro/Historial.tsx`
- Modify: `src/components/hierro/HierroView.tsx`
- Modify: `src/components/cuerpo/CuerpoView.tsx`
- Modify: `src/styles/global.css` (`.chip-date b`, `.hist-date`, `.br-date`)

**Interfaces:**
- Produces: `capFirst(s: string): string`, `formatDate(value: string | number | Date, options: Intl.DateTimeFormatOptions): string`, `formatLongDate(value): string`, `formatWeekday(value): string`.

- [x] **Step 1: Escribir el helper y sus tests**

Crear `src/lib/date.ts`:

```ts
export const capFirst = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleDateString('es-ES', options)
}

export function formatLongDate(value: string | number | Date): string {
  return capFirst(
    formatDate(value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  )
}

export function formatWeekday(value: string | number | Date): string {
  return capFirst(formatDate(value, { weekday: 'short' }))
}
```

Crear `src/lib/test/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { capFirst, formatDate, formatLongDate, formatWeekday } from '../date'

describe('capFirst', () => {
  it('capitaliza solo la primera letra y tolera vacío', () => {
    expect(capFirst('sábado, 24 de octubre de 2026')).toBe(
      'Sábado, 24 de octubre de 2026'
    )
    expect(capFirst('')).toBe('')
  })
})

describe('formatLongDate', () => {
  it('deja una sola mayúscula inicial y no capitaliza las preposiciones', () => {
    const out = formatLongDate(new Date(2026, 9, 24, 12, 0, 0))
    expect(out).toMatch(/^[A-ZÁÉÍÓÚÑ]/)
    expect(out).toContain('2026')
    expect(out).not.toMatch(/\bDe\b/)
  })
})

describe('formatWeekday y formatDate', () => {
  it('devuelve día corto capitalizado y fecha corta sin capitalizar', () => {
    const d = new Date(2026, 9, 24, 12, 0, 0)
    expect(formatWeekday(d)).toMatch(/^[A-ZÁÉÍÓÚÑ]/)
    expect(formatDate(d, { day: 'numeric', month: 'short' })).not.toMatch(/\bDe\b/)
  })
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — no existe `src/lib/date.ts`.

- [x] **Step 3: Reemplazar los formateos inline**

`src/components/shared/TopBar.tsx`:

- Agregar `import { formatLongDate } from '../../lib/date'`.
- Reemplazar el bloque `now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })` por `formatLongDate(now)`.

`src/components/hierro/Historial.tsx`:

- Agregar `import { formatDate, formatWeekday } from '../../lib/date'`.
- Reemplazar:

```tsx
const weekday = formatWeekday(h.ts)
const date = formatDate(h.ts, { day: 'numeric', month: 'short', year: 'numeric' })
```

`src/components/hierro/HierroView.tsx`:

- Agregar `import { formatDate } from '../../lib/date'`.
- Reemplazar el `toLocaleDateString` del `#stLast` por:

```tsx
{lastTs ? formatDate(lastTs, { day: 'numeric', month: 'short' }) : '—'}
```

`src/components/cuerpo/CuerpoView.tsx`:

- Agregar `import { formatDate } from '../../lib/date'`.
- Reemplazar el `toLocaleDateString` de `.br-date` por:

```tsx
{formatDate(r.ts, { day: 'numeric', month: 'short', year: '2-digit' })}
```

`src/styles/global.css`: eliminar `text-transform: capitalize;` de `.chip-date b` (línea 217), `.hist-date` (línea 1369) y `.br-date` (línea 1677). No cambiar nada más de esas reglas.

- [x] **Step 4: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **42 passed**.
Run: `npm run build` → OK.

Run: `git add src/lib/date.ts src/lib/test/date.test.ts src/components/shared/TopBar.tsx src/components/hierro/Historial.tsx src/components/hierro/HierroView.tsx src/components/cuerpo/CuerpoView.tsx src/styles/global.css`
Run: `git commit -m "fix: fechas sin mayusculas internas"`

- [x] **Step 5: Auditoría T10-2**

Subagente `general` (NO edita): verifica que no quede `text-transform: capitalize` en fechas, que TopBar/Historial/Cuerpo/Hierro usen el helper, que la salida sea “sábado, 24 de octubre de 2026” (sin “De”), y corre `tsc`/`npm test` (42)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 3: Overlays sin solapamiento

**Files:**
- Modify: `src/styles/global.css` (`#toasts`, `.toast`, media query móvil)

**Interfaces:** ninguna. Cambio solo CSS; no toca la lógica de `toast.ts` ni `timerStore.ts`.

- [x] **Step 1: Mover los toasts arriba**

En `src/styles/global.css`, reemplazar el bloque `#toasts` (líneas 2158–2166) por:

```css
#toasts {
  position: fixed;
  top: calc(96px + env(safe-area-inset-top, 0px));
  right: 22px;
  z-index: 110;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}
```

En `.toast` (línea 2167), agregar `pointer-events: auto;`.

Inmediatamente **después** de la regla base `.toast` (para que el override gane en la cascada), agregar:

```css
@media (max-width: 1020px) {
  #toasts {
    left: 12px;
    right: 12px;
    align-items: stretch;
  }
  .toast {
    max-width: none;
  }
}

@media (max-width: 640px) {
  #toasts {
    top: calc(168px + env(safe-area-inset-top, 0px));
  }
}
```

El header móvil mide 136–157 px de alto a 360/390/412 (envuelve fecha y reloj); `top: 96px` lo dejaba tapado. El offset de 168 px deja 11 px de aire sobre el caso más alto. No repitas `top` en el bloque de 1020 px. No lo pongas dentro del `@media` de la tabbar: ese bloque está antes de las reglas base de `#toasts`/`.toast` y perdería `right`, `align-items` y `max-width` por orden de cascada.

No cambiar la posición de `#timer`: sigue abajo a la izquierda con
`bottom: calc(22px + var(--tabbar-h))`.

- [x] **Step 2: Validar visualmente**

Run: `npm run build` → OK.
Run: `npm run preview` en background.
Abrir Chrome DevTools en 360×844, 390×844 y 412×915:
1. Cargar un día y tildar una serie para iniciar el timer.
2. Borrar una serie y un ejercicio para disparar dos toasts.
3. Verificar con `getBoundingClientRect()` que el `top` del toast es mayor que el `bottom`
   del header en 360/390/412, y que los botones del timer (`−15`, pausa, `+15`, cerrar)
   reciben click sin que nada los tape.
4. Verificar que el toast no bloquea el header sticky (la capa `#toasts` tiene
   `pointer-events: none`; solo el `.toast` recibe clicks).

- [x] **Step 3: Commit y auditoría T10-3**

Run: `git add src/styles/global.css`
Run: `git commit -m "fix: separar toasts del timer en movil"`

Subagente `general` (NO edita): verifica el CSS, que `#toasts` esté arriba con
`pointer-events: none` y `.toast` con `pointer-events: auto`, que en 360/390/412 el toast
quede debajo del header (sin solape), que `#timer` siga abajo, y que `npm run build` pase.
PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 4: Timer exacto por timestamp

**Files:**
- New: `src/lib/timer.ts`
- New: `src/lib/test/timer.test.ts`
- New: `src/lib/wakeLock.ts`
- New: `src/hooks/useTimerSync.ts`
- Rewrite: `src/store/timerStore.ts`
- Modify: `src/components/shared/Timer.tsx`

**Interfaces:**
- Produces: `remainingAt(endsAt: number, now: number): number`.
- Timer store: `endsAt: number | null`, `sync(): void`, `add(sec: number): void`; se elimina `add15`.
- `useTimerSync()` y `useWakeLock(running)` son hooks sin valor de retorno.

- [x] **Step 1: Escribir los tests que fallan**

Crear `src/lib/test/timer.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerStore } from '../../store/timerStore'
import { remainingAt } from '../timer'
import { beep, vibrate } from '../audio'

vi.mock('../audio', () => ({ beep: vi.fn(), vibrate: vi.fn() }))

const reset = (): void => {
  useTimerStore.getState().stop()
  useTimerStore.setState({
    running: false,
    done: false,
    total: 0,
    left: 0,
    paused: false,
    label: 'descanso',
    endsAt: null
  })
  vi.mocked(beep).mockClear()
  vi.mocked(vibrate).mockClear()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T10:00:00Z'))
  reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('remainingAt', () => {
  it('redondea hacia arriba y nunca baja de 0', () => {
    expect(remainingAt(10_000, 9_001)).toBe(1)
    expect(remainingAt(10_000, 10_000)).toBe(0)
    expect(remainingAt(10_000, 12_000)).toBe(0)
  })
})

describe('timerStore por timestamp', () => {
  it('start fija endsAt y left', () => {
    useTimerStore.getState().start(180, 'press banca')
    const s = useTimerStore.getState()
    expect(s.running).toBe(true)
    expect(s.left).toBe(180)
    expect(s.endsAt).toBe(Date.now() + 180_000)
  })

  it('sync corrige el tiempo tras un salto de pantalla apagada', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:03:00Z'))
    useTimerStore.getState().sync()
    const s = useTimerStore.getState()
    expect(s.left).toBe(0)
    expect(s.done).toBe(true)
    expect(s.running).toBe(false)
    expect(beep).toHaveBeenCalledTimes(1)
  })

  it('pausa congela el restante y reanuda con endsAt nuevo', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:30Z'))
    useTimerStore.getState().toggle()
    expect(useTimerStore.getState().left).toBe(150)
    expect(useTimerStore.getState().endsAt).toBeNull()

    vi.setSystemTime(new Date('2026-10-23T10:02:00Z'))
    useTimerStore.getState().sync()
    expect(useTimerStore.getState().left).toBe(150)

    useTimerStore.getState().toggle()
    expect(useTimerStore.getState().endsAt).toBe(Date.now() + 150_000)

    vi.setSystemTime(new Date('2026-10-23T10:02:30Z'))
    useTimerStore.getState().sync()
    expect(useTimerStore.getState().left).toBe(120)
  })

  it('add extiende el restante y el total', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:10Z'))
    useTimerStore.getState().sync()
    useTimerStore.getState().add(15)
    const s = useTimerStore.getState()
    expect(s.left).toBe(185)
    expect(s.total).toBe(185)
    expect(s.endsAt).toBe(Date.now() + 185_000)
  })

  it('finish es idempotente y no duplica el beep', () => {
    useTimerStore.getState().start(1, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:02Z'))
    useTimerStore.getState().sync()
    useTimerStore.getState().finish()
    expect(beep).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
```

- [x] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — no existe `src/lib/timer.ts` y `timerStore` no tiene `endsAt`/`sync`/`add`.

- [x] **Step 3: Implementar el helper puro**

Crear `src/lib/timer.ts`:

```ts
export const remainingAt = (endsAt: number, now: number): number =>
  Math.max(0, Math.ceil((endsAt - now) / 1000))
```

- [x] **Step 4: Reescribir el store**

Reemplazar `src/store/timerStore.ts` completo por:

```ts
import { create } from 'zustand'
import { beep, vibrate } from '../lib/audio'
import { remainingAt } from '../lib/timer'

export const RING_C = 2 * Math.PI * 24

interface TimerStore {
  running: boolean
  done: boolean
  total: number
  left: number
  paused: boolean
  label: string
  endsAt: number | null
  start: (sec: number, label: string) => void
  finish: () => void
  toggle: () => void
  add: (sec: number) => void
  sync: () => void
  stop: () => void
}

let iv: ReturnType<typeof setInterval> | null = null

const clearTicker = (): void => {
  if (iv) clearInterval(iv)
  iv = null
}

const ensureTicker = (): void => {
  clearTicker()
  iv = setInterval(() => useTimerStore.getState().sync(), 250)
}

export const useTimerStore = create<TimerStore>()((set, get) => ({
  running: false,
  done: false,
  total: 0,
  left: 0,
  paused: false,
  label: 'descanso',
  endsAt: null,

  start: (sec, label) => {
    if (!sec) return
    get().stop()
    set({
      total: sec,
      left: sec,
      paused: false,
      done: false,
      label,
      running: true,
      endsAt: Date.now() + sec * 1000
    })
    ensureTicker()
  },

  sync: () => {
    const s = get()
    if (!s.running || s.paused || s.done || s.endsAt === null) return
    const left = remainingAt(s.endsAt, Date.now())
    if (left <= 0) {
      get().finish()
      return
    }
    if (left !== s.left) set({ left })
  },

  finish: () => {
    const s = get()
    if (!s.running && !s.done && s.endsAt === null) return
    clearTicker()
    if (!s.done) {
      set({ running: false, done: true, left: 0, endsAt: null, paused: false })
      beep()
      vibrate([120, 60, 120, 60, 200])
    }
  },

  toggle: () => {
    const s = get()
    if (!s.running) return
    if (s.paused) {
      set({ paused: false, endsAt: Date.now() + s.left * 1000 })
      return
    }
    const left = s.endsAt ? remainingAt(s.endsAt, Date.now()) : s.left
    set({ paused: true, left, endsAt: null })
  },

  add: (sec) => {
    const s = get()
    const baseLeft = s.running && !s.done ? s.left : 0
    const baseTotal = s.running && !s.done ? s.total : 0
    const next = Math.max(1, baseLeft + sec)
    set({
      left: next,
      total: Math.max(baseTotal, next),
      done: false,
      paused: false,
      running: true,
      endsAt: Date.now() + next * 1000
    })
    ensureTicker()
  },

  stop: () => {
    clearTicker()
    set({ running: false, done: false, paused: false, endsAt: null })
  }
}))
```

- [x] **Step 5: Resincronizar al volver y mantener la pantalla despierta**

Crear `src/hooks/useTimerSync.ts`:

```ts
import { useEffect } from 'react'
import { useTimerStore } from '../store/timerStore'

export default function useTimerSync(): void {
  useEffect(() => {
    const sync = (): void => useTimerStore.getState().sync()
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pageshow', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])
}
```

Crear `src/lib/wakeLock.ts`:

```ts
interface WakeLockLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

type WakeLockNavigator = {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> }
}

let sentinel: WakeLockLike | null = null

export async function requestWakeLock(): Promise<void> {
  try {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
    const wl = (navigator as unknown as WakeLockNavigator).wakeLock
    if (!wl) return
    if (sentinel && !sentinel.released) return
    sentinel = await wl.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await sentinel?.release()
  } catch {
    /* noop */
  } finally {
    sentinel = null
  }
}
```

Crear `src/hooks/useWakeLock.ts`:

```ts
import { useEffect } from 'react'
import { releaseWakeLock, requestWakeLock } from '../lib/wakeLock'

export default function useWakeLock(active: boolean): void {
  useEffect(() => {
    const onVisibility = (): void => {
      if (active && document.visibilityState === 'visible') void requestWakeLock()
    }
    if (active) void requestWakeLock()
    else void releaseWakeLock()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void releaseWakeLock()
    }
  }, [active])
}
```

- [x] **Step 6: Cambiar la UI del timer**

En `src/components/shared/Timer.tsx`:

1. Importar `useTimerSync`, `useWakeLock`.
2. Reemplazar `const add15 = useTimerStore((s) => s.add15)` por `const add = useTimerStore((s) => s.add)`.
3. Al inicio del componente, llamar `useTimerSync()` y `useWakeLock(running)`.
4. Reemplazar el bloque de botones `.t-btns` por:

```tsx
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
```

5. En el texto de estado, mostrar `pausado` cuando `paused` sea true:

```tsx
<span id="timerLabel">{paused ? 'pausado' : label}</span>
```

No cambiar el `z-index` ni la posición; eso ya quedó en Task 3.

- [x] **Step 7: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **48 passed**.
Run: `npm run build` → OK.

Run: `git add src/lib/timer.ts src/lib/test/timer.test.ts src/lib/wakeLock.ts src/hooks/useTimerSync.ts src/hooks/useWakeLock.ts src/store/timerStore.ts src/components/shared/Timer.tsx`
Run: `git commit -m "fix: timer exacto con timestamp y resync"`

- [x] **Step 8: Auditoría T10-4**

Subagente `general` (NO edita): verifica que `left` solo se derive de `endsAt`, que `finish` sea idempotente, que `visibilitychange`/`pageshow`/`focus` llamen a `sync`, que Wake Lock esté protegido con `try/catch` y no prometa background, y corre `tsc`/`npm test` (48)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 5: Undo real y menos `confirm()`

**Files:**
- Modify: `src/lib/toast.ts`
- Modify: `src/components/shared/Toasts.tsx`
- Modify: `src/store/appStore.ts` (`replaceHistory`, `replaceBody`)
- Modify: `src/components/hierro/Sesion.tsx` (borrar serie, ejercicio, limpiar)
- Modify: `src/components/hierro/Historial.tsx` (borrar sesión)
- Modify: `src/components/cuerpo/CuerpoView.tsx` (borrar medición)
- Modify: `src/styles/global.css` (`.toast-action`)

**Interfaces:**
- `ToastItem` gana `action?: { label: string; run: () => void }`.
- `toast(msg: string, type?: 'ok' | 'warn', action?: ToastAction): void`.
- Nuevo `dismissToast(id: number): void`.
- Store: `replaceHistory(history: SessionHistory[]): void`, `replaceBody(body: BodyRecord[]): void`.

- [x] **Step 1: Extender el sistema de toasts**

Reemplazar `src/lib/toast.ts` por:

```ts
export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastItem {
  id: number
  msg: string
  type: 'ok' | 'warn'
  action?: ToastAction
}

export type ToastListener = (toasts: ToastItem[]) => void

const DURATION = 2950
const ACTION_DURATION = 6000

let counter = 0
let toasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

const nextId = (): number => Date.now() + counter++

const emit = (): void => {
  for (const l of listeners) l(toasts)
}

export const dismissToast = (id: number): void => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = (
  msg: string,
  type: 'ok' | 'warn' = 'ok',
  action?: ToastAction
): void => {
  const item: ToastItem = { id: nextId(), msg, type, action }
  toasts = [...toasts, item]
  emit()
  setTimeout(() => dismissToast(item.id), action ? ACTION_DURATION : DURATION)
}

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}
```

`src/components/shared/Toasts.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { dismissToast, subscribeToasts, type ToastItem } from '../../lib/toast'

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type} show`}>
          <span>{t.msg}</span>
          {t.action ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.run()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
```

En `src/styles/global.css`, después de `.toast.warn`:

```css
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.toast-action {
  background: none;
  border: 1px solid var(--volt);
  color: var(--volt);
  cursor: pointer;
  font: 700 11px 'Space Grotesk';
  letter-spacing: 0.1em;
  text-transform: uppercase;
  min-height: 44px;
  min-width: 44px;
  padding: 0 10px;
  flex: none;
}
```

- [x] **Step 2: Agregar snapshots al store**

En `src/store/appStore.ts`, agregar a la interfaz:

```ts
replaceHistory: (history: SessionHistory[]) => void
replaceBody: (body: BodyRecord[]) => void
```

Implementar después de `removeSession`:

```ts
replaceHistory: (history) => {
  set({ history })
  saveL(LS.history, history)
},

replaceBody: (body) => {
  set({ body })
  saveL(LS.body, body)
},
```

- [x] **Step 3: Usar undo en las acciones destructivas**

`src/components/hierro/Sesion.tsx`:

- Importar `ToastAction` no hace falta; solo `toast`.
- En el botón de borrar serie (líneas 362–368), reemplazar el `onClick` por:

```tsx
onClick={() => {
  const prev = useAppStore.getState().exercises
  removeSetFromExercise(e.id, si)
  toast(`Serie ${si + 1} eliminada`, 'warn', {
    label: 'Deshacer',
    run: () => useAppStore.getState().replaceExercises(prev)
  })
}}
```

- En el botón de borrar ejercicio (líneas 298–307), reemplazar el `onClick` por:

```tsx
onClick={() => {
  const prev = useAppStore.getState().exercises
  removeExerciseFromSession(e.id)
  toast('Ejercicio eliminado', 'warn', {
    label: 'Deshacer',
    run: () => useAppStore.getState().replaceExercises(prev)
  })
}}
```

- Reemplazar `onClear` (líneas 145–149) por:

```tsx
const onClear = (): void => {
  const prev = exercises
  clearSession()
  toast('Sesión vaciada', 'warn', {
    label: 'Deshacer',
    run: () => useAppStore.getState().replaceExercises(prev)
  })
}
```

`src/components/hierro/Historial.tsx`: reemplazar el `onClick` de “Eliminar sesión” por:

```tsx
onClick={() => {
  const prev = history
  removeSession(h.id)
  toast('Sesión eliminada', 'warn', {
    label: 'Deshacer',
    run: () => useAppStore.getState().replaceHistory(prev)
  })
}}
```

`src/components/cuerpo/CuerpoView.tsx`: donde se llama `removeBodyRecord` (buscar `removeBodyRecord`), reemplazar por:

```tsx
onClick={() => {
  const prev = body
  removeBodyRecord(r.id)
  toast('Medición eliminada', 'warn', {
    label: 'Deshacer',
    run: () => useAppStore.getState().replaceBody(prev)
  })
}}
```

Si `body` no está desestructurado en el componente, usar `useAppStore.getState().body` antes de borrar.

- [x] **Step 4: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **48 passed** (sin tests nuevos).
Run: `npm run build` → OK.

Prueba manual: borrar serie, ejercicio, sesión y medición; verificar que “Deshacer” restaura
el estado exacto y que el toast dura 6 s.

Run: `git add src/lib/toast.ts src/components/shared/Toasts.tsx src/store/appStore.ts src/components/hierro/Sesion.tsx src/components/hierro/Historial.tsx src/components/cuerpo/CuerpoView.tsx src/styles/global.css`
Run: `git commit -m "feat: deshacer en acciones destructivas"`

- [x] **Step 5: Auditoría T10-5**

Subagente `general` (NO edita): verifica que las cuatro acciones usen `replaceExercises`/`replaceHistory`/`replaceBody` con el snapshot previo, que “Limpiar” ya no use `confirm`, que el toast con acción dure 6 s, que `dismissToast` no rompa la cola, y corre `tsc`/`npm test` (48)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 6: Targets de 44 px y piso tipográfico

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:** ninguna. Cambio solo CSS.

- [x] **Step 1: Agrandar controles**

En `src/styles/global.css`, aplicar estos valores (respetando el resto de cada regla):

```css
.set-check {
  width: 48px;
  height: 48px;
}
.icon-btn {
  width: 44px;
  height: 44px;
}
.set-num {
  width: 28px;
  height: 28px;
  font-size: 12px;
}
.set-row input {
  min-height: 48px;
  font-size: 19px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.add-set {
  min-height: 44px;
  padding: 10px 14px;
  font-size: 12px;
}
.btn-mini,
.rt-add,
.del-hist,
.link-btn {
  min-height: 44px;
}
.switch {
  min-height: 44px;
}
.t-btns button {
  min-width: 44px;
  min-height: 44px;
}
.tab {
  min-height: 48px;
}
.day-tab {
  min-height: 48px;
}
@media (max-width: 1020px) {
  .tabbar-btn {
    min-height: 56px;
  }
}
```

En `.sets-head, .set-row` (línea 1169), cambiar:

```css
grid-template-columns: 26px 40px 1fr 1fr 36px;
```

por:

```css
grid-template-columns: 48px 28px 1fr 1fr 44px;
```

Mantener `gap: 10px`; si a 360 px los inputs quedan demasiado angostos, bajar el gap a 8 px
solo dentro de `@media (max-width: 400px)`.

- [x] **Step 2: Subir el piso tipográfico**

Cambiar estos tamaños (mínimo 11 px en metadatos y controles):

```css
.sets-head { font-size: 11px; }
.tag { font-size: 11px; }
.prog { font-size: 11px; }
.t-info span { font-size: 11px; }
.day-tab span { font-size: 11px; }
.rt-sets i { font-size: 11px; }
.sw-label { font-size: 11px; }
```

En `@media (max-width: 640px)`, cambiar `.t-info span { font-size: 9px; }` (línea 2074) por
`font-size: 11px;` y `.t-btns button { font-size: 9px; }` (línea 2083) por `font-size: 11px;`.
Sin esto, el override móvil pisa el piso de 11 px en el timer.

En `@media (max-width: 640px)`, cambiar `.stat span { font-size: 9px; }` (línea 2257) por
`font-size: 11px;`.

No tocar `.brand small` (es decorativo, no metadato operativo).

- [x] **Step 3: Validar visualmente**

Run: `npm run build` → OK.
Run: `npm run preview`.
En DevTools 360×844, 390×844 y 412×915:
1. Verificar que no hay scroll horizontal en Registrar/Cuerpo/Progreso.
2. Medir con el inspector: `.set-check` 48×48, `.icon-btn` 44×44, `.add-set` 44 de alto,
   `.t-btns button` 44×44, `.tab` 48 de alto.
3. Verificar que la fila de serie no se rompe: check, número, reps, kg y trash en una línea.
4. Verificar que los textos de 11 px se leen sin zoom.

- [x] **Step 4: Commit y auditoría T10-6**

Run: `git add src/styles/global.css`
Run: `git commit -m "fix: targets de 44px y tipografia legible"`

Subagente `general` (NO edita): revisa el CSS, confirma los tamaños mínimos, que no haya
`overflow-x` a 360 px, y corre `npm run build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 7: Iconos PWA PNG + maskable

**Files:**
- New: `scripts/generate-icons.mjs`
- New: `public/icons/icon-192.png`, `public/icons/icon-512.png`,
  `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon-180.png`
- Modify: `package.json` (script `icons` + `sharp` devDependency)
- Modify: `public/manifest.json` (el que sirve Astro) y `manifest.json` de la raíz (mismo contenido)
- Modify: `src/layouts/Base.astro` (`apple-touch-icon`)

**Interfaces:** ninguna de código. El build no ejecuta `sharp`; los PNG se commitean.

- [x] **Step 1: Instalar `sharp` y crear el script**

Run: `npm install -D sharp`
Run: `npm pkg set scripts.icons="node scripts/generate-icons.mjs"`

Crear `scripts/generate-icons.mjs`:

```js
import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile('icon.svg')
await mkdir('public/icons', { recursive: true })

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(svg).resize(180, 180).png().toFile('public/icons/apple-touch-icon-180.png')

const inner = await sharp(svg).resize(410, 410).png().toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0e1316' }
})
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toFile('public/icons/icon-maskable-512.png')

console.log('[forja-icons] 4 PNG generados en public/icons')
```

- [x] **Step 2: Generar y actualizar el manifest**

Run: `npm run icons`
Expected: `[forja-icons] 4 PNG generados en public/icons` y los 4 archivos existen.

Reemplazar el bloque `icons` de `public/manifest.json` y del `manifest.json` de la raíz por el mismo contenido. Astro sirve `public/manifest.json`; el de la raíz se mantiene sincronizado para no divergir.

```json
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
  { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
]
```

En `src/layouts/Base.astro`, cambiar:

```html
<link rel="apple-touch-icon" href="/icon.svg" />
```

por:

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
```

- [x] **Step 3: Validar build y precache**

Run: `npm run build` → OK; el log debe seguir mostrando `[forja-pwa] sw.js generado con N archivos`.
Verificar que `dist/icons/icon-192.png`, `dist/icons/icon-512.png`,
`dist/icons/icon-maskable-512.png` y `dist/icons/apple-touch-icon-180.png` existen.
Verificar que `dist/sw.js` contiene `icons/icon-192.png` y `icons/icon-maskable-512.png`.
Validar `public/manifest.json` y `manifest.json` con `node -e "for (const f of ['public/manifest.json','manifest.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"`.
Verificar que `dist/manifest.json` tiene los PNG nuevos (Astro copia `public/`).
Prueba manual en Android: instalar la PWA y verificar que el icono no es un cuadrado genérico;
en iOS verificar que el icono de inicio no queda en blanco.

- [x] **Step 4: Commit y auditoría T10-7**

Run: `git add package.json package-lock.json scripts/generate-icons.mjs public/icons public/manifest.json manifest.json src/layouts/Base.astro`
Run: `git commit -m "feat: iconos PWA PNG y maskable"`

Subagente `general` (NO edita): verifica que los 4 PNG existan y tengan el tamaño correcto,
que el manifest sea JSON válido y tenga `purpose: maskable`, que `apple-touch-icon` apunte al
PNG, que los iconos estén precacheados y que `npm run build` pase. PASS/FAIL → marcar en
`PLAN-V1.md`.

---

### Task 8: Documentación, validación final y cierre de R1

**Files:**
- Modify: `README.md` (URL y volumen)
- Modify: `astro.config.mjs` (`site`)
- Modify: `MIGRACION-ASTRO.md` (decisión de volumen)
- Modify: `PLAN-V1.md` (Tarea 10)

- [x] **Step 1: Corregir la URL y documentar el volumen**

`README.md`: cambiar `https://forja.netlify.app` por `https://forjavalera.netlify.app`.
En la sección de Progreso, aclarar “volumen calculado solo con series completadas”.
En Funcionalidades, mencionar que las series completadas son la fuente de verdad del
volumen y del historial.

`astro.config.mjs`: cambiar `site: 'https://forja.netlify.app'` por
`site: 'https://forjavalera.netlify.app'`.

`MIGRACION-ASTRO.md`: agregar en `## Estado`:

```markdown
- Decisión post-migración (2026-10-23): el volumen canónico se calcula solo con series
  completadas (`done`). Historial, volumen semanal, progresión y estancamiento derivan del
  mismo helper; los datos viejos se recalculan al mostrarse, sin migración destructiva.
```

- [x] **Step 2: Marcar la Tarea 10 en PLAN-V1.md**

Bajo `## Tarea 10 — Modo GYM R1: confiabilidad`, T10-1 a T10-7 ya están marcados con su
commit y su review. No los reescribas: marcá solo T10-8 con el commit de cierre y agregá al
final:

```markdown
- **Cierre R1 (2026-10-24)**: auditor final APROBADO (48 tests, tsc + build OK, timer
  verificado tras salto de 3 min, 0 solapamientos, targets ≥44 px, iconos PNG en precache
  con 28 archivos).
```

- [x] **Step 3: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **48 passed**.
Run: `npm run build` → OK con `[forja-pwa] sw.js generado con 28 archivos`.

Smoke test:
Run: `npm run preview` (background, puerto 4321).
Verificar HTTP 200 de `/`, `/manifest.json`, `/sw.js`, `/icons/icon-192.png`.
Verificar que `/manifest.json` tiene los 4 iconos y una entrada `maskable`, que `dist/sw.js`
incluye los 4 PNG y que `dist/index.html` referencia `/icons/apple-touch-icon-180.png`.
Verificar que no quedan referencias a `forja.netlify.app` en `README.md` ni en
`astro.config.mjs`.
Cerrar el preview al terminar.

- [x] **Step 4: Commit y auditor final**

Run: `git add README.md astro.config.mjs MIGRACION-ASTRO.md PLAN-V1.md docs/superpowers/plans/2026-10-23-modo-gym-r1-confiabilidad.md`
Run: `git commit -m "docs: cerrar release 1 de confiabilidad"`

Subagente `general` (NO edita): repasa Tasks 1–8, corre la validación completa, verifica que
no haya `isEff`, que el volumen sea consistente entre barra/historial/semanal, que el timer
use `endsAt` y que los iconos estén en `dist`. Devuelve APROBADO/RECHAZADO y la lista de
archivos tocados.

---

## Criterio de salida de R1

- [ ] `npm test` → 48 passed.
- [ ] `npx tsc --noEmit -p tsconfig.check.json` → limpio.
- [ ] `npm run build` → OK, SW con iconos PNG en precache.
- [ ] Timer correcto tras 3 min con pantalla bloqueada (diferencia ≤ 1 s).
- [ ] 0 solapamientos timer/toasts a 360/390/412 px.
- [ ] Serie, ejercicio, sesión y medición se pueden deshacer.
- [ ] 100% de controles interactivos ≥ 44 px; metadatos ≥ 11 px.
- [ ] URLs de producción corregidas a `https://forjavalera.netlify.app/`.
- [ ] Auditor final APROBADO y Tarea 10 cerrada en `PLAN-V1.md`.
