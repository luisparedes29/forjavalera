# Diseño — Rutina: ajuste EZ y overhead a 3 series

- Fecha: 2026-08-28
- Estado: aprobado (ajuste fino sobre Tarea 7)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`

## 1. Contexto

Tras Tarea 7 (`a7109bb`, 35 ejercicios, brazos 25), el usuario pidió bajar 2 ejercicios de 4→3 para afinar volumen: Lun `Curl EZ` y Mié `Overhead`. Estado actual `src/data/routine.ts:124` y `256` en `[1,1,1,1]`.

## 2. Objetivo

1. Lun `Curl de bíceps con barra EZ` 4→3 (`[1,1,1]`)
2. Mié `Extensión tríceps overhead en polea` 4→3 (`[1,1,1]`)
3. Brazos 25→23 (bíceps 14→13, tríceps 11→10), total ejercicios 35 sin cambios.
4. `routine.test.ts` sin cambios (sigue 35).

## 3. Decisiones

- Solo 2 arrays `sets`; laterales/`SET_GUIDE`/`GROUPS`/`logic.ts` intactos.
- Sin spec adicional: ajuste fino documentado en `PLAN-V1.md` Tarea 8.

## 4. Diseño técnico

- `src/data/routine.ts:124` `[1,1,1,1]`→`[1,1,1]` (EZ)
- `src/data/routine.ts:256` `[1,1,1,1]`→`[1,1,1]` (overhead)

## 5. Validación

- `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (35) · `npm run build` (SW 23) · auditoría 1 archivo.
