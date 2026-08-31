# Diseño — Rutina: series 4 brazos + predicador (lun) + pushdown (mié)

- Fecha: 2026-08-28
- Estado: aprobado por el usuario (scope consolidado: 5 series edits + 2 nuevos)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`

## 1. Contexto

Rutina en `src/data/routine.ts:62-377` (5 días, 8/6/6/6/7 = 33 ejercicios tras Tarea 6). Cada `RoutineExercise { n, g, reps, rest, sets, note }` se muestra en `Rutina.tsx`/`Sesion.tsx` vía `sets.filter(w<=week)`.

Tarea 6 quedó cerrada en `e21a4f4`. El usuario pidió llevar a 4 series (predeterminado) los tríceps de mié/vie, los curls (inclinado vie + EZ lun) y subir martillo a 3, más agregar predicador al final del lunes y pushdown al final del miércoles.

Laterales sin cambios (decisión Tarea 6 vigente).

## 2. Objetivo y criterios de éxito

1. Mié `Extensión tríceps overhead` 3→4, Vie `Extensión tríceps pushdown` 3→4, Vie `Curl inclinado` 3→4, Lun `Curl EZ` 3→4, Lun `Curl martillo` 2→3.
2. LUN al final (tras martillo, antes de `]` línea 135) aparece `Curl predicador (máquina o barra Z)` 3×10–12 RIR 1–2 90 s (LUN 8→9).
3. MIÉ al final (tras overhead, antes de `]` línea 252) aparece `Pushdown tríceps en polea` 3×10–15 RIR 1 60–90 s (MIÉ 6→7).
4. Total 33→35 ejercicios; `routine.test.ts` actualizado.
5. Volumen `brazos` 14→25 — se admite zona "alto" vs `SET_GUIDE 8–14` (informativo).
6. `Rutina`/`Sesion` reflejan orden y series sin tocar lógica.

## 3. Decisiones (aprobadas)

- Series 4 = `sets: [1,1,1,1]` (semana 1→4 series); martillo 3 = `[1,1,1]`.
- Nuevos con `g: brazos`, `sets: [1,1,1]`, reps/rest/nota exactos del pedido.
- Nombres: `Curl predicador (máquina o barra Z)` y `Pushdown tríceps en polea` (evita colisión con `Extensión tríceps en polea (pushdown)` del viernes).
- No tocar `SET_GUIDE`, `GROUPS`, `logic.ts`, `ProgresoView`, `forja_*`, laterales.
- Flujo Tarea 6/5: spec+plan versionados, cada subtarea marcada en `PLAN-V1.md` y auditada.

## 4. Diseño técnico

### 4.1 Rutina — `src/data/routine.ts`

Edits `sets` (5):
- `lun:119-126` Curl EZ `[1,1,1]`→`[1,1,1,1]`
- `lun:127-134` Martillo `[1,1]`→`[1,1,1]`
- `mie:243-250` Overhead `[1,1,1]`→`[1,1,1,1]`
- `vie:359-366` Pushdown vie `[1,1,1]`→`[1,1,1,1]`
- `vie:367-374` Curl inclinado `[1,1,1]`→`[1,1,1,1]`

Inserts (2):
- `lun` tras martillo (línea 134→135):
```ts
{ n: 'Curl predicador (máquina o barra Z)', g: 'brazos', reps: '10–12', rest: '90 s', sets: [1,1,1], note: 'RIR 1–2 · predicador · cabeza corta aislada · codo fijo' }
```
- `mie` tras overhead (línea 251→252):
```ts
{ n: 'Pushdown tríceps en polea', g: 'brazos', reps: '10–15', rest: '60–90 s', sets: [1,1,1], note: 'RIR 1 · énfasis en acortamiento · polea alta' }
```

### 4.2 Tests — `src/data/routine.test.ts:5-8`

`it('tiene 5 días y 32 ejercicios'`→`35` y `expect(total).toBe(33)`→`35`. Resto igual.

### 4.3 UI — sin cambios

`Rutina.tsx:29-32` `activeSets` y `Sesion.tsx:92-94` leen `ROUTINE` directo; nuevos y series 4 se renderizan con `repsLabel`/`rest`/nota.

### 4.4 Fuera de alcance

- `SET_GUIDE`, `GROUPS`, `GCOLORS`, `MEASURES`, `src/lib/logic.ts`, `ProgresoView.tsx`, `localStorage`.

## 5. Validación

- `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (35 invariante) · `npm run build` (SW 23).
- Manual: LUN 9 ejercicios (predicador último), MIÉ 7 (pushdown último), series 4 en los 4 indicados + martillo 3.
- Auditoría por subtarea + auditor final.
