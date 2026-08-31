# Rutina — Separar Brazos en Bíceps/Tríceps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar `brazos` en `biceps` y `triceps` con `GROUPS/GCOLORS/SET_GUIDE` independientes y historial viejo `brazos` migrado por nombre.

**Architecture:** `src/data/routine.ts` define `biceps`/`triceps` (colores `#c9f24b`/`#ff8c42`, guía `8–14` ambos) y retagea 7 ejercicios; `src/lib/logic.ts` agrega `mapBrazosByName` fallback para `brazos` histórico; `ProgresoView` itera `SET_GUIDE` (8 claves) sin cambios; migración al guardar en `appStore`.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Typecheck `npx tsc --noEmit -p tsconfig.check.json` · Tests `npm test` · Build `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Copy `GROUPS` en español rioplatense (Bíceps/Tríceps) · Reps con en-dash `–` · Notas con `·` · Sin comentarios en código.
- NO tocar: laterales, `forja_*`/`forja_week` keys, `exerciseSeries`/`stagnant`/`suggestFor` (per-exercise), `MEASURES`.
- `SET_GUIDE` pasa 7→8 claves (`biceps`/`triceps` sin `brazos`); `ROUTINE` sigue 35 ejercicios (LUN 9/MAR 6/MIÉ 7/JUE 6/VIE 7).
- Commits en español (`feat:`, `docs:`) · Rama `dev`, sin push salvo orden explícita.
- Cada tarea termina con auditoría `general` (NO edita) — tsc/vitest/build + diff.
- Spec: `docs/superpowers/specs/2026-08-28-rutina-biceps-triceps-design.md`.

---

### Task 1: Datos — GROUPS/GCOLORS/SET_GUIDE + retag 7 ejercicios + tests

**Files:**
- Modify: `src/data/routine.ts:3-33` (GROUPS 3-12, GCOLORS 14-23, SET_GUIDE 25-33) + retag 7× `g` (lun 120,128,136; mie 252,260; vie 376,384)
- Modify: `src/data/routine.test.ts:5-35` (35 ejercicios, `GROUPS` biceps/triceps, `SET_GUIDE` 8)
- Test: `src/data/routine.test.ts` + `src/lib/test/logic.test.ts` (focusOf/weeklyVolume existing)

**Interfaces:**
- Produces: `GROUPS {biceps:'Bíceps', triceps:'Tríceps'}`, `GCOLORS {biceps:'#c9f24b', triceps:'#ff8c42'}`, `SET_GUIDE {biceps:8–14, triceps:8–14}` (8 claves, sin `brazos`), `ROUTINE` 7× retag.
- Consumes: nada (base para Task 2 logic fallback).

- [ ] **Step 1: Editar `src/data/routine.ts` — GROUPS/GCOLORS/SET_GUIDE**

Reemplazar `GROUPS`:
```ts
export const GROUPS: Record<string, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  piernas: 'Piernas',
  gluteos: 'Glúteos',
  core: 'Core',
  cardio: 'Cardio'
}
```
Reemplazar `GCOLORS`:
```ts
export const GCOLORS: Record<string, string> = {
  pecho: '#ff6b6b',
  espalda: '#3fd8c7',
  hombros: '#5db9ff',
  biceps: '#c9f24b',
  triceps: '#ff8c42',
  piernas: '#ffb02e',
  gluteos: '#ff8bd1',
  core: '#b78bff',
  cardio: '#ff7a2f'
}
```
Reemplazar `SET_GUIDE`:
```ts
export const SET_GUIDE: Record<string, { min: number; max: number }> = {
  pecho: { min: 10, max: 20 },
  espalda: { min: 10, max: 20 },
  hombros: { min: 8, max: 16 },
  biceps: { min: 8, max: 14 },
  triceps: { min: 8, max: 14 },
  piernas: { min: 10, max: 20 },
  gluteos: { min: 8, max: 16 },
  core: { min: 6, max: 12 }
}
```

- [ ] **Step 2: Retag 7 ejercicios en `src/data/routine.ts`**

Lun `Curl de bíceps con barra EZ` línea 120: `g: 'brazos'`→`g: 'biceps'`
Lun `Curl martillo` línea 128: `g: 'brazos'`→`g: 'biceps'`
Lun `Curl predicador` línea 136: `g: 'brazos'`→`g: 'biceps'`
Mié `Extensión tríceps overhead` línea 252: `g: 'brazos'`→`g: 'triceps'`
Mié `Pushdown tríceps en polea` línea 260: `g: 'brazos'`→`g: 'triceps'`
Vie `Extensión tríceps en polea (pushdown)` línea 376: `g: 'brazos'`→`g: 'triceps'`
Vie `Curl de bíceps inclinado` línea 384: `g: 'brazos'`→`g: 'biceps'`

- [ ] **Step 3: Actualizar `src/data/routine.test.ts`**

Línea 5: `'tiene 5 días y 35 ejercicios'` (ya 35, mantener)
Línea 8: `expect(total).toBe(35)` (ya 35, mantener)
Línea 33-35: `expect(Object.keys(SET_GUIDE)).toHaveLength(8)` (era 7) y `expect(min<=max)` para 8 claves
Agregar check `expect(GROUPS['biceps']).toBe('Bíceps')` y `expect(GROUPS['triceps']).toBe('Tríceps')` en `it('cada ejercicio tiene grupo válido')` si no existe

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: 32 tests passed, `GROUPS` con biceps/triceps, `SET_GUIDE` 8 claves.
Run: `npm run build` → Expected: OK SW 23.

- [ ] **Step 5: Commit**

Run: `git add src/data/routine.ts src/data/routine.test.ts; git commit -m "feat: separar brazos en bíceps y tríceps (GROUPS/GCOLORS/SET_GUIDE + 7 ejercicios)"`

- [ ] **Step 6: Auditoría T9-1**

Subagente `general` (NO edita): verifica 8 GROUPS/GCOLORS/SET_GUIDE sin `brazos`, 7× retag `biceps`/`triceps`, `ROUTINE` 35, tsc/test/build, laterales intactos. PASS/FAIL → marcar `PLAN-V1.md`.

---

### Task 2: Lógica — dual-read `brazos` histórico + migración al guardar + auditor final

**Files:**
- Modify: `src/lib/logic.ts:76-130` (focusOf, weeklyVolume + helper `mapBrazosByName`)
- Modify: `src/store/appStore.ts:91-198` (addRoutineExerciseToSession/commitSession con migración opcional)
- Test: `src/lib/test/logic.test.ts:158-226` (focusOf/weeklyVolume split)

**Interfaces:**
- Consumes: `GROUPS/GCOLORS/SET_GUIDE` de Task 1 (biceps/triceps sin `brazos`)
- Produces: `weeklyVolume` y `focusOf` separan `brazos` histórico por nombre; `appStore` persiste `biceps`/`triceps`.

- [ ] **Step 1: Agregar helper y parches en `src/lib/logic.ts`**

Tras `normName` (línea ~70), agregar:
```ts
function mapBrazosByName(n: string): string {
  const k = normName(n)
  if (/curl|predicador/.test(k)) return 'biceps'
  if (/triceps|tríceps|pushdown|overhead/.test(k)) return 'triceps'
  return 'brazos'
}
```
En `focusOf` (76-82) y `weeklyVolume` (108-130), cambiar `const g = e.group` por:
```ts
const g = e.group === 'brazos' ? mapBrazosByName(e.name) : e.group
```

- [ ] **Step 2: Opcional — migración al guardar en `src/store/appStore.ts`**

En `commitSession` (182-198) y `addRoutineExerciseToSession` (91-114), si `e.group==='brazos'` aplicar mismo `mapBrazosByName` antes de persistir, para que el próximo `save` guarde `biceps`/`triceps`. No borrar `brazos` existente sin mapear.

- [ ] **Step 3: Escribir tests que fallan en `src/lib/test/logic.test.ts`**

Agregar en `describe('weeklyVolume (semana calendario lun-dom local)')`:
```ts
it('separa brazos histórico en biceps/triceps por nombre', () => {
  const now = new Date(2026, 7, 3, 12, 0, 0).getTime()
  const h = [
    hist(new Date(2026, 7, 3, 10, 0, 0).toISOString(), [{ name: 'Curl de bíceps con barra EZ', sets: [set(10, 50, true)] }]),
    hist(new Date(2026, 7, 3, 11, 0, 0).toISOString(), [{ name: 'Pushdown tríceps en polea', sets: [set(10, 50, true)] }])
  ]
  // Simular historial viejo con group 'brazos' (hist helper default pecho → override group)
  h[0].exercises[0].group = 'brazos'; h[1].exercises[0].group = 'brazos'
  const out = weeklyVolume(h, now)
  expect(out['biceps'].sets).toBe(1)
  expect(out['triceps'].sets).toBe(1)
  expect(out['brazos']).toBeUndefined()
})
```

- [ ] **Step 4: Validar**

Run: `npm test` → Expected: FAIL si dual-read no implementado, PASS tras fix (32→33 tests).
Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm run build` → OK.

- [ ] **Step 5: Commit**

Run: `git add src/lib/logic.ts src/store/appStore.ts src/lib/test/logic.test.ts; git commit -m "feat: weeklyVolume/focusOf separan brazos histórico por nombre"`

- [ ] **Step 6: Auditoría T9-2 + auditor final**

Subagente `general` (NO edita): verifica dual-read `brazos→biceps/triceps` por nombre, `weeklyVolume` separa, `focusOf` elige entre 8 grupos, tsc/test/build. Reporta PASS/FAIL → auditor final whole-branch (`BASE..HEAD`) APROBADO/RECHAZADO + lista archivos.

---

### Task 3: Cierre

**Files:** `PLAN-V1.md`

- [ ] **Step 1: Actualizar `PLAN-V1.md`** Estado Tarea 9 cerrada + auditor APROBADO; referencia spec/plan. Commit: `git add PLAN-V1.md; git commit -m "docs: cerrar tarea 9 en el plan"` (solo si auditor aprobó).
