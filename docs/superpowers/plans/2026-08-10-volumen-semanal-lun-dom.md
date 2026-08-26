# Volumen Semanal (lun–dom) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar el Volumen semanal de ventana móvil de 7 días a semana calendario (lun–dom, hora local), mostrar el rango de la semana en el panel y actualizar tests y docs.

**Architecture:** `weeklyVolume()` en `src/lib/logic.ts` filtra por `ts >= mondayOf(now)` donde `mondayOf` es un helper nuevo (lunes 00:00 hora local del dispositivo). La UI (`src/components/progreso/ProgresoView.tsx`) ajusta la leyenda y muestra el rango con `Intl.DateTimeFormat('es-AR', ...)` renderizado post-mount (evita hydration mismatch). Tests portables a cualquier TZ: fixtures con el constructor local de `Date`, sin pin de `process.env.TZ`.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Tests: `npm test` (vitest). Typecheck: `npx tsc --noEmit -p tsconfig.check.json`. Build: `npm run build` (debe loguear "[forja-pwa] sw.js generado con N archivos").
- Frontera de semana: **lunes 00:00 hora local del dispositivo** (NO UTC). La app debe
  funcionar igual para usuarios en CUALQUIER huso: `mondayOf` usa solo `Date` local.
- Tests de fechas: **portables a cualquier TZ, sin pin** — fixtures con el constructor
  local (`new Date(2026, 7, 3, 12, 0, 0)` para `now`; sesiones con
  `new Date(y, m, d, h, min).toISOString()` porque `hist()` recibe ISO-UTC). 2026-08-03 es
  lunes en todo calendario local. NO usar `process.env.TZ`.
- Copy UI en español rioplatense (voseo). No agregar comentarios al código.
- NO tocar: `localStorage`/claves `forja_*`, `exerciseSeries`, `allExerciseNames`, `forja_week`, `SET_GUIDE`.
- Commits en español, estilo del repo (`feat:`, `test:`, `docs:`). Sin push salvo orden explícita.
- Cada tarea termina con auditoría (+1 auditor final en Task 4): lanzar subagente "general" que verifica los puntos de la tarea, corre tsc/vitest/build y devuelve veredicto APROBADO/RECHAZADO; en `PLAN-V1.md` se marca `[x]` + resultado.
- Spec de referencia (leer antes de empezar): `docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md`.

---

### Task 1: Lógica — `mondayOf()` + ventana lun–dom en `weeklyVolume`

**Files:**
- Modify: `src/lib/logic.ts:100-122` (`weeklyVolume`) + agregar `mondayOf` tras `isEff`
- Test: `src/lib/test/logic.test.ts` (reemplazar bloque `describe('weeklyVolume')` de las líneas 167–186)

**Interfaces:**
- Produces: `export function mondayOf(now: number): number` — instante (ms epoch) del lunes 00:00 local de la semana de `now`. Lo consumen `weeklyVolume` (Task 1) y `ProgresoView` (Task 2).
- Consumes: nada nuevo; `weeklyVolume(history, now = Date.now())` conserva firma.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/lib/test/logic.test.ts` (no se agrega ningún pin de TZ; las fixtures son portables):
1. Reemplazar TODO el bloque actual:
```ts
describe('weeklyVolume', () => {
  const now = new Date('2026-08-03T12:00:00Z').getTime()

  it('cuenta solo series efectivas de la última semana y agrupa por grupo', () => {
    const h: SessionHistory[] = [
      hist('2026-08-01T10:00:00Z', [
        { name: 'Press banca', sets: [set(10, 100, true), set(0, 0, false)] }
      ]),
      hist('2026-07-01T10:00:00Z', [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    const out = weeklyVolume(h, now)
    expect(out['pecho']).toEqual({
      sets: 1,
      volume: 1000,
      ex: new Set(['press banca'])
    })
  })
})
```
por estos dos bloques nuevos:
```ts
describe('mondayOf', () => {
  it('devuelve el lunes 00:00 local de la semana de now', () => {
    const now = new Date(2026, 7, 3, 12, 0, 0).getTime()
    expect(mondayOf(now)).toBe(new Date(2026, 7, 3, 0, 0, 0).getTime())
  })

  it('si now es domingo, devuelve el lunes anterior', () => {
    const now = new Date(2026, 7, 9, 23, 59, 59).getTime()
    expect(mondayOf(now)).toBe(new Date(2026, 7, 3, 0, 0, 0).getTime())
  })
})

describe('weeklyVolume (semana calendario lun-dom local)', () => {
  const now = new Date(2026, 7, 3, 12, 0, 0).getTime()

  it('excluye sesiones de la semana anterior aunque esten a menos de 7 dias', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 1, 10, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toBeUndefined()
  })

  it('incluye sesiones desde el lunes 00:00 local inclusive', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 3, 0, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toEqual({
      sets: 1,
      volume: 1000,
      ex: new Set(['press banca'])
    })
  })

  it('excluye el domingo 23:59:59 de la semana previa', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 2, 23, 59, 59).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toBeUndefined()
  })

  it('acumula sesiones de la misma semana', () => {
    const h: SessionHistory[] = [
      hist(new Date(2026, 7, 4, 10, 0, 0).toISOString(), [
        { name: 'Press banca', sets: [set(10, 100, true), set(0, 0, false)] }
      ])
    ]
    expect(weeklyVolume(h, now)['pecho']).toEqual({
      sets: 1,
      volume: 1000,
      ex: new Set(['press banca'])
    })
  })
})
```
2. Agregar `mondayOf` al import existente de `../logic`.

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `mondayOf is not a function` + los 4 casos de `weeklyVolume` fallan (el sábado ya no cuenta).

- [ ] **Step 3: Implementar la lógica**

En `src/lib/logic.ts`, tras `isEff` (línea 84), agregar:
```ts
export function mondayOf(now: number): number {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
```
En `weeklyVolume` (línea 104), reemplazar:
```ts
const weekAgo = now - 7 * 24 * 60 * 60 * 1000
```
por:
```ts
const weekStart = mondayOf(now)
```
y el filtro (línea 108):
```ts
if (new Date(h.ts).getTime() < weekAgo) return
```
por:
```ts
if (new Date(h.ts).getTime() < weekStart) return
```

- [ ] **Step 4: Correr tests, typecheck y build**

Run: `npm test` → Expected: PASS (27 previos − 1 reemplazado + 2 `mondayOf` + 4 `weeklyVolume` = 32).
Run: `npx tsc --noEmit -p tsconfig.check.json` → Expected: sin errores.
Run: `npm run build` → Expected: OK (24+ archivos en precaché).

- [ ] **Step 5: Marcar en PLAN-V1.md y commit**

Agregar al final de `PLAN-V1.md` la sección:
```markdown
## Tarea 5 — Volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md)
1. [x] T5-1 Lógica: `mondayOf()` + `weeklyVolume` con ventana lun–dom local (32 tests).
```
> IMPORTANTE: `PLAN-V1.md`, `MIGRACION-ASTRO.md` y `README.md` tienen modificaciones
> previas SIN commitear (sesión anterior del usuario). NO incluirlas en commits de
> código: commitear SOLO `src/...` en Tasks 1–2; los docs (incluyendo dichas
> modificaciones previas) se commitean juntos en la Task 3.

Run: `git add src/lib/logic.ts src/lib/test/logic.test.ts; git commit -m "feat: volumen semanal con ventana calendario lun-dom"`

- [ ] **Step 6: Auditoría T5-1**

Lanzar subagente `general` (NO edita): verifica diff de `logic.ts` (frontera local, no UTC), los tests nuevos (casos de frontera inclusiva lunes 00:00 / exclusión domingo previo), corre `npx tsc --noEmit -p tsconfig.check.json`, `npm test` (32) y `npm run build`. Reporta PASS/FAIL → marcar resultado en `PLAN-V1.md`.

---

### Task 2: UI — leyenda + rango de semana en `ProgresoView`

**Files:**
- Modify: `src/components/progreso/ProgresoView.tsx` (imports línea 1-3; leyenda líneas 84-90)
- Test: no hay tests de componentes (validar con tsc/build + manual). No existe `exerciseSeries`/otros cambios.

**Interfaces:**
- Consumes: `mondayOf(now: number): number` (Task 1) y `weeklyVolume` (sin cambios de firma).
- Produces: render de leyenda actualizada + `weekRange: string | null` (estado post-mount).

- [ ] **Step 1: Implementar la UI**

En `src/components/progreso/ProgresoView.tsx`:
1. Import `useEffect` (línea 1: `import { useEffect, useMemo, useState } from 'react'`) y agregar `mondayOf` al import de `../../lib/logic` (línea 3).
2. Dentro del componente, junto a los otros `useState` (línea 15), agregar:
```tsx
const [weekRange, setWeekRange] = useState<string | null>(null)
useEffect(() => {
  const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
  const startMs = mondayOf(Date.now())
  const start = new Date(startMs)
  const end = new Date(startMs + 6 * 24 * 60 * 60 * 1000)
  setWeekRange(`semana del ${fmt.format(start)} al ${fmt.format(end)}`)
}, [])
```
3. Leyenda del panel `01/` (bloque `<p className="vol-legend">`, línea 84), reemplazar el texto interno por:
```tsx
<span>
  zona = objetivo recomendado · series efectivas de la semana (lun–dom)
  {weekRange ? ` · ${weekRange}` : ''}
</span>
```

- [ ] **Step 2: Validar**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm run build` → OK.
Manual (dev o preview): abrir Progreso → verificar leyenda nueva y texto "semana del X al Y ago" (es-AR), sin flash de texto vacío (el rango aparece tras montar la isla) y sin warnings de hydration en consola.

- [ ] **Step 3: Marcar en PLAN-V1.md y commit**

En `PLAN-V1.md`, bajo la Tarea 5:
```markdown
2. [x] T5-2 UI: leyenda "(lun–dom)" + rango "semana del X al Y" (es-AR, post-mount anti-mismatch).
```
Run: `git add src/components/progreso/ProgresoView.tsx; git commit -m "feat: mostrar leyenda y rango de la semana en volumen"`

- [ ] **Step 4: Auditoría T5-2**

Subagente `general` (NO edita): verifica patrón anti-hydration (rango solo post-mount), `Intl` es-AR, que el SSR no renderice rango, tsc + build verdes, y ausencia de regresiones en otros usos de `weeklyVolume`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 3: Documentación

**Files:**
- Modify: `PLAN-V1.md` (Estado + Tarea 5), `MIGRACION-ASTRO.md` (§3 tabla `weeklyVolume` + Estado), `README.md` (Funcionalidades → Progreso)

- [ ] **Step 1: Actualizar PLAN-V1.md**

En la sección `## Estado`, tras la línea `- **Hecho**: Tareas 1 (README), 2 (merge dev→main, por el usuario) y 3 (optimizaciones,
  commiteada en \`dev\` local \`acde33c\`, **push pendiente**).` agregar una línea nueva:
```markdown
- **En curso**: Tarea 5 — volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md).
```
Cuando la Tarea 5 cierre, mover esa línea a "Hecho" (o eliminarla si ya no aplica).

Agregar al final del archivo la sección con el marcado de la Tarea 5 (incluye T5-1, que quedó
de la Task 1 — commit `281a361`, auditoría APROBADA, portabilidad verificada en Asia/Tokyo y Venezuela):
```markdown
## Tarea 5 — Volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md)
1. [x] T5-1 Lógica: `mondayOf()` + `weeklyVolume` con ventana lun–dom local (32 tests, portables a cualquier huso).
```
(T5-2 y T5-3 se completan con sus auditorías; el auditor de cada task anota el resultado aquí.)

- [ ] **Step 2: Actualizar MIGRACION-ASTRO.md**

En `## 3` la fila (línea 84) `| weeklyVolume, exerciseSeries (e1RM), updateProgreso* | 4207–4279 | src/lib/logic.ts |`, reemplazar por:
`| weeklyVolume, exerciseSeries (e1RM), updateProgreso* | 4207–4279 | src/lib/logic.ts · weeklyVolume: ventana **semana calendario lun–dom local** |`
En `## 1 · Fase 1` el búlet (línea 118) `- exerciseSeries e1RM (Epley) y weeklyVolume (ventana 7 días).`, reemplazar por:
`- exerciseSeries e1RM (Epley) y weeklyVolume (ventana: semana calendario lun–dom, hora local).`
En `## Estado` agregar al final (tras el búlet de `Post-migración`):
`- Decisión post-migración: volumen semanal = semana calendario (lun–dom, hora local) en vez de ventana móvil de 7 días (spec: docs/superpowers/).`

- [ ] **Step 3: Actualizar README.md**

En "Funcionalidades", el ítem de Progreso, reemplazar `vs. rango recomendado (`SET_GUIDE`)` por `vs. rango recomendado (`SET_GUIDE`) — ventana: semana lun–dom`.

- [ ] **Step 4: Commit**

Run: `git add PLAN-V1.md MIGRACION-ASTRO.md README.md; git commit -m "docs: documentar ventana semanal lun-dom"`

- [ ] **Step 5: Auditoría T5-3**

Subagente `general`: verifica que los 3 docs estén consistentes (sin referencias a "ventana 7 días" en el contexto actual) y que no haya quedado contradicción con la spec. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 4: Validación final + auditor final + cierre

**Files:** ninguno (solo ejecución + `PLAN-V1.md`)

- [ ] **Step 1: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json`
Run: `npm test` → Expected: 32 passed.
Run: `npm run build` → Expected: OK, `[forja-pwa] sw.js generado con N archivos`.

- [ ] **Step 2: Smoke test de preview**

Levantar preview: `npm run preview` (background, puerto 4321). Verificar HTTP 200 de `/` y que el HTML servido contenga la leyenda nueva (sin rango, por SSR) y NO contenga `googleapis`. Cerrar el proceso al terminar.

- [ ] **Step 3: Auditor final**

Subagente `general` (NO edita): repasar Tasks 1–3 (diff global), correr la validación completa y reportar veredicto APROBADO/RECHAZADO + lista de archivos tocados.

- [ ] **Step 4: Cierre del plan**

Actualizar `PLAN-V1.md`: Estado → Tarea 5 completada + resultadode la auditoría final; añadir `docs/superpowers/plans/2026-08-10-volumen-semanal-lun-dom.md` como referencia. Commit: `git add PLAN-V1.md; git commit -m "docs: cerrar tarea 5 en el plan"` (solo si el auditor aprobó).