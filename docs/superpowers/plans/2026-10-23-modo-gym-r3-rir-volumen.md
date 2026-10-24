# Modo GYM R3 — Inteligencia visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el diferencial de FORJA se vea en la fila: RIR opcional por serie, sugerencias que lo tienen en cuenta y semáforo de volumen semanal en vivo, sin convertir el registro en un formulario.

**Architecture:** `SetData` gana `rir?: number | null`. El campo es opcional, se guarda con spread en el respaldo v3 y no requiere migración. `suggestFor` conserva su firma y solo cambia de opinión cuando **todas** las series completadas tienen RIR. `VolumePulse` llama a `weeklyVolume` con un `SessionHistory` sintético de la sesión en curso, así no aparece un quinto criterio de volumen. `ProgresoView` y el historial muestran “series completadas” y RIR.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Validación: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Estado de partida: R2 cerrado con **60 tests**. Al cerrar R3 deben pasar **66 tests**.
- `tsconfig.check.json` solo incluye `src/lib/**/*.ts`, `src/data/**/*.ts`, `src/store/**/*.ts`. Los componentes se validan con `npm run build` y prueba manual.
- Sin comentarios nuevos en el código. Copy en español rioplatense (voseo). Commits en español (`feat:`, `test:`, `docs:`).
- No tocar las claves `forja_session`, `forja_session_start`, `forja_history`, `forja_body`, `forja_week` ni la versión 3 del respaldo.
- No hacer push. Rama `dev`.
- RIR es **opcional**: nunca bloquea guardar ni completa una serie.
- Cada tarea termina con commit y auditoría de un subagente `general` que **no edita**: verifica el diff, corre `tsc`/`npm test`/`npm run build` y devuelve APROBADO/RECHAZADO. El resultado se marca en `PLAN-V1.md`.
- Spec de referencia (leer antes de empezar): `docs/superpowers/specs/2026-10-23-modo-gym-design.md`.
- Depende de R2: fila v2 con barra del set activo, header sticky y `VolumePulse` en `RegistrarView`.

---

### Task 1: RIR opcional por serie

**Files:**
- Modify: `src/lib/types.ts` (`SetData.rir`)
- Modify: `src/store/appStore.ts` (`setSetRir`, `commitSession`)
- New: `src/components/hierro/RirChips.tsx`
- Modify: `src/components/hierro/Sesion.tsx` (chips, badge, copy)
- Modify: `src/components/hierro/Historial.tsx` (RIR en el detalle)
- Modify: `src/styles/global.css`

**Interfaces:**
- `SetData` gana `rir?: number | null` (`undefined`/`null` = sin RIR; valores `0`, `1`, `2`, `3`, donde `3` = “3 o más”).
- Store: `setSetRir(id: string, sid: number, rir: number | null): void`.
- No cambia la versión del respaldo: `buildBackup` copia los sets con spread.

- [ ] **Step 1: Agregar el campo y la acción**

En `src/lib/types.ts`:

```ts
export interface SetData {
  reps: number | string | null
  kg: number | string | null
  done: boolean
  rir?: number | null
}
```

En `src/store/appStore.ts`, agregar a la interfaz:

```ts
setSetRir: (id: string, sid: number, rir: number | null) => void
```

Implementar después de `setSetField`:

```ts
setSetRir: (id, sid, rir) => {
  set((s) => ({
    exercises: s.exercises.map((e) =>
      e.id === id
        ? {
            ...e,
            sets: e.sets.map((st, i) => (i === sid ? { ...st, rir } : st))
          }
        : e
    )
  }))
  saveL(LS.session, get().exercises)
},
```

En `commitSession`, reemplazar el `sets` del `clean` para conservar el RIR:

```ts
sets: e.sets.map((s) => {
  const out: SetData = {
    reps: Number(s.reps) || 0,
    kg: Number(s.kg) || 0,
    done: !!s.done
  }
  if (typeof s.rir === 'number') out.rir = s.rir
  return out
}),
```

No cambiar `buildBackup`: el spread de `sets` ya conserva `rir`.

- [ ] **Step 2: Crear los chips**

Crear `src/components/hierro/RirChips.tsx`:

```tsx
interface Props {
  value?: number | null
  onChange: (rir: number | null) => void
}

const OPTIONS: Array<number | null> = [null, 0, 1, 2, 3]

export default function RirChips({ value, onChange }: Props) {
  return (
    <div className="rir-chips" role="group" aria-label="RIR de la serie">
      {OPTIONS.map((v) => {
        const active = v === null ? value == null : value === v
        return (
          <button
            key={String(v)}
            type="button"
            className={active ? 'on' : ''}
            aria-pressed={active}
            onClick={() => onChange(v)}
          >
            {v === null ? '—' : v === 3 ? '3+' : v}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Mostrar los chips en el set activo**

En `Sesion.tsx`:

- Importar `RirChips`.
- Obtener `const setSetRir = useAppStore((s) => s.setSetRir)`.
- Después de `.set-tools` de la fila activa, agregar:

```tsx
<div className="set-tools-rir">
  <span>RIR</span>
  <RirChips
    value={s.rir}
    onChange={(v) => setSetRir(e.id, si, v)}
  />
</div>
```

- En el `<span className="set-num">`, agregar el badge:

```tsx
<span className="set-num">
  {si + 1}
  {typeof s.rir === 'number' ? (
    <i className="rir-dot">{s.rir === 3 ? '3+' : s.rir}</i>
  ) : null}
</span>
```

- En `onCopy`, agregar el RIR a cada serie:

```tsx
`${s.done ? ' ✔' : ''}${
  typeof s.rir === 'number' ? ` @RIR ${s.rir === 3 ? '3+' : s.rir}` : ''
}`
```

- [ ] **Step 4: Mostrar RIR en el historial**

En `src/components/hierro/Historial.tsx`, reemplazar el `map` de sets que hoy devuelve un string por JSX con badge:

```tsx
<span className="muted">
  {e.sets.map((s, si) => (
    <span className="hist-set" key={si}>
      {s.reps}×{fmtN(Number(s.kg) || 0, 1)}
      {s.done ? '✔' : ''}
      {typeof s.rir === 'number' ? (
        <i className="hist-rir">RIR {s.rir === 3 ? '3+' : s.rir}</i>
      ) : null}
      {si < e.sets.length - 1 ? ' · ' : ''}
    </span>
  ))}
</span>
```

- [ ] **Step 5: Estilos**

En `global.css`:

```css
.set-tools-rir {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 0 10px 58px;
  flex-wrap: wrap;
}
.set-tools-rir > span {
  font: 700 11px 'Space Grotesk';
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.rir-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.rir-chips button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  background: none;
  border: 1px solid var(--line);
  color: var(--muted);
  font: 700 12px 'Space Grotesk';
  cursor: pointer;
}
.rir-chips button:hover {
  border-color: var(--volt);
  color: var(--volt);
}
.rir-chips button.on {
  background: var(--volt);
  border-color: var(--volt);
  color: #101408;
}
.set-num {
  position: relative;
}
.rir-dot {
  position: absolute;
  top: -5px;
  right: -7px;
  font-style: normal;
  font-size: 9px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--volt);
  background: var(--panel2);
  border: 1px solid var(--volt);
  padding: 0 3px;
}
@media (max-width: 400px) {
  .set-tools-rir {
    padding-left: 0;
  }
}
.hist-rir {
  font-style: normal;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--volt);
  border: 1px solid var(--volt);
  padding: 0 3px;
  margin-left: 4px;
  vertical-align: 1px;
}
```

- [ ] **Step 6: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **60 passed** (sin tests nuevos).
Run: `npm run build` → OK.

Prueba manual: elegir RIR 0, 1, 2, 3+ y “—”; guardar la sesión; exportar el respaldo y verificar que `rir` viaja en el JSON; importarlo y verificar que se conserva. Verificar que RIR no bloquea Guardar.

Run: `git add src/lib/types.ts src/store/appStore.ts src/components/hierro/RirChips.tsx src/components/hierro/Sesion.tsx src/components/hierro/Historial.tsx src/styles/global.css`
Run: `git commit -m "feat: RIR opcional por serie"`

- [ ] **Step 7: Auditoría T12-1**

Subagente `general` (NO edita): verifica que `rir` sea opcional, que `setSetRir` persista en `forja_session`, que `commitSession` conserve el valor, que el respaldo v3 lo mantenga sin cambiar de versión, que RIR no bloquee guardar y que los chips midan 44 px; corre `tsc`/`npm test` (60)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 2: Sugerencias afinadas por RIR

**Files:**
- Modify: `src/lib/logic.ts` (`suggestFor`)
- Modify: `src/lib/test/logic.test.ts`

**Interfaces:**
- `suggestFor(e: { reps?: string; sets: SetData[] }): Suggest | null` conserva la firma.
- Las reglas con RIR solo aplican si **todas** las series completadas tienen `rir` numérico.

Reglas:

| Situación | Resultado |
|---|---|
| Sin RIR | Comportamiento actual |
| Todas al tope y RIR 0 | Mantener (`ok`, “Al límite”) |
| Todas al tope y RIR ≤ 2 | Subir |
| En rango y RIR ≥ 3 | Subir |
| Alguna bajo el mínimo | Repetir/bajar |
| RIR parcial | Fallback al comportamiento actual |

- [ ] **Step 1: Escribir los tests que fallan**

En `src/lib/test/logic.test.ts`, ampliar el helper `set`:

```ts
const set = (
  reps: number | null = 10,
  kg: number | null = 100,
  done = false,
  rir?: number | null
): SetData => ({
  reps,
  kg,
  done,
  ...(rir === undefined ? {} : { rir })
})
```

Agregar después del bloque `describe('suggestFor', ...)` existente:

```ts
describe('suggestFor con RIR', () => {
  const ex = (sets: SetData[]) => ({
    id: 'x',
    name: 'Press banca',
    group: 'pecho',
    reps: '8–12',
    rest: '2 min',
    sets
  })

  it('sin RIR conserva el comportamiento actual', () => {
    const out = suggestFor(ex([set(12, 100, true), set(12, 100, true)]))
    expect(out?.t).toBe('up')
  })

  it('todo al tope y RIR 0 pide mantener', () => {
    const out = suggestFor(ex([set(12, 100, true, 0), set(12, 100, true, 0)]))
    expect(out?.t).toBe('ok')
    expect(out?.msg).toContain('límite')
  })

  it('todo al tope y RIR 2 permite subir', () => {
    const out = suggestFor(ex([set(12, 100, true, 2), set(12, 100, true, 2)]))
    expect(out?.t).toBe('up')
  })

  it('en rango y RIR 3 o más permite subir', () => {
    const out = suggestFor(ex([set(10, 100, true, 3), set(9, 100, true, 3)]))
    expect(out?.t).toBe('up')
  })

  it('alguna serie bajo el mínimo pide repetir o bajar', () => {
    const out = suggestFor(ex([set(7, 100, true, 1), set(12, 100, true, 1)]))
    expect(out?.t).toBe('down')
  })

  it('RIR parcial vuelve al fallback por reps', () => {
    const out = suggestFor(ex([set(12, 100, true, 0), set(12, 100, true)]))
    expect(out?.t).toBe('up')
  })
})
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — los casos con RIR 0 y RIR 3 no se distinguen.

- [ ] **Step 3: Implementar las reglas**

Reemplazar `suggestFor` en `src/lib/logic.ts` por:

```ts
export function suggestFor(
  e: { reps?: string; sets: SetData[] }
): Suggest | null {
  const rr = repRange(e)
  if (!rr) return null
  const done = e.sets.filter((s) => s.done && Number(s.reps) > 0)
  if (!done.length || done.length !== e.sets.length) return null

  const rirKnown = done.every((s) => typeof s.rir === 'number')
  const anyLow = done.some((s) => Number(s.reps) < rr[0])
  if (anyLow) return { t: 'down', msg: '▼ Repetí o bajá la carga' }

  const allTop = done.every((s) => Number(s.reps) >= rr[1])
  if (allTop) {
    if (rirKnown && done.every((s) => s.rir === 0))
      return { t: 'ok', msg: '✓ Al límite · mantené la carga' }
    return { t: 'up', msg: '▲ Subí ~2,5 kg la próxima' }
  }

  if (rirKnown && done.every((s) => Number(s.rir) >= 3))
    return { t: 'up', msg: '▲ Subí ~2,5 kg la próxima' }

  return { t: 'ok', msg: '✓ En rango · mantené la carga' }
}
```

- [ ] **Step 4: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **66 passed**.
Run: `npm run build` → OK.

Run: `git add src/lib/logic.ts src/lib/test/logic.test.ts`
Run: `git commit -m "feat: sugerencias de carga segun RIR"`

- [ ] **Step 5: Auditoría T12-2**

Subagente `general` (NO edita): verifica las seis reglas, que sin RIR el comportamiento sea idéntico al anterior, que RIR parcial no rompa, que `Suggest` conserve `t`/`msg` y que no se haya tocado `commitSession`; corre `tsc`/`npm test` (66)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 3: Semáforo de volumen en vivo

**Files:**
- New: `src/components/hierro/VolumePulse.tsx`
- Modify: `src/components/hierro/RegistrarView.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consume `weeklyVolume(history, now)` sin helpers nuevos de volumen.
- Construye un `SessionHistory` sintético `{ id: 'live', ts: new Date(now).toISOString(), volume: 0, focus: '', exercises }` y lo antepone al historial.
- No renderiza hasta estar montado (evita hydration mismatch).

- [ ] **Step 1: Crear el componente**

Crear `src/components/hierro/VolumePulse.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { GCOLORS, GROUPS, SET_GUIDE } from '../../data/routine'
import { weeklyVolume } from '../../lib/logic'
import type { WeeklyVolumeEntry } from '../../lib/logic'
import type { SessionHistory } from '../../lib/types'
import { useAppStore } from '../../store/appStore'

const SCALE = 24

export default function VolumePulse() {
  const history = useAppStore((s) => s.history)
  const exercises = useAppStore((s) => s.exercises)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const wv = useMemo(() => {
    if (now === null) return {}
    const live: SessionHistory | null = exercises.length
      ? {
          id: 'live',
          ts: new Date(now).toISOString(),
          volume: 0,
          focus: '',
          exercises
        }
      : null
    return weeklyVolume(live ? [live, ...history] : history, now)
  }, [now, history, exercises])

  if (now === null || !exercises.length) return null

  const groups = [...new Set(exercises.map((e) => e.group))].filter(
    (g) => SET_GUIDE[g]
  )

  return (
    <section className="volume-pulse" aria-label="Volumen semanal en vivo">
      <h3>
        Volumen en vivo <span>semana + sesión</span>
      </h3>
      {groups.map((g) => {
        const d: WeeklyVolumeEntry = wv[g] ?? {
          sets: 0,
          volume: 0,
          ex: new Set<string>()
        }
        const guide = SET_GUIDE[g]
        const cls =
          d.sets === 0
            ? 'none'
            : d.sets < guide.min
              ? 'low'
              : d.sets > guide.max
                ? 'high'
                : 'ok'
        return (
          <div
            className="vp-row"
            key={g}
            style={{ '--gc': GCOLORS[g] } as CSSProperties}
          >
            <span className="vp-name">{GROUPS[g]}</span>
            <div
              className="vp-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={SCALE}
              aria-valuenow={d.sets}
              aria-label={`${GROUPS[g]}: ${d.sets} series`}
            >
              <span
                className="vp-zone"
                style={{
                  left: `${(guide.min / SCALE) * 100}%`,
                  width: `${((guide.max - guide.min) / SCALE) * 100}%`
                }}
              />
              <span
                className={`vp-fill ${cls}`}
                style={{ width: `${(Math.min(d.sets, SCALE) / SCALE) * 100}%` }}
              />
            </div>
            <span className={`vp-num ${cls}`}>
              {d.sets}
              <i>/{guide.max}</i>
            </span>
          </div>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 2: Insertarlo en Registrar**

En `src/components/hierro/RegistrarView.tsx`:

```tsx
import SessionHeader from './SessionHeader'
import VolumePulse from './VolumePulse'
import Sesion from './Sesion'
import Historial from './Historial'

export default function RegistrarView() {
  return (
    <main>
      <SessionHeader />
      <VolumePulse />
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

- [ ] **Step 3: Estilos**

```css
.volume-pulse {
  border: 1px solid var(--line);
  background: var(--panel2);
  padding: 12px 14px;
  margin-bottom: 16px;
}
.volume-pulse h3 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font: 700 11px 'Space Grotesk';
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
}
.volume-pulse h3 span {
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: none;
}
.vp-row {
  display: grid;
  grid-template-columns: 78px 1fr 58px;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.vp-name {
  font-size: 12px;
  color: var(--gc);
  font-weight: 700;
}
.vp-track {
  position: relative;
  height: 10px;
  background: var(--field);
  border: 1px solid var(--line);
  overflow: hidden;
}
.vp-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(201, 242, 75, 0.16);
  border-left: 1px solid rgba(201, 242, 75, 0.45);
  border-right: 1px solid rgba(201, 242, 75, 0.45);
}
.vp-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--gc);
  opacity: 0.85;
}
.vp-fill.low {
  background: var(--orange);
}
.vp-fill.high {
  background: var(--blue);
}
.vp-num {
  text-align: right;
  font-family: Anton;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.vp-num i {
  font-style: normal;
  font-family: 'Space Grotesk';
  font-size: 11px;
  color: var(--muted);
}
.vp-num.low {
  color: var(--orange);
}
.vp-num.ok {
  color: var(--volt);
}
.vp-num.high {
  color: var(--blue);
}
@media (max-width: 400px) {
  .vp-row {
    grid-template-columns: 64px 1fr 50px;
  }
}
```

- [ ] **Step 4: Validar y commitear**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **66 passed** (sin tests nuevos).
Run: `npm run build` → OK.

Prueba manual: con 2 sesiones guardadas y una sesión en curso, comparar el semáforo contra Progreso; tildar una serie y verificar que el número sube en vivo; confirmar que no se duplica el historial guardado.

Run: `git add src/components/hierro/VolumePulse.tsx src/components/hierro/RegistrarView.tsx src/styles/global.css`
Run: `git commit -m "feat: semaforo de volumen semanal en vivo"`

- [ ] **Step 5: Auditoría T12-3**

Subagente `general` (NO edita): verifica que `VolumePulse` use `weeklyVolume` y no un cálculo paralelo, que solo sume series `done`, que no renderice en SSR, que el `role="meter"` tenga min/max/now, que no duplique sesiones guardadas y corre `tsc`/`npm test` (66)/`build`. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 4: Progreso honesto, documentación y cierre de R3

**Files:**
- Modify: `src/components/progreso/ProgresoView.tsx`
- Modify: `README.md`
- Modify: `MIGRACION-ASTRO.md`
- Modify: `PLAN-V1.md` (Tarea 12)

- [ ] **Step 1: Ajustar el copy de Progreso**

En `src/components/progreso/ProgresoView.tsx`:

- Leyenda:

```tsx
zona = objetivo recomendado · series completadas de la semana (lun–dom)
```

- Stat:

```tsx
<span>series completadas</span>
```

- Estado vacío del volumen: cambiar la condición `!history.length` por `totalSets === 0` y el texto:

```tsx
<p>
  Todavía no hay series completadas esta semana.
  <br />
  <b>El volumen semanal es la clave de la hipertrofia.</b>
</p>
```

- Estado vacío del gráfico:

```tsx
Guardá series completadas de este ejercicio para ver su progresión.
```

- Si `names.length` es 0, el select sigue mostrando “Sin ejercicios aún”; no cambiar.

- [ ] **Step 2: Documentar RIR y el semáforo**

`README.md`:

- En Funcionalidades, agregar:
  “RIR opcional por serie (0, 1, 2, 3+) con sugerencias de carga que lo tienen en cuenta.”
  “Semáforo de volumen semanal en vivo que combina el historial de la semana con la sesión en curso.”
- En Modelo de datos, aclarar que `rir` es opcional, que el respaldo sigue siendo v3 y que los respaldos viejos se importan sin cambios.
- En Progreso, reforzar que todos los números salen de series completadas.

`MIGRACION-ASTRO.md`, en `## Estado`:

```markdown
- Decisión post-migración (2026-10-23): `SetData.rir` es opcional y no cambia la versión
  del respaldo (sigue v3). Las sugerencias de carga solo usan RIR cuando todas las series
  completadas lo tienen; sin RIR se mantiene la regla por reps.
- Decisión post-migración (2026-10-23): el semáforo de volumen en vivo reutiliza
  `weeklyVolume` con la sesión en curso como una sesión más. No existe un quinto criterio
  de volumen.
```

- [ ] **Step 3: Marcar la Tarea 12 en PLAN-V1.md**

Bajo `## Tarea 12 — Modo GYM R3: RIR y volumen en vivo`, marcar T12-1 a T12-3 con `[x]` y
el resultado de cada auditoría. Agregar al final:

```markdown
- **Cierre R3 (2026-10-23)**: auditor final APROBADO (66 tests, tsc + build OK, RIR
  opcional conservado en respaldo v3, sugerencias por RIR, semáforo en vivo sin duplicar
  volumen y Progreso con “series completadas”).
```

- [ ] **Step 4: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: **66 passed**.
Run: `npm run build` → OK con `[forja-pwa] sw.js generado con N archivos`.

Smoke test:
Run: `npm run preview` (background, puerto 4321).
Verificar HTTP 200 de `/`, `/manifest.json`, `/sw.js`.
Verificar en DevTools 360×844, 390×844 y 412×915:
1. Registrar una serie con RIR 0 y verificar el badge en la fila y en el historial.
2. Completar todas las series al tope con RIR 0 → “mantené”; con RIR 2 → “subí”.
3. Semáforo en vivo sube al tildar una serie y coincide con Progreso tras guardar.
4. El estado vacío de Progreso distingue “sin series completadas” de “sin historial”.
5. Exportar/importar respaldo con RIR y verificar que se conserva.

- [ ] **Step 5: Commit y auditor final**

Run: `git add src/components/progreso/ProgresoView.tsx README.md MIGRACION-ASTRO.md PLAN-V1.md`
Run: `git commit -m "docs: cerrar release 3 de RIR y volumen en vivo"`

Subagente `general` (NO edita): repasa Tasks 1–4, corre la validación completa, verifica que
`rir` sea opcional en tipos y respaldo, que las seis reglas de `suggestFor` se cumplan, que
`VolumePulse` use `weeklyVolume` y que no queden textos “series efectivas” en Progreso.
Devuelve APROBADO/RECHAZADO y la lista de archivos tocados.

---

## Criterio de salida de R3

- [ ] `npm test` → 66 passed.
- [ ] `npx tsc --noEmit -p tsconfig.check.json` → limpio.
- [ ] `npm run build` → OK, SW generado.
- [ ] RIR opcional por serie, visible en fila e historial, conservado en respaldo v3.
- [ ] Sugerencias por RIR con las seis reglas testeadas.
- [ ] Semáforo de volumen en vivo con `weeklyVolume`, sin duplicar sesiones.
- [ ] Progreso dice “series completadas” y distingue vacío de datos.
- [ ] Auditor final APROBADO y Tarea 12 cerrada en `PLAN-V1.md`.
