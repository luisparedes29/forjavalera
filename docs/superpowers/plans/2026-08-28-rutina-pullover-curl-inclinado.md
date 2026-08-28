# Rutina — Pullover en polea + Curl inclinado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar pullover en polea alta el lunes (entre remo y face pull) y reemplazar el curl en polea baja del viernes por curl inclinado con mancuernas, sin tocar laterales.

**Architecture:** Single source `src/data/routine.ts` — un `RoutineExercise` nuevo en `lun.ex[2]` y un reemplazo 1:1 en `vie.ex[6]`. `src/data/routine.test.ts` actualiza el invariante 32→33. UI (`Rutina.tsx`/`Sesion.tsx`) no cambia: lee `ROUTINE` y renderiza nombre/grupo/reps×rest/series/nota automáticamente.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · Windows/PowerShell.

## Global Constraints

- Node ≥ 22.12 · PowerShell: **NO** usar `&&`; encadenar con `;` o `if ($?)`.
- Typecheck: `npx tsc --noEmit -p tsconfig.check.json` · Tests: `npm test` · Build: `npm run build` (log `[forja-pwa] sw.js generado con N archivos`).
- Copy en español rioplatense (voseo) para `note`. No agregar comentarios al código.
- NO tocar: laterales de hombro, `SET_GUIDE`, `GROUPS`, `GCOLORS`, `src/lib/logic.ts`, `ProgresoView.tsx`, `forja_*`/`forja_week`.
- Commits en español (`feat:`, `test:`, `docs:`). Rama `dev`, sin push salvo orden explícita.
- Cada tarea termina con auditoría: subagente `general` (NO edita) verifica diff, corre tsc/vitest/build y reporta PASS/FAIL.
- Spec: `docs/superpowers/specs/2026-08-28-rutina-pullover-curl-inclinado-design.md`.

---

### Task 1: Rutina — pullover (lunes) + curl inclinado (viernes)

**Files:**
- Modify: `src/data/routine.ts` (lun ~línea 80-94, vie ~línea 360-365)
- Modify: `src/data/routine.test.ts:8` (`32` → `33`)

**Interfaces:**
- Produces: `ROUTINE` con 33 ejercicios (LUN 8, resto igual). Consumes: nada.
- UI: `Rutina.tsx:29-32` `activeSets` y `Sesion.tsx:92-94` `buildOne` usan `sets` directamente.

- [ ] **Step 1: Editar `routine.ts` — pullover lunes**

En `lun.ex`, insertar entre `Remo con barra o máquina` y `Face pull en polea alta`:

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

Orden resultante LUN: Jalón → Remo → **Pullover en polea alta** → Face pull → Peck deck inv → Laterales → Curl EZ → Martillo (8 ejercicios).

- [ ] **Step 2: Editar `routine.ts` — curl inclinado viernes**

Reemplazar `vie.ex` último elemento `Curl bíceps en polea baja` por:

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

Laterales quedan intactos.

- [ ] **Step 3: Actualizar `routine.test.ts`**

Línea 8: `expect(total).toBe(32)` → `expect(total).toBe(33)`.

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit -p tsconfig.check.json` → sin errores.
Run: `npm test` → Expected: todos PASS, invariante rutina 33.
Run: `npm run build` → Expected: OK (SW ~23 archivos).

- [ ] **Step 5: Commit**

Run: `git add src/data/routine.ts src/data/routine.test.ts; git commit -m "feat: rutina con pullover en polea (lunes) y curl inclinado (viernes)"`

- [ ] **Step 6: Auditoría T6-1**

Subagente `general` (NO edita): verifica orden LUN (pullover índice 2), reemplazo VIE (nombre/reps/rest/nota), total 33, tsc/vitest/build verdes, sin laterales tocados. PASS/FAIL → marcar en `PLAN-V1.md`.

---

### Task 2: Validación final + auditor final + cierre

**Files:** ninguno (solo ejecución + `PLAN-V1.md`)

- [ ] **Step 1: Validación completa**

Run: `npx tsc --noEmit -p tsconfig.check.json`
Run: `npm test` → Expected: 33 rutina + suite completa PASS.
Run: `npm run build` → Expected: OK.

- [ ] **Step 2: Smoke test**

Manual (dev o preview): tabs LUN (8 ejercicios, pullover 3er lugar tras remo) y VIE (curl inclinado último con nota banco 45–60°); `+ sesión` crea 3 series; `Rutina` muestra reps×rest y nota correctas.

- [ ] **Step 3: Auditor final**

Subagente `general` (NO edita): repasa diff global, validación y reporta APROBADO/RECHAZADO + lista de archivos tocados.

- [ ] **Step 4: Cierre del plan**

Actualizar `PLAN-V1.md`: Estado → Tarea 6 completada + resultado auditoría; referencia a spec y plan. Commit: `git add PLAN-V1.md; git commit -m "docs: cerrar tarea 6 en el plan"` (solo si el auditor aprobó).
