# Diseño — Volumen semanal con ventana calendario (lun–dom)

- Fecha: 2026-08-10
- Estado: aprobado por el usuario (semántica lun–dom local + rango visible + flujo de auditoría por subtarea)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`

## 1. Problema

`weeklyVolume()` (`src/lib/logic.ts:100-122`) usa una **ventana móvil de 7 días**
(`now - 7*24h`). Hoy lunes, las sesiones del lunes–domingo pasado caen dentro de la
ventana → el "Volumen semanal" arrastra la semana anterior:

- Stats "series esta semana" / "kg esta semana" (`ProgresoView.tsx:60-76`)
- Panel `01/` vs. `SET_GUIDE` (zona objetivo por grupo) (`ProgresoView.tsx:80-156`)
- La leyenda lo admite: *"series efectivas de los últimos 7 días"* (`ProgresoView.tsx:87`)

Es comportamiento **heredado del monolito** (misma ventana), no un bug de la migración.
El test golden actual valida la ventana móvil (`src/lib/test/logic.test.ts:167-186`) y
debe actualizarse.

## 2. Objetivo y criterios de éxito

1. El lunes a las **00:00 hora local del dispositivo** la semana arranca en 0 y acumula hasta el domingo.
2. Sesión del domingo 23:59 local previo → **excluida**; sesión del lunes 00:00 local → **incluida**.
3. Stats y panel del volumen usan la misma ventana (derivan de `weeklyVolume`).
4. El panel muestra el rango de la semana visible (ej. "semana del 10 al 16 ago").
5. Tests deterministas independientes de la TZ del runner.

## 3. Decisiones (aprobadas por el usuario)

- **Opción A**: semana calendario lun–dom, frontera en hora local del dispositivo (no UTC:
  en Argentina la frontera UTC caería el domingo 21:00 y rompería el entrenamiento del domingo a la noche).
- **Mostrar rango de semana** en el panel de volumen.
- **Flujo de trabajo**: mismo que Tarea 3 — cada subtarea se marca en `PLAN-V1.md` y se audita con subagente.

## 4. Diseño técnico

### 4.1 Lógica — `src/lib/logic.ts`

Nuevo export:

```ts
export function mondayOf(now: number): number {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
```

`weeklyVolume(history, now = Date.now())` conserva la firma; cambia el filtro:

```ts
if (new Date(h.ts).getTime() < mondayOf(now)) return
```

Las sesiones se almacenan como ISO-UTC; comparar instantes contra `mondayOf` (instante local
del lunes 00:00) es correcto y no requiere conversión.

### 4.2 Tests — `src/lib/test/logic.test.ts`

- **Portables a cualquier TZ, sin pin**: las fixtures se construyen con el constructor
  local (`new Date(2026, 7, 3, 12, 0, 0)` para `now`; sesiones con
  `new Date(y, m, d, h, min).toISOString()` porque `hist()` recibe ISO-UTC). El instante
  resultante se interpreta en la TZ del runner — exactamente la semántica de producción
  (frontera local del dispositivo). 2026-08-03 es lunes en todo calendario local, así los
  casos valen en cualquier huso. NO se usa `process.env.TZ`.
- Unit test de `mondayOf`: con `now` conocido, verifica lunes 00:00 local.
- `weeklyVolume` — casos de frontera (base `now` = lunes 2026-08-03 12:00 local):
  1. Sesión sábado 2026-08-01 → **excluida** (invierte el golden actual).
  2. Sesión lunes 00:00:00 local (2026-08-03) → **incluida** (frontera inclusiva).
  3. Sesión domingo 23:59:59 local previo (2026-08-02) → **excluida**.
  4. Sesión martes de la misma semana (2026-08-04) → **incluida** y acumula en el grupo.
- El golden actual se reemplaza por el caso 4 (misma expectativa `sets/volume/ex`).
- Total esperado: 32 tests (27 − 1 bloque reemplazado + 2 `mondayOf` + 4 `weeklyVolume`).

### 4.3 UI — `src/components/progreso/ProgresoView.tsx`

- Leyenda (línea 87): *"series efectivas de la semana (lun–dom)"*.
- Rango visible: *"semana del 10 al 16 ago"* con `Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })`.
- **Anti-hydration-mismatch**: el rango se calcula en `useState<string | null>(null)` +
  `useEffect` de mount (patrón del reloj del TopBar). SSR renderiza sin rango; el cliente lo
  rellena tras montar. Evita el mismatch server/client de `Date.now()` y TZ.

### 4.4 Fuera de alcance (sin cambios)

- `exerciseSeries` (progresión histórica), `allExerciseNames`, stats "ejercicios".
- `localStorage` y claves `forja_*` → **datos del teléfono intactos**; sin necesidad de respaldo por este cambio.
- Semántica de "semana de programa" (`forja_week`, semana 1–6 / DELOAD): ortogonal, intacta.

## 5. Validación

- `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (27/27 + nuevos) · `npm run build`.
- Manual en dev: sesiones simuladas de la semana pasada → panel en 0 el lunes; rango visible.
- Auditoría con subagente por subtarea (flujo Tarea 3) + auditor final.
