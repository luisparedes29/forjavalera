# Diseño — Rutina: separar brazos en bíceps/tríceps

- Fecha: 2026-08-28
- Estado: aprobado por el usuario (enfoque A — split limpio, 8–14 ambos)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`

## 1. Contexto

`src/data/routine.ts:3-32` define `GROUPS/GCOLORS/SET_GUIDE` con clave única `brazos` (7 ejercicios: 4 bíceps + 3 tríceps, 23 series/semana → zona "alto" vs 8–14). `logic.ts:108-130` `weeklyVolume` y `focusOf:76-82` agrupan por `e.group`, `ProgresoView:27-148` renderiza una sola barra "Brazos". El usuario quiere **ajustar y balancear** bíceps vs tríceps por separado.

## 2. Objetivo y criterios de éxito

1. Dos grupos nuevos `biceps`/`triceps` con volumen y `SET_GUIDE` independientes (ambos `8–14` inicial).
2. 4 bíceps (EZ, martillo, predicador, inclinado) → `g:'biceps'`; 3 tríceps (overhead, pushdown mié, pushdown vie) → `g:'triceps'`.
3. `ProgresoView` muestra dos filas con barras/estados separados (13 bíceps / 10 tríceps tras ajuste anterior → ambos "en rango").
4. Historial viejo `group:'brazos'` se ve separado sin pérdida (dual-read por nombre + migración al guardar).
5. `ROUTINE` sigue 35 ejercicios (LUN 9/MAR 6/MIÉ 7/JUE 6/VIE 7); `logic.ts`/`ProgresoView`/`Rutina` sin refactores.

## 3. Decisiones (aprobadas)

- Split limpio **A**: `GROUPS {biceps:'Bíceps', triceps:'Tríceps'}` + `GCOLORS {biceps:'#c9f24b' (lime heredado), triceps:'#ff8c42' (naranja nuevo)}` + `SET_GUIDE {biceps:8–14, triceps:8–14}`; `brazos` queda solo como fallback de lectura (no en `SET_GUIDE`).
- Nombres de ejercicios no cambian; solo `g`.
- Migración dual-read: si `e.group==='brazos'`, mapear por `normName` (`/curl|predicador/`→biceps, `/tríceps|triceps|pushdown|overhead/`→triceps); fallback a `brazos` si no machea.
- Rangos iniciales 8–14 ambos (ajustables sin tocar lógica).

## 4. Diseño técnico

### 4.1 Datos — `src/data/routine.ts:3-32`

```ts
GROUPS: { ..., biceps:'Bíceps', triceps:'Tríceps' } // sin 'brazos'
GCOLORS: { ..., biceps:'#c9f24b', triceps:'#ff8c42' }
SET_GUIDE: { ..., biceps:{min:8,max:14}, triceps:{min:8,max:14} } // 8 claves (sin 'brazos')
```

Retag 7 ej: `lun:120,128,136` → `biceps`; `mie:252,260` → `triceps`; `vie:376,384` → `triceps`/`biceps` respectivamente.

### 4.2 Lógica — `src/lib/logic.ts:76-130`

`focusOf` y `weeklyVolume` agregan fallback:

```ts
const g = e.group === 'brazos' ? mapBrazosByName(e.name) : e.group
function mapBrazosByName(n:string){ const k=normName(n); return /curl|predicador/.test(k) ? 'biceps' : /triceps|trí|pushdown|overhead/.test(k) ? 'triceps' : 'brazos' }
```

Sin cambiar firmas; `mondayOf`/`isEff` intactos.

### 4.3 UI — `src/components/progreso/ProgresoView.tsx:27,109-148`, `src/components/hierro/*`, `src/store/appStore.ts:91-198`

Iteran `SET_GUIDE`/`GROUPS` directo → dos filas nuevas automáticas. `Rutina.tsx:29-32` y `Sesion.tsx:92-94` usan `ROUTINE.g` sin cambios.

### 4.4 Persistencia y migración — `src/lib/storage.ts` + `appStore.ts`

Lectura dual (arriba). Al `commitSession`/`load`, si `history` contiene `brazos`, se reescribe en memoria a `biceps/triceps` y se persiste en próximo `save`.

### 4.5 Tests — `src/data/routine.test.ts:5-35`, `src/lib/test/logic.test.ts`

- `ROUTINE` 35 + `SET_GUIDE` 8 claves + `GROUPS` tiene `biceps/triceps`.
- `weeklyVolume` split: historial con `brazos` viejo + nuevo se cuentan separados; `focusOf` elige ganador entre 8 grupos.

### 4.6 Fuera de alcance

- Laterales, `forja_*`/`forja_week`, `exerciseSeries`, `stagnant`/`suggestFor` (per-exercise).

## 5. Validación

- `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (35 + split) · `npm run build` (SW 23).
- Manual: `ProgresoView` 8 grupos con bíceps 13 y tríceps 10 ambos "en rango"; historial viejo migrado.
- Respaldo v3 recomendado antes del deploy (pendiente `PLAN-V1.md:11`).

## 6. Riesgos

- Dos barras más en `ProgresoView` (8 vs 7) — escala `SCALE=24` sin cambios, solo más filas.
- Colores nuevos: verificar contraste en `global.css` si se ajusta.
