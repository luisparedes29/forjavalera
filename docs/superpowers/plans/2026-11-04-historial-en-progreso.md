# Historial dentro de Progreso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover el historial a una sub-vista de Progreso, mantener las 4 pestañas y renderizar el cuerpo de cada sesión solo al abrirlo.

**Architecture:** La sub-vista vive en `appStore` (`progresoSub`) y se espeja en el hash (`#progreso` / `#historial`). `ProgresoView` muestra un segmento Resumen/Historial y monta `Historial` solo en su rama. `Historial` deja de renderizar los cuerpos colapsados: el `.hist-body` existe únicamente cuando el ítem está abierto. `RegistrarView` se queda solo con la sesión y `#sessionPanel` pasa a ocupar todo el ancho.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Chrome CDP · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Validación: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (log `[forja-pwa] sw.js generado con 28 archivos`).
- Estado de partida: **72 tests**. Al cerrar este bloque deben pasar **80 tests** (3 de `view.ts`, 3 de `appStore.ts` y 2 de `ProgresoView`).
- `tsconfig.check.json` no incluye componentes `.tsx`; los errores de `ProgresoView.tsx`, `RegistrarView.tsx` e `Historial.tsx` se detectan con `npm run build` y smoke.
- Sin comentarios nuevos en el código. Copy en español rioplatense. Commits en español (`feat:`, `perf:`, `docs:`).
- No tocar `forja_session`, `forja_session_start`, `forja_history`, `forja_body`, `forja_week`, el respaldo v3 ni el timer.
- No tocar `tabs.tsx`, `NavTabs.tsx` ni `NavTabbar.tsx`: siguen siendo 4 pestañas.
- No hacer push. Rama `dev`.
- Spec de referencia: `docs/superpowers/specs/2026-11-04-historial-en-progreso-design.md`.
- Working tree de partida: solo untracked `auditoria/`, `preview.log` y `preview.err.log`. No commitearlos.
- Cada tarea termina con validación y review. Al cerrar el bloque, un subagente `general` que **no edita** revisa el diff, corre `tsc`/`npm test`/`npm run build` y devuelve APROBADO/RECHAZADO.

---

## File Structure

- `src/lib/view.ts` — `progresoSubFromHash` y alias `historial` → `progreso`.
- `src/lib/test/view.test.ts` — 3 tests nuevos de hash y sub-vista.
- `src/store/appStore.ts` — `ProgresoSub`, `progresoSub`, `setProgresoSub`.
- `src/components/ViewManager.tsx` — sincroniza vista y sub-vista desde el hash.
- `src/layouts/Base.astro` — pre-paint de `#historial` como `progreso`.
- `src/components/progreso/Historial.tsx` — componente mudado; cuerpo condicional.
- `src/components/progreso/ProgresoView.tsx` — segmento Resumen/Historial y render condicional.
- `src/components/hierro/RegistrarView.tsx` — sin historial.
- `src/styles/global.css` — subnav, historial a ancho completo, `#sessionPanel` full width, cuerpo del historial.
- `README.md` — vistas y ubicación del historial.
- `PLAN-V1.md` — Tarea 15.
- `.superpowers/sdd/2026-11-04-historial-en-progreso/progress.md` — ledger del bloque.

---

### Task 1: Sub-vista en el estado y el hash

**Files:**
- Modify: `src/lib/view.ts` (todo el archivo, 10 líneas)
- Modify: `src/lib/test/view.test.ts` (después de `viewFromHash`)
- Modify: `src/store/appStore.ts` (tipo, interfaz, estado inicial y método)
- Modify: `src/components/ViewManager.tsx:14-21`
- Modify: `src/layouts/Base.astro:36-46`

**Interfaces:**
- Consumes: `viewFromHash(hash?: string): ViewId`.
- Produces:
  - `export type ProgresoSub = 'resumen' | 'historial'`
  - `progresoSubFromHash(hash?: string): ProgresoSub`
  - `useAppStore((s) => s.progresoSub)` y `useAppStore((s) => s.setProgresoSub)`
  - `setProgresoSub(sub: ProgresoSub, push?: boolean): void`

- [x] **Step 1: Escribir los tests que fallan**

En `src/lib/test/view.test.ts`, cambiar el import:

```ts
import { progresoSubFromHash, viewFromHash } from '../view'
```

Dentro de `describe('viewFromHash', ...)`, después del test de `#hierro`, agregar:

```ts
  it('mapea #historial a progreso', () => {
    expect(viewFromHash('#historial')).toBe('progreso')
  })
```

Al final del archivo, agregar:

```ts
describe('progresoSubFromHash', () => {
  it('elige historial solo con #historial', () => {
    expect(progresoSubFromHash('#historial')).toBe('historial')
  })

  it('cae en resumen con el resto de los hashes', () => {
    expect(progresoSubFromHash('#progreso')).toBe('resumen')
    expect(progresoSubFromHash('#plan')).toBe('resumen')
    expect(progresoSubFromHash('')).toBe('resumen')
    expect(progresoSubFromHash('#otra-cosa')).toBe('resumen')
  })
})
```

- [x] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/test/view.test.ts`

Expected: FAIL porque `progresoSubFromHash` no está exportado y `#historial` todavía cae en `registrar`.

- [x] **Step 3: Implementar `view.ts`**

Reemplazar el archivo por:

```ts
import type { ProgresoSub, ViewId } from '../store/appStore'

const VALID: readonly ViewId[] = ['registrar', 'plan', 'cuerpo', 'progreso']
const ALIAS: Record<string, ViewId> = { hierro: 'registrar', historial: 'progreso' }

function hashOf(hash?: string): string {
  return (hash ?? (typeof window !== 'undefined' ? window.location.hash : '')).slice(1)
}

export function viewFromHash(hash?: string): ViewId {
  const h = hashOf(hash)
  if (Object.prototype.hasOwnProperty.call(ALIAS, h)) return ALIAS[h]
  return (VALID as readonly string[]).includes(h) ? (h as ViewId) : 'registrar'
}

export function progresoSubFromHash(hash?: string): ProgresoSub {
  return hashOf(hash) === 'historial' ? 'historial' : 'resumen'
}
```

`import type` es obligatorio: `view.ts` no debe importar el store en runtime.

- [x] **Step 4: Agregar el estado al store**

En `src/store/appStore.ts`, después de `ViewId`:

```ts
export type ProgresoSub = 'resumen' | 'historial'
```

En `interface AppStore`, después de `view: ViewId`:

```ts
  progresoSub: ProgresoSub
```

Después de `setView`:

```ts
  setProgresoSub: (sub: ProgresoSub, push?: boolean) => void
```

En el estado inicial, después de `view: initialView(),`:

```ts
  progresoSub: 'resumen',
```

Después del método `setView`, agregar:

```ts
  setProgresoSub: (progresoSub, push = false) => {
    set({ progresoSub })
    if (push && typeof window !== 'undefined') {
      const hash = progresoSub === 'historial' ? 'historial' : 'progreso'
      if (window.location.hash !== `#${hash}`) window.location.hash = hash
      else window.scrollTo({ top: 0 })
    }
  },
```

El `else` cubre el caso de tocar la sub-vista ya activa: no duplica la entrada del historial y vuelve al tope.

- [x] **Step 5: Sincronizar la sub-vista desde el hash**

En `src/components/ViewManager.tsx`, cambiar el import:

```tsx
import { progresoSubFromHash, viewFromHash } from '../lib/view'
```

Y el listener:

```tsx
  useEffect(() => {
    const fromHash = (): void => {
      const hash = window.location.hash
      const state = useAppStore.getState()
      state.setView(viewFromHash(hash), false)
      state.setProgresoSub(progresoSubFromHash(hash), false)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])
```

- [x] **Step 6: Espejar la regla en el pre-paint**

En `src/layouts/Base.astro`, reemplazar el bloque `var v = ...` por:

```js
        var h = (window.location.hash || '').slice(1)
        var v = 'registrar'
        if (h === 'plan' || h === 'cuerpo' || h === 'progreso') v = h
        if (h === 'historial') v = 'progreso'
        document.documentElement.dataset.view = v
```

El comentario de arriba sigue siendo válido: es un espejo de `src/lib/view.ts`.

- [x] **Step 7: Validar**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npx vitest run src/lib/test/view.test.ts
npm test
npm run build
```

Expected: `tsc` limpio, 6 tests en `view.test.ts`, **78 tests** totales, build con `[forja-pwa] sw.js generado con 28 archivos`.

- [x] **Step 8: Commit**

```powershell
git add src/lib/view.ts src/lib/test/view.test.ts src/store/appStore.ts src/components/ViewManager.tsx src/layouts/Base.astro
git commit -m "feat: agregar sub-vista historial a progreso"
```

---

### Task 2: Segmento Resumen/Historial y mudanza del historial

**Files:**
- Move: `src/components/hierro/Historial.tsx` → `src/components/progreso/Historial.tsx`
- Modify: `src/components/hierro/RegistrarView.tsx` (archivo completo)
- Modify: `src/components/progreso/ProgresoView.tsx` (imports, selectores, memos y `return`)
- Create: `src/components/progreso/ProgresoView.test.tsx`
- Modify: `src/styles/global.css` (layout, subnav y mobile)
- Modify: `vitest.config.ts` (incluir `.test.tsx`)

**Interfaces:**
- Consumes: `progresoSub` y `setProgresoSub` de Task 1.
- Produces:
  - DOM del segmento: `.prog-subnav`, `.seg` con `role="group"`.
  - Contenedor del historial: `.progreso-main.hist-only`.
  - `Historial` importado desde `./Historial`, con `open`/`onToggle` como props.
  - El estado de filas abiertas vive en `ProgresoView` y sobrevive al cambio de sub-vista.
  - 2 tests de la sub-vista con `react-dom/server`.

- [x] **Step 1: Mover el componente**

```powershell
git mv src/components/hierro/Historial.tsx src/components/progreso/Historial.tsx
```

Las rutas relativas internas (`../../store/appStore`, `../../lib/...`, `../../data/routine`) siguen siendo correctas porque el archivo conserva la profundidad `components/<carpeta>/`.

- [x] **Step 2: Vaciar RegistrarView**

Reemplazar `src/components/hierro/RegistrarView.tsx` por:

```tsx
import Sesion from './Sesion'
import SessionHeader from './SessionHeader'
import VolumePulse from './VolumePulse'

export default function RegistrarView() {
  return (
    <main>
      <SessionHeader />
      <VolumePulse />
      <Sesion />
    </main>
  )
}
```

Desaparecen el import de `Historial`, el de `CSSProperties` y la sección `02/ Historial`.

- [x] **Step 3: Conectar ProgresoView con la sub-vista**

En `src/components/progreso/ProgresoView.tsx`, agregar el import:

```tsx
import Historial from './Historial'
```

Dentro del componente, después de `const history = ...`:

```tsx
  const sub = useAppStore((s) => s.progresoSub)
  const setProgresoSub = useAppStore((s) => s.setProgresoSub)
```

- [x] **Step 4: Saltear los cálculos pesados en Historial**

Reemplazar los tres memos:

```tsx
  const wv = useMemo(
    () => (sub === 'resumen' ? weeklyVolume(history) : {}),
    [history, sub]
  )
```

```tsx
  const names = useMemo(
    () => (sub === 'resumen' ? allExerciseNames(history) : []),
    [history, sub]
  )
```

```tsx
  const series = useMemo(
    () => (sub === 'resumen' && keySel ? exerciseSeries(history, keySel) : []),
    [history, keySel, sub]
  )
```

El resto de los cálculos (`totalSets`, `totalVol`, `pr`, `last`, `delta`) puede quedar igual: son operaciones sobre arrays chicos y no se renderizan en Historial.

- [x] **Step 5: Reestructurar el `return`**

El `return` actual tiene dos hijos: `<section className="stats stats-progreso">…</section>` y `<div className="progreso-main">…</div>`. Envolver **esos dos bloques existentes, sin modificar su contenido**, en la rama de Resumen. La estructura final es:

```tsx
  return (
    <>
      <div className="prog-subnav">
        <div className="seg" role="group" aria-label="Contenido de Progreso">
          <button
            type="button"
            className={sub === 'resumen' ? 'on' : ''}
            aria-pressed={sub === 'resumen'}
            onClick={() => setProgresoSub('resumen', true)}
          >
            Resumen
          </button>
          <button
            type="button"
            className={sub === 'historial' ? 'on' : ''}
            aria-pressed={sub === 'historial'}
            onClick={() => setProgresoSub('historial', true)}
          >
            Historial
          </button>
        </div>
      </div>

      {sub === 'resumen' ? (
        <>
          {/* el <section className="stats stats-progreso"> actual, sin cambios */}
          {/* el <div className="progreso-main"> actual, sin cambios */}
        </>
      ) : (
        <div className="progreso-main hist-only">
          <section className="panel" style={{ '--acc': 'var(--teal)' }}>
            <h2>
              <span className="n">01/</span> Historial
            </h2>
            <Historial />
          </section>
        </div>
      )}
    </>
  )
```

El panel de Historial **no** lleva `reveal`: `useReveal` corre una sola vez al montar `ViewManager` y un panel condicional quedaría en `opacity: 0`.

- [x] **Step 6: Ajustar el CSS de layout**

En `src/styles/global.css`, después del bloque `.progreso-main` (líneas 455-462), agregar:

```css
      .progreso-main.hist-only {
        grid-template-columns: minmax(0, 1fr);
      }
```

Antes de `.volume-pulse` (línea 2158), agregar:

```css
      #sessionPanel {
        grid-column: 1 / -1;
      }
```

Después de `.prog-ctl` (línea 2304-2310), agregar:

```css
      .prog-subnav {
        display: flex;
        justify-content: flex-start;
        padding: 24px 28px 0;
        max-width: 1340px;
        margin: 0 auto;
      }
      .prog-subnav .seg button {
        min-height: 44px;
        padding: 11px 16px;
      }
```

Dentro de `@media (max-width: 640px)` (línea 2791), después de `.progreso-main { padding: 16px 16px 40px; }`, agregar:

```css
        .prog-subnav {
          padding: 14px 16px 0;
        }
```

- [x] **Step 7: Validar tipos, tests y build**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npm test
npm run build
```

Expected: `tsc` limpio, **80 tests**, build con SW 28.

- [x] **Step 8: Smoke CDP de la sub-vista**

Levantar preview en 4321 y Chrome headless en 9222, como en los smoke anteriores. Sembrar historial con dos sesiones:

```js
localStorage.setItem('forja_history', JSON.stringify([
  {
    id: 'h1', ts: Date.now() - 86400000, focus: 'pecho',
    exercises: [{ name: 'Press banca', group: 'pecho', sets: [
      { reps: 10, kg: 80, done: true },
      { reps: 8, kg: 85, done: true }
    ] }]
  },
  {
    id: 'h2', ts: Date.now() - 172800000, focus: 'espalda',
    exercises: [{ name: 'Remo con barra', group: 'espalda', sets: [
      { reps: 10, kg: 60, done: true }
    ] }]
  }
]))
```

Verificar con `Runtime.evaluate`:

```js
// 1. Registrar ya no tiene historial
document.querySelector('#view-registrar #historyList') === null
document.querySelector('#view-registrar h2')?.textContent.includes('Historial') === false

// 2. Progreso muestra el segmento y Resumen por defecto
document.querySelector('.prog-subnav .seg') !== null
document.querySelectorAll('.prog-subnav .seg button').length === 2
document.querySelector('.prog-subnav button[aria-pressed="true"]')?.textContent.trim() === 'Resumen'
document.querySelector('.stats-progreso') !== null

// 3. Historial cambia la URL y oculta los stats
document.querySelectorAll('.prog-subnav .seg button')[1].click()
// esperar 150 ms
location.hash === '#historial'
document.querySelector('.stats-progreso') === null
document.querySelector('#historyList .hist-item') !== null

// 4. Resumen vuelve
document.querySelectorAll('.prog-subnav .seg button')[0].click()
// esperar 150 ms
location.hash === '#progreso'
document.querySelector('.stats-progreso') !== null

// 5. Tocar la pestaña Progreso desde Historial vuelve a Resumen
document.querySelectorAll('.prog-subnav .seg button')[1].click()
// esperar 150 ms
document.querySelector('.tabs [data-view="progreso"]').click()
// esperar 150 ms
location.hash === '#progreso'
document.querySelector('.stats-progreso') !== null

// 6. Recarga directa en #historial
location.hash = '#historial'
// recargar con Page.reload y esperar la hidratación
document.documentElement.dataset.view === 'progreso'
document.querySelector('.prog-subnav button[aria-pressed="true"]')?.textContent.trim() === 'Historial'

// 7. Atrás vuelve a Resumen
history.back()
// esperar 200 ms
location.hash === '#progreso'
document.querySelector('.stats-progreso') !== null

// 8. Sin overflow y targets ≥ 44 px en 320/360/390/412/768/1024/1440
document.documentElement.scrollWidth <= window.innerWidth
[...document.querySelectorAll('.prog-subnav .seg button')]
  .every((b) => b.getBoundingClientRect().height >= 44)
```

Para los anchos, usar `Emulation.setDeviceMetricsOverride` con cada valor y repetir las dos comprobaciones después de esperar 100 ms.

- [x] **Step 9: Commit**

```powershell
git add src/components/hierro/RegistrarView.tsx src/components/progreso/Historial.tsx src/components/progreso/ProgresoView.tsx src/styles/global.css
git commit -m "feat: mover el historial a una sub-vista de progreso"
```

---

### Task 3: Historial liviano

**Files:**
- Modify: `src/components/progreso/Historial.tsx` (cabecera y cuerpo)
- Modify: `src/styles/global.css` (`.hist-body` y `@keyframes`)

**Interfaces:**
- Consumes: `history`, `removeSession`, `open`, `onToggle` (props que provee `ProgresoView`).
- Produces: `.hist-body` solo presente cuando `open[h.id]` es true.

- [x] **Step 1: Hacer que el botón de la sesión sea explícito**

En `src/components/progreso/Historial.tsx`, agregar `type="button"` al botón `.hist-head`:

```tsx
            <button
              type="button"
              className="hist-head"
              aria-expanded={isOpen}
              aria-controls={isOpen ? `hist-body-${h.id}` : undefined}
              onClick={() => onToggle(h.id)}
            >
```

- [x] **Step 2: Renderizar el cuerpo solo cuando está abierto**

Reemplazar el bloque:

```tsx
            <div className="hist-body">
              …
            </div>
```

por:

```tsx
            {isOpen ? (
              <div className="hist-body" id={`hist-body-${h.id}`}>
                …
              </div>
            ) : null}
```

Conservar **tal cual** el contenido interno (`h.exercises.map(...)` y el botón “Eliminar sesión”). El `aria-controls` ya se emite solo expandido, igual que en la fila de serie de la Tarea 14.

- [x] **Step 3: Agregar `type="button"` al botón de eliminar**

```tsx
                <button
                  type="button"
                  className="del-hist"
                  onClick={() => {
```

- [x] **Step 4: Cambiar el CSS del cuerpo**

Reemplazar:

```css
      .hist-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease;
        background: rgba(0, 0, 0, 0.18);
      }
      .hist-item.open .hist-body {
        max-height: 440px;
        overflow: auto;
      }
```

por:

```css
      .hist-body {
        max-height: 440px;
        overflow: auto;
        background: rgba(0, 0, 0, 0.18);
        animation: hist-in 0.22s ease;
      }
      @keyframes hist-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
```

La regla de `prefers-reduced-motion` (línea 2879) ya desactiva la animación.

- [x] **Step 5: Validar**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npm test
npm run build
```

Expected: `tsc` limpio, **80 tests**, build con SW 28.

- [x] **Step 6: Smoke del DOM y de la memoria**

Con el mismo preview y las 200 sesiones sembradas, verificar:

```js
// Cuerpos colapsados: 0 nodos
document.querySelectorAll('.hist-body').length === 0

// Abrir una sesión: 1 cuerpo y aria-controls presente
document.querySelector('.hist-head').click()
document.querySelectorAll('.hist-body').length === 1
document.querySelector('.hist-head').getAttribute('aria-controls') !== null

// Cerrar: vuelve a 0
document.querySelector('.hist-head').click()
document.querySelectorAll('.hist-body').length === 0
```

Medir con CDP `Memory.getDOMCounters` y `Runtime.getHeapUsage` después de `HeapProfiler.collectGarbage`:

| Vista | Heap | Nodos |
|---|---:|---:|
| `#registrar` | < 6 MB | < 15.000 |
| `#progreso` Resumen | < 10 MB | < 25.000 |
| `#historial` colapsado | < 6 MB | < 15.000 |

Registrar los valores reales en el reporte. Son de Chrome headless: sirven para comparar contra la línea base de Tarea 13, no como medida absoluta de Android.

- [x] **Step 7: Commit**

```powershell
git add src/components/progreso/Historial.tsx src/styles/global.css
git commit -m "perf: renderizar el cuerpo del historial solo al abrirlo"
```

---

### Task 4: Docs y cierre

**Files:**
- Modify: `README.md` (vistas y descripción de Progreso)
- Modify: `PLAN-V1.md` (Tarea 15)
- Create: `.superpowers/sdd/2026-11-04-historial-en-progreso/progress.md`
- Modify: `docs/superpowers/specs/2026-11-04-historial-en-progreso-design.md` (solo si la implementación se desvía)
- Modify: `docs/superpowers/plans/2026-11-04-historial-en-progreso.md` (marcar checkboxes y resultado)

**Interfaces:**
- Consumes: evidencia de Task 1, Task 2 y Task 3.
- Produces: documentación del bloque y estado para el cierre.

- [x] **Step 1: Actualizar README**

En la línea de las cuatro vistas, dejar:

```md
Cuatro vistas con navegación por hash (`#registrar`, `#plan`, `#cuerpo`, `#progreso`).
`#hierro` sigue funcionando como alias de `#registrar` y `#historial` abre Progreso en su
sub-vista Historial.
```

En el bullet de **Progreso**, agregar al final:

```md
  La pestaña tiene dos sub-vistas: **Resumen** (volumen y progresión) e **Historial**
  (sesiones guardadas); el cuerpo de cada sesión se renderiza solo al abrirlo.
```

En el bullet de **Registrar**, quitar cualquier mención al historial como sección. El autocompletado desde el historial se conserva y sigue siendo correcto.

- [x] **Step 2: Cerrar la Tarea 15 en PLAN-V1**

Agregar o completar al final:

```md
## Tarea 15 — Historial dentro de Progreso (2026-11-04)

> Spec: `docs/superpowers/specs/2026-11-04-historial-en-progreso-design.md`
> Plan: `docs/superpowers/plans/2026-11-04-historial-en-progreso.md`
> Estado: **completa**. Se mantienen 4 pestañas; Historial es sub-vista de Progreso.

1. [x] T15-1 Sub-vista en store y hash: `ProgresoSub`, `progresoSubFromHash`, `#historial` → `progreso`, pre-paint alineado. — 78 tests. Commit `<hash>`; review APROBADA.
2. [x] T15-2 Segmento Resumen/Historial, historial mudado a `progreso/`, Registrar sin historial y `#sessionPanel` a ancho completo. — smoke `<n>/<n>`. Commit `<hash>`; review APROBADA.
3. [x] T15-3 Historial liviano: cuerpo condicional, `aria-controls` solo expandido, animación de apertura. — memoria `<valores>`. Commit `<hash>`; review APROBADA.
4. [x] T15-4 Docs y cierre. — `tsc` limpio, 80 tests, build SW 28, smoke `<n>/<n>`; auditoría final APROBADA (0 Critical, 0 Important).
```

Reemplazar `<hash>`, `<n>/<n>` y `<valores>` con la evidencia real antes de commitear.

- [x] **Step 3: Crear el ledger**

Crear `.superpowers/sdd/2026-11-04-historial-en-progreso/progress.md`:

```md
# Progreso — Historial dentro de Progreso

- Spec: `docs/superpowers/specs/2026-11-04-historial-en-progreso-design.md`
- Plan: `docs/superpowers/plans/2026-11-04-historial-en-progreso.md`
- Base: 72 tests · HEAD `6bda4e4`

## Tareas

| Tarea | Estado | Commit | Review |
|---|---|---|---|
| T15-1 Sub-vista y hash | pendiente | — | — |
| T15-2 Segmento y mudanza | pendiente | — | — |
| T15-3 Historial liviano | pendiente | — | — |
| T15-4 Docs y cierre | pendiente | — | — |

## Validación

- [ ] `tsc` limpio
- [ ] 80 tests
- [ ] build SW 28
- [ ] smoke CDP
- [ ] memoria con 200 sesiones
- [ ] auditoría final
```

Actualizar el estado a medida que avanza cada tarea.

- [x] **Step 4: Validación final**

```powershell
npx tsc --noEmit -p tsconfig.check.json
npm test
npm run build
```

Expected: `tsc` limpio, **80 tests**, build con SW 28.

- [x] **Step 5: Auditoría final**

Invocar un subagente `general` que **no edite**. Pedirle:

- Revisar el diff completo contra `6bda4e4`.
- Verificar que `tabs.tsx`, `NavTabs.tsx` y `NavTabbar.tsx` no cambiaron.
- Verificar que no se tocaron las claves de `localStorage`, el respaldo v3 ni el timer.
- Correr `npx tsc --noEmit -p tsconfig.check.json`, `npm test` y `npm run build`.
- Revisar el smoke y las mediciones de memoria.
- Devolver APROBADO o RECHAZADO con severidad (Critical/Important/Minor).

No cerrar el bloque con Critical o Important abiertos.

- [x] **Step 6: Commit de docs**

```powershell
git add README.md PLAN-V1.md .superpowers/sdd/2026-11-04-historial-en-progreso/progress.md docs/superpowers/specs/2026-11-04-historial-en-progreso-design.md docs/superpowers/plans/2026-11-04-historial-en-progreso.md
git commit -m "docs: cerrar historial dentro de progreso"
```

- [x] **Step 7: Reporte y pausa**

Reportar al usuario:
- commits y diff;
- 80 tests, `tsc`, build y smoke;
- memoria antes/después con 200 sesiones;
- qué probar en el teléfono: Registrar sin historial, Progreso → Historial, abrir/cerrar una sesión, recargar en `#historial`, Atrás;
- que no hubo push.

---

## Resultado

- **Commits:** `cf9bc62`, `7f406e8` (T15-1); `0ef5473`, `b68d763` (T15-2); `a0f4ca6` (T15-3); commit de docs de este cierre (T15-4).
- **Validación:** `tsc` limpio, **80/80 tests**, build con SW 28.
- **Smoke final sobre el build definitivo:** Task 2 20/20 PASS; Task 3 15/15 PASS.
- **Memoria con 200 sesiones:** Registrar 3,21 MB / 4.162 nodos; Resumen 3,26 MB / 4.159; Historial colapsado 3,74 MB / 7.848 con 0 cuerpos.
- **Review:** aprobadas por tarea. La revisión independiente por subagente no pudo usarse desde Task 3 por límite del proveedor; se hizo inline contra el brief y el diff.
- **Auditoría final:** APROBADA, 0 Critical y 0 Important. `tabs.tsx`, `NavTabs.tsx`, `NavTabbar.tsx`, storage, backup v3 y timer sin cambios.
- **Ruling parked:** el flash Resumen→Historial en carga directa de `#historial` queda documentado como trade-off SSR/hash; el pre-paint garantiza `data-view="progreso"`.
- **Push:** no realizado. `dev` queda adelante de `origin/dev`.
