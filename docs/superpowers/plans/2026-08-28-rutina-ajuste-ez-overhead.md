# Rutina — Ajuste EZ y Overhead a 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bajar a 3 series Lun Curl EZ y Mié Overhead (ambos 4→3).

**Architecture:** 2 edits `sets` en `src/data/routine.ts`; test sin cambios.

**Tech Stack:** Astro 7 · React 19 · Zustand · TypeScript · Vitest · PowerShell.

## Global Constraints

- PowerShell sin `&&`; `tsc`/`test`/`build` verdes; sin comentarios; español; `SET_GUIDE` intacto; `dev` sin push.

---

### Task 1: Ajuste 2 series

**Files:** Modify `src/data/routine.ts:124,256`

- [ ] **Step 1:** `routine.ts:124` `[1,1,1,1]`→`[1,1,1]` (Curl EZ)
- [ ] **Step 2:** `routine.ts:256` `[1,1,1,1]`→`[1,1,1]` (Overhead)
- [ ] **Step 3:** Validar `tsc`/`npm test` (35)/`build` SW23
- [ ] **Step 4:** Commit `git add src/data/routine.ts; git commit -m "feat: bajar EZ y overhead a 3 series"`
- [ ] **Step 5:** Auditoría `general` (2× sets=3, laterales intactos)

### Task 2: Cierre

- [ ] Actualizar `PLAN-V1.md` Tarea 8 + auditor APROBADO; `git add PLAN-V1.md; git commit -m "docs: cerrar tarea 8 en el plan"`
