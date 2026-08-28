# Diseño — Rutina: pullover en polea (lunes) + curl inclinado (viernes)

- Fecha: 2026-08-28
- Estado: aprobado por el usuario (scope cerrado: sin laterales; pullover en polea)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`

## 1. Contexto

La rutina vive en `src/data/routine.ts:62-369` (5 días LUN–VIE, 7/6/6/6/7 ejercicios = 32). Cada `RoutineExercise { n, g, reps, rest, sets, note }` se renderiza en `Rutina.tsx`/`Sesion.tsx` y el volumen semanal usa `SET_GUIDE` + `weeklyVolume` (lun–dom local).

El usuario pidió tres ajustes y cerró el primero:

- Laterales de hombro: **sin cambios** (se mantienen LUN 2, MIÉ 3, VIE polea 3).
- Lunes (Tracción): agregar pullover 3×12–15 RIR 1–2 90 s después del remo y antes del face pull, **en polea**.
- Viernes (Mixto): reemplazar `Curl bíceps en polea baja` por curl inclinado con mancuernas 3×10–12 RIR 1–2 90 s, banco 45–60°, brazos atrás del hombro.

## 2. Objetivo y criterios de éxito

1. Lunes muestra 8 ejercicios en orden: Jalón → Remo → **Pullover en polea** → Face pull → Peck deck inv → Laterales → Curl EZ → Martillo.
2. Viernes muestra `Curl de bíceps inclinado con mancuernas` en lugar de `Curl bíceps en polea baja`, con reps `10–12`, rest `90 s`, nota con banco 45–60° y brazos atrás del hombro.
3. `ROUTINE` total pasa de 32 → **33** ejercicios; el test de invariantes se actualiza.
4. Volumen `SET_GUIDE`: espalda 11→14 (dentro de 10–20), brazos 14→14 (sin cambio neto), hombros 16 sin cambios; `ProgresoView` sigue correcto.
5. `Rutina.tsx`/`Sesion.tsx` reflejan los cambios sin tocar lógica (solo datos).

## 3. Decisiones (aprobadas por el usuario)

- **Laterales: no se tocan.** Se descarta la variante 4×/8 semanales.
- **Pullover = en polea** (no mancuerna). Grupo `espalda` (día de tracción), 3 series `12–15`, `90 s`, `RIR 1–2`.
- **Curl inclinado** reemplaza 1:1 al de polea baja en VIE (último slot), grupo `brazos`, `10–12`, `90 s`, `RIR 1–2`, nota con `banco 45–60° · brazos atrás del hombro · cabeza larga estirada`.
- **Formato de trabajo:** mismo flujo que Tarea 5 — spec + plan versionados en `docs/superpowers/`, cada subtarea se marca en `PLAN-V1.md` y se audita con subagente, commits `feat:/test:/docs:` en `dev` sin push automático.

## 4. Diseño técnico

### 4.1 Rutina — `src/data/routine.ts`

Insertar en `lun.ex` entre `Remo con barra o máquina` (línea 80–86) y `Face pull en polea alta` (88–94):

```ts
{
  n: 'Pullover en polea alta',
  g: 'espalda',
  reps: '12–15',
  rest: '90 s',
  sets: [1, 1, 1],
  note: 'RIR 1–2 · dorsal ancho en estiramiento · polea alta · tras remo, antes de face pull'
}
```

Reemplazar en `vie.ex` (línea 360–365):

```ts
{
  n: 'Curl de bíceps inclinado con mancuernas',
  g: 'brazos',
  reps: '10–12',
  rest: '90 s',
  sets: [1, 1, 1],
  note: 'RIR 1–2 · banco 45–60° · brazos atrás del hombro · cabeza larga estirada'
}
```

Laterales permanecen intactos.

### 4.2 Tests — `src/data/routine.test.ts:5-8`

Actualizar el invariante `expect(total).toBe(32)` → `33`. El resto (GROUPS, sets, MEASURES, SET_GUIDE) no cambia.

### 4.3 UI — sin cambios de código

`Rutina.tsx`/`Sesion.tsx` leen `ROUTINE` y `repsLabel`/`activeSets`; el nuevo ejercicio y el reemplazo se renderizan automáticamente (nombre, grupo, reps×rest, series, nota, botón `+ sesión`).

### 4.4 Fuera de alcance (sin cambios)

- `SET_GUIDE`, `GROUPS`, `GCOLORS`, `MEASURES`.
- `src/lib/logic.ts` (`mondayOf`, `weeklyVolume`, `SET_GUIDE` stats), `ProgresoView.tsx`.
- `localStorage` y claves `forja_*` / `forja_week` → datos del teléfono intactos.
- Laterales de hombro (explícitamente descartado).

## 5. Validación

- `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (rutina 33 + suite completa) · `npm run build` (SW precache).
- Manual en dev/preview: tabs LUN (8 ejercicios, pullover entre remo y face pull) y VIE (curl inclinado último); `+ sesión` agrega 3 series con `lastSets` hidratado.
- Auditoría con subagente por subtarea + auditor final (flujo Tarea 5).
