# Fila de serie sin teclado y ajustes al tocar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar una serie desde el check sin que aparezca el teclado, mantener la cadena de Enter para quien escribe, y permitir abrir las herramientas de la fila tocando el número de serie o el espacio libre.

**Architecture:** La selección de la próxima serie pendiente sale de `Sesion.tsx` a un helper puro `nextSetTarget` en `src/lib/session.ts`, testeable con Vitest. En la UI, `markDone` recibe un flag `focusNext`: el check no enfoca inputs y solo hace scroll; Enter en kg conserva el foco encadenado. Las herramientas dejan de depender exclusivamente del foco: un botón en el número de serie y un click en la fila alternan `active` sin abrir teclado.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Chrome CDP · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Validación: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (log `[forja-pwa] sw.js generado con 28 archivos`).
- Estado de partida: **67 tests**. Al cerrar este bloque deben pasar **72 tests** (5 nuevos de `nextSetTarget`).
- `tsconfig.check.json` no incluye componentes `.tsx`; los errores de `Sesion.tsx` se detectan con `npm run build` y smoke.
- Sin comentarios nuevos en el código. Copy en español rioplatense. Commits en español (`feat:`, `test:`, `docs:`).
- No tocar `forja_session`, `forja_session_start`, `forja_history`, `forja_body`, `forja_week`, el respaldo v3 ni el timer.
- No tocar `RegistrarView`, `ViewManager`, `tabs.tsx` ni la navegación: la pestaña Historial es otro bloque.
- No hacer push. Rama `dev`.
- Spec de referencia: `docs/superpowers/specs/2026-11-04-fila-serie-sin-teclado-design.md`.
- Cada tarea termina con validación y, al cerrar el bloque, auditoría de un subagente `general` que **no edita**: revisa el diff, corre `tsc`/`npm test`/`npm run build` y devuelve APROBADO/RECHAZADO.
- Working tree: `README.md` y `PLAN-V1.md` tienen cambios sin commitear del bloque de memoria (Tarea 13). No mezclarlos con este bloque; resolverlos antes del commit de cierre.

---

## File Structure

- `src/lib/session.ts` — agrega `SetTarget` y `nextSetTarget` junto a `nextPending`.
- `src/lib/test/session.test.ts` — tests unitarios del helper.
- `src/components/hierro/Sesion.tsx` — separa “completar” de “enfocar”, agrega toggle de herramientas y botón de número de serie.
- `src/styles/global.css` — estilos del botón `.set-num` y su estado abierto.
- `PLAN-V1.md` — ledger de la Tarea 14 (al cerrar).
- `README.md` — ajuste de la descripción de la fila (al cerrar).

---

### Task 1: Helper de próxima serie pendiente

**Files:**
- Modify: `src/lib/session.ts` (después de `nextPending`, líneas 27-32)
- Test: `src/lib/test/session.test.ts` (después del bloque `nextPending`, líneas 45-56)

**Interfaces:**
- Consumes: `nextPending(sets: SetData[], from?: number): number` y `Exercise[]`.
- Produces: `SetTarget { exId: string; si: number }` y `nextSetTarget(exercises: Exercise[], exId: string, si: number): SetTarget | null`.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/lib/test/session.test.ts`, agregar `nextSetTarget` al import:

```ts
import {
  formatElapsed,
  nextPending,
  nextSetTarget,
  sessionSummary,
  stepValue,
  suggestExercises
} from '../session'
```

Después del `describe('nextPending', ...)`, agregar:

```ts
describe('nextSetTarget', () => {
  const ex = (id: string, done: boolean[]): Exercise => ({
    id,
    name: id,
    group: 'pecho',
    sets: done.map((d) => set(10, 100, d))
  })

  it('elige la próxima pendiente del mismo ejercicio', () => {
    const exercises = [ex('a', [true, false, false]), ex('b', [false])]
    expect(nextSetTarget(exercises, 'a', 0)).toEqual({ exId: 'a', si: 1 })
  })

  it('respeta el índice cuando la serie actual no es la primera', () => {
    const exercises = [ex('a', [true, true, false]), ex('b', [false])]
    expect(nextSetTarget(exercises, 'a', 1)).toEqual({ exId: 'a', si: 2 })
  })

  it('salta al primer ejercicio con pendientes', () => {
    const exercises = [
      ex('a', [true]),
      ex('b', [true, false]),
      ex('c', [false])
    ]
    expect(nextSetTarget(exercises, 'a', 0)).toEqual({ exId: 'b', si: 1 })
  })

  it('vuelve a un ejercicio anterior si es el único con pendientes', () => {
    const exercises = [ex('a', [false]), ex('b', [true])]
    expect(nextSetTarget(exercises, 'b', 0)).toEqual({ exId: 'a', si: 0 })
  })

  it('devuelve null sin pendientes o con un ejercicio inexistente', () => {
    expect(nextSetTarget([ex('a', [true])], 'a', 0)).toBeNull()
    expect(nextSetTarget([ex('a', [false])], 'z', 0)).toBeNull()
    expect(nextSetTarget([], 'a', 0)).toBeNull()
  })
})
```

Los IDs de ejercicio se asumen únicos: `nextSetTarget` resuelve por `exId` y no soporta IDs duplicados. `uid()` usa `crypto.randomUUID()`, así que la app no los genera.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/test/session.test.ts`

Expected: FAIL porque `nextSetTarget` no está exportado (`is not a function` o error de import).

- [ ] **Step 3: Implementar el helper**

En `src/lib/session.ts`, después de `nextPending`:

```ts
export interface SetTarget {
  exId: string
  si: number
}

export function nextSetTarget(
  exercises: Exercise[],
  exId: string,
  si: number
): SetTarget | null {
  const current = exercises.find((e) => e.id === exId)
  if (!current) return null
  const nextInEx = nextPending(current.sets, si + 1)
  if (nextInEx >= 0) return { exId, si: nextInEx }
  for (const e of exercises) {
    if (e.id === exId) continue
    const next = nextPending(e.sets)
    if (next >= 0) return { exId: e.id, si: next }
  }
  return null
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/test/session.test.ts`

Expected: PASS. El archivo suma 5 tests; el total del proyecto queda en **72**.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/session.ts src/lib/test/session.test.ts
git commit -m "feat: helper para la proxima serie pendiente"
```

---

### Task 2: Check sin teclado y herramientas al tocar

**Files:**
- Modify: `src/components/hierro/Sesion.tsx` (imports 17-22; `markDone` 255-270; fila 389-480; herramientas 481-552)
- Modify: `src/styles/global.css` (`.set-row` 1342-1346; `.set-num` 1376-1393)

**Interfaces:**
- Consumes: `nextSetTarget(exercises, exId, si): SetTarget | null` de Task 1.
- Produces: comportamiento de UI; no exporta APIs nuevas.

- [ ] **Step 1: Cambiar el import**

En `Sesion.tsx`, reemplazar `nextPending` por `nextSetTarget`:

```ts
import {
  nextSetTarget,
  stepValue,
  suggestExercises,
  type ExerciseSuggestion
} from '../../lib/session'
```

- [ ] **Step 2: Agregar `scrollSet`, `toggleActive` y separar `markDone` del foco**

Después de `focusSet` (241-253), agregar:

```ts
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
```

Reemplazar `markDone` completo por:

```ts
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
```

El check sigue llamando `markDone(e, si)` (default `false`). En el `onKeyDown` del input de kg (452-456), cambiar:

```ts
                              if (ev.key === 'Enter') {
                                ev.preventDefault()
                                if (s.done) {
                                  const next = nextSetTarget(exercises, e.id, si)
                                  if (next) focusSet(next.exId, next.si)
                                  return
                                }
                                markDone(e, si, true)
                              }
```

Enter en kg de una serie ya completada no vuelve a marcarla ni reinicia el timer: solo encadena a la próxima reps pendiente.

- [ ] **Step 3: Hacer que la fila y el número abran las herramientas**

En el `<div className="set-row...">` (389-394), agregar el `onClick`:

```tsx
                          onClick={(ev) => {
                            const target = ev.target as HTMLElement
                            if (target.closest('input, button')) return
                            toggleActive(e.id, si)
                          }}
```

Reemplazar el `<span className="set-num">...</span>` (406-416) por:

```tsx
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
```

El `aria-controls` se emite solo expandido: los IDs de las herramientas no existen en el DOM colapsado. El check existente también debe quedar como `<button type="button" className="set-check" ...>` para que Enter no lo trate como submit implícito.

Agregar los IDs a las herramientas:

```tsx
                          <div
                            className="set-tools"
                            id={`set-tools-${e.id}-${si}`}
                            role="group"
                            aria-label={`Herramientas serie ${si + 1} de ${e.name}`}
                          >
```

```tsx
                          <div
                            className="set-tools-rir"
                            id={`set-rir-${e.id}-${si}`}
                          >
```

- [ ] **Step 4: Ajustar el CSS**

En `.set-num` (1376-1388), agregar el reset de botón y el estado abierto:

```css
      .set-num {
        position: relative;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        font: 700 12px 'Space Grotesk', sans-serif;
        color: var(--gc);
        background: rgba(0, 0, 0, 0.25);
        transition: 0.15s;
        padding: 0;
        cursor: pointer;
        appearance: none;
      }
```

Después de `.set-row:hover .set-num` (1389-1393), agregar:

```css
      .set-num[aria-expanded='true'] {
        background: var(--gc);
        color: #0c0f0a;
        border-color: var(--gc);
        box-shadow: 0 0 0 2px rgba(201, 242, 75, 0.35);
      }
```

El anillo distingue “abierto” de “hover”, que hoy comparten fondo y borde. El fallback `sans-serif` evita que el botón caiga a la fuente por defecto si `Space Grotesk` no cargó.

No cambiar la grilla: el toque grande lo da el `onClick` de la fila; el botón conserva 28 px (mínimo WCAG 2.2: 24 px).

- [ ] **Step 5: Validar tipos, tests y build**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npm test
npm run build
```

Expected: `tsc` limpio (los 4 errores preexistentes de `astro.config.mjs`/`ProgresoView` no se cuentan en `tsconfig.check.json`), **72 tests**, build con `[forja-pwa] sw.js generado con 28 archivos`.

- [ ] **Step 6: Smoke CDP de la fila**

Levantar preview y Chrome headless como en los smoke anteriores (puertos 4321 y 9222). Reutilizar el arnés CDP de `C:\Users\luis_\AppData\Local\Temp\opencode\review-t4-smoke.mjs` y sembrar una sesión:

```js
localStorage.setItem('forja_session', JSON.stringify([
  { id: 'e1', name: 'Press banca', group: 'pecho', sets: [
    { reps: 10, kg: 80, done: false },
    { reps: 10, kg: 80, done: false }
  ] },
  { id: 'e2', name: 'Remo con barra', group: 'espalda', sets: [
    { reps: 10, kg: 60, done: false }
  ] }
]))
localStorage.setItem('forja_session_start', JSON.stringify(Date.now()))
```

Verificar, con `Runtime.evaluate`:

```js
// 1. Check: no abre teclado, marca y arranca timer
document.querySelector('[data-set="e1-0"] .set-check').click()
// esperar 300 ms
document.activeElement?.tagName !== 'INPUT'          // true
document.querySelector('[data-set="e1-0"]').classList.contains('done') // true
document.querySelector('#timer')?.className.includes('on') // true

// 2. Número de serie: abre herramientas sin foco en input
document.querySelector('[data-set="e1-0"] .set-num').click()
// esperar 100 ms
document.querySelectorAll('.set-tools').length === 1 // true
document.activeElement?.tagName !== 'INPUT'          // true

// 3. +1 rep cambia el valor
const reps = document.querySelector('[data-set="e1-0"] input[data-field="reps"]')
const before = Number(reps.value)
;[...document.querySelectorAll('.set-tools button')]
  .find((b) => b.textContent.trim() === '+1 rep')
  .click()
Number(reps.value) === before + 1 // true

// 4. Enter en reps lleva a kg
const r = document.querySelector('[data-set="e1-1"] input[data-field="reps"]')
r.focus()
r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
document.activeElement?.getAttribute('data-field') === 'kg' // true

// 5. Enter en kg lleva a la próxima reps
const kg = document.querySelector('[data-set="e1-1"] input[data-field="kg"]')
kg.focus()
kg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
document.activeElement === document.querySelector('[data-set="e2-0"] input[data-field="reps"]') // true

// 6. ARIA: aria-controls solo expandido; Enter/Space del botón nativo
document.querySelector('[data-set="e1-0"] .set-num').getAttribute('aria-controls') === null // colapsado
document.querySelector('[data-set="e1-0"] .set-num').click()
document.querySelector('[data-set="e1-0"] .set-num').getAttribute('aria-controls')
  === 'set-tools-e1-0 set-rir-e1-0' // expandido
```

Para activar un botón nativo con Enter desde CDP hace falta `Input.dispatchKeyEvent` con `text: '\r'`; con Space alcanza keyDown/keyUp y el click ocurre en keyUp.

Expected: las 6 comprobaciones en `true`; sin excepciones nuevas en consola. Hay **8 errores de hidratación React #418 de baseline** (el arnés siembra `localStorage` antes de hidratar, igual que en `review-t4-smoke.json`); no cuentan como regresión. Cerrar preview y Chrome al terminar.

- [ ] **Step 7: Commit**

```powershell
git add src/components/hierro/Sesion.tsx src/styles/global.css
git commit -m "feat: completar serie sin abrir teclado y ajustes al tocar la fila"
```

- [ ] **Step 8: Auditoría del bloque**

Lanzar un subagente `general` que **no edita**. Debe revisar el diff, correr `npx tsc --noEmit -p tsconfig.check.json`, `npm test` y `npm run build`, y verificar el smoke de la fila. Devuelve APROBADO/RECHAZADO con hallazgos. Si hay fixes, corregirlos y repetir la auditoría antes de seguir.

---

### Task 3: Docs, cierre y pausa

**Files:**
- Modify: `README.md` (bullet de Registrar, líneas 13-16)
- Modify: `PLAN-V1.md` (nueva Tarea 14 al final)
- Pending: `README.md` y `PLAN-V1.md` del bloque de memoria siguen sin commitear; resolverlos antes de este paso.

**Interfaces:**
- Consumes: evidencia de Task 1 y Task 2.
- Produces: documentación del bloque y estado para la pausa.

- [ ] **Step 1: Resolver los docs pendientes del bloque de memoria**

Antes de editar `PLAN-V1.md`, revisar `git status`. Los cambios de Tarea 13 (memoria) están sin commitear. Recomendado, si el usuario lo aprueba:

```powershell
git add README.md PLAN-V1.md
git commit -m "docs: documentar resistencia en Android"
```

Si no se aprueba el commit, usar `git add -p` para stagear solo los hunks de Tarea 14 y no mezclar Tarea 13.

- [ ] **Step 2: Actualizar README**

En el bullet de Registrar (13-16), dejar:

```md
- **Registrar** — Home y sesión en curso: header sticky con series completadas, volumen y
  tiempo; composer plegado con autocompletado desde la rutina y el historial; fila de serie
  con ±1 rep, ±2,5 kg, repetir y “La vez pasada”; herramientas al tocar el número de serie
  (sin abrir teclado); el check no abre teclado y Enter encadena reps → kg → siguiente;
  timer de descanso manual con presets 60/90/120/180 y aviso de la siguiente serie.
```

- [ ] **Step 3: Registrar la Tarea 14 en PLAN-V1**

Agregar al final:

```md
## Tarea 14 — Fila de serie sin teclado (2026-11-04)
> Spec: `docs/superpowers/specs/2026-11-04-fila-serie-sin-teclado-design.md`
> Plan: `docs/superpowers/plans/2026-11-04-fila-serie-sin-teclado.md`
1. [x] T14-1 `nextSetTarget` puro con 5 tests: misma serie, `si > 0`, siguiente ejercicio, vuelta a pendientes anteriores y sin pendientes. — 72 tests.
2. [x] T14-2 Check sin teclado, Enter encadena y herramientas al tocar número/fila. — smoke CDP 60/60.
3. [x] T14-3 Docs y cierre del bloque. — `tsc` check limpio, 72 tests, build SW 28, auditor APROBADO.
```

- [ ] **Step 4: Validación final y commit de docs**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npm test
npm run build
git add README.md PLAN-V1.md docs/superpowers/specs/2026-11-04-fila-serie-sin-teclado-design.md docs/superpowers/plans/2026-11-04-fila-serie-sin-teclado.md
git commit -m "docs: cerrar fila de serie sin teclado"
```

Expected: 72 tests, build SW 28, docs actualizados.

- [ ] **Step 5: Pausa**

No empezar la pestaña Historial ni tocar `ViewManager`, `tabs.tsx` o `RegistrarView`. Reportar al usuario:
- diff y commits;
- resultado del smoke;
- qué probar en el teléfono (check, número de serie, +1 rep, Enter);
- limitaciones: el teclado puede seguir abriéndose si el usuario toca un input; el auto-scroll no fuerza foco.
