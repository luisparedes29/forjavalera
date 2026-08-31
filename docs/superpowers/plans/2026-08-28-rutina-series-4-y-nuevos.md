# Rutina — Series 4 brazos + Predicador + Pushdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar 4 series por defecto en 4 ejercicios de brazos (tríceps mié/vie + curls vie/lun EZ), martillo a 3, y agregar predicador (lun) + pushdown (mié) al final de cada día.

**Architecture:** Edit único en `src/data/routine.ts`: 5 arrays `sets` + 2 pushes `ex` al final de `lun`/`mie`. `src/data/routine.test.ts` pasa 33→35. UI sin cambios (lee `ROUTINE`).

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Typecheck: `npx tsc --noEmit -p tsconfig.check.json` · Tests: `npm test` · Build: `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Reps con en-dash `–` (`10–12`), notas con `·` y `RIR`. Español rioplatense, sin comentarios en código.
- NO tocar: laterales, `SET_GUIDE`, `GROUPS`, `GCOLORS`, `src/lib/logic.ts`, `ProgresoView.tsx`, `forja_*`/`forja_week`.
- Commits en español (`feat:`, `docs:`) · Rama `dev`, sin push salvo orden explícita.
- Cada tarea termina con auditoría `general` (NO edita) — tsc/vitest/build + diff.
- Spec: `docs/superpowers/specs/2026-08-28-rutina-series-4-y-nuevos-design.md`.

---

### Task 1: Rutina — 5 series edits + 2 nuevos + test 35

**Files:**
- Modify: `src/data/routine.ts` (lun 119-126, 127-134, 135; mie 243-251, 252; vie 359-374)
- Modify: `src/data/routine.test.ts:5-8`

**Interfaces:**
- Produces: `ROUTINE` 35 ejercicios (LUN 9, MIÉ 7). Consumes: nada.
- UI: `Rutina.tsx:29-32`/`Sesion.tsx:92-94` usan `sets` directo.

- [ ] **Step 1: Editar `routine.ts` — 5 series**

En `src/data/routine.ts`:
- Lun Curl EZ línea 124: `[1,1,1]`→`[1,1,1,1]`
- Lun Martillo línea 132: `[1,1]`→`[1,1,1]`
- Mié overhead línea 248: `[1,1,1]`→`[1,1,1,1]`
- Vie pushdown línea 364: `[1,1,1]`→`[1,1,1,1]`
- Vie curl inclinado línea 372: `[1,1,1]`→`[1,1,1,1]`

- [ ] **Step 2: Editar `routine.ts` — 2 inserts**

Tras `lun` martillo (línea 134, antes de `]` 135):
```ts
{
  n: 'Curl predicador (máquina o barra Z)',
  g: 'brazos',
  reps: '10–12',
  rest: '90 s',
  sets: [1, 1, 1],
  note: 'RIR 1–2 · predicador · cabeza corta aislada · codo fijo'
}
```
Tras `mie` overhead (línea 251, antes de `]` 252):
```ts
{
  n: 'Pushdown tríceps en polea',
  g: 'brazos',
  reps: '10–15',
  rest: '60–90 s',
  sets: [1, 1, 1],
  note: 'RIR 1 · énfasis en acortamiento · polea alta'
}
```

- [ ] **Step 3: Actualizar `routine.test.ts`**

Línea 5: `'tiene 5 días y 32 ejercicios'`→`'tiene 5 días y 35 ejercicios'`
Línea 8: `expect(total).toBe(33)`→`expect(total).toBe(35)`

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: 32 tests passed, invariante 35.
Run: `npm run build` → Expected: OK SW 23.

- [ ] **Step 5: Commit**

Run: `git add src/data/routine.ts src/data/routine.test.ts; git commit -m "feat: brazos a 4 series y nuevos predicador (lun) + pushdown (mié)"`

- [ ] **Step 6: Auditoría T7-1**

Subagente `general` (NO edita): verifica 5× sets (4/4/4/4/3), 2 inserts al final de lun/mie, total 35, laterales intactos, tsc/test/build. PASS/FAIL → marcar `PLAN-V1.md`.

---

### Task 2: Validación final + auditor final + cierre

**Files:** ninguno (solo `PLAN-V1.md`)

- [ ] **Step 1: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json`
Run: `npm test` → 35.
Run: `npm run build` → SW 23.

- [ ] **Step 2: Smoke test**

Manual: LUN 9 (predicador último), MIÉ 7 (pushdown último), 4 series en los 4 indicados, martillo 3.

- [ ] **Step 3: Auditor final**

Subagente `general` (NO edita): diff global `BASE..HEAD`, validación, reporta APROBADO/RECHAZADO + archivos tocados.

- [ ] **Step 4: Cierre**

Actualizar `PLAN-V1.md`: Estado Tarea 7 cerrada + auditor APROBADO; referencia spec/plan. Commit: `git add PLAN-V1.md; git commit -m "docs: cerrar tarea 7 en el plan"` (solo si el auditor aprobó).
