# PLAN V1 — README · merge dev→main · optimizaciones Astro

> Documento de **contexto persistente** para la V1. Cualquier sesión nueva debe leerlo
> antes de tocar el código. Complementa a `MIGRACION-ASTRO.md` (migración monolito→Astro).

## Estado
- Fecha: 2026-10-23 · Última actualización: R3 cerrado (RIR y volumen en vivo).
- **Hecho**: Tareas 1 (README), 2 (merge dev→main, por el usuario), 3 (optimizaciones,
  commiteada en `dev` local `acde33c`, **push pendiente**), 5 (volumen semanal lun–dom, `ae072c6`), 6 (rutina pullover + curl inclinado, `570b8ab`/`616fa4b`), 7 (series 4 + predicador/pushdown, `61bcc8e`/`c4e6137`), 8 (ajuste EZ/overhead a 3, `2b186a0`), 9 (split brazos→bíceps/tríceps, `ee9c49d`/`7b0db2e`/`616e5c5`), planificación Modo GYM (spec + planes R1/R2/R3, 2026-10-23) y Tareas 10 (R1 confiabilidad), 11 (R2 sesión-first) y 12 (R3 RIR y volumen en vivo), con auditor final aprobado por release.
- **En curso**: —
- **Pendiente**: push de `dev` → merge a `main` (lo hace el usuario) → deploy producción + verificación en el teléfono; **respaldo v3 antes del deploy** (el usuario SÍ tiene datos de la semana pasada en el teléfono, en la URL vieja); Tarea 4 opcional.
- **URL de producción confirmada**: `https://forjavalera.netlify.app/` (corregir
  `astro.config.mjs` y README en R1; hoy dicen `forja.netlify.app`).
- **Regla acordada**: tareas por confirmación del usuario; tras cada bloque se actualiza
  este archivo.

## Contexto — hallazgos de la auditoría (3 agentes en paralelo)
- **Por qué ~25 requests en la preview**: 14 chunks JS (7 islas + renderer React `client.js`
  184 KB + runtime/store/shared) + CSS (2) + **Google Fonts (3–6**requests: 1 css2 + woff2,
  no precacheados, fallan offline) + `sw.js` (84 KB) + icon/manifest + html ≈ 24–26.
  ~420 KB brutos / ~140 KB comprimidos. No es "Astro descarga de más": es React + fuentes 3rd-party.
- **Merge dev→main**: `origin/main` = monolito (4 archivos: `index.html`, `sw.js`,
  `manifest.json`, `icon.svg`). `origin/dev` = proyecto Astro **+ esos 4 archivos legacy
  huérfanos** (el deploy publica `dist/`, no se usan). Merge base `ed4e139` → **solo 4
  conflictos** (los legacy); el resto son adds.
- **Higiene git**: `MIGRACION-ASTRO.md` tiene cambios sin commitear; `dev` local quedó
  stale (apunta al monolito `ed4e139`) → trabajar con `origin/dev`.
- **Best practices Astro (auditoría)**: baseline sólido (SSG, store único, islas). Mejoras:
  P1 (hash→vista duplicado en 3 lugares; localStorage sin guard SSR) y P2 (directivas de
  hidratación subóptimas en Timer/Toasts/FooterBar/NavTabbar/ViewManager; TABS duplicado;
  a11y de tabs incompleta).

---

## Tarea 1 — README.md ✅ COMPLETADA
- [x] Crear `README.md` (español): intro + URL, features, stack, comandos, estructura,
      modelo de datos (`forja_*` + backup v3 + nota por-origen), deploy, contexto histórico.
- [x] Actualizar este plan.

## Tarea 2 — Merge dev→main + deploy V1 (producción) ✅ COMPLETADA (por el usuario)
> Netlify deploya producción desde `main` (`origin/HEAD → origin/main`). Hoy `main` es el monolito.
- [x] Merge `dev → main` realizado por el usuario (2026-08-03), incluida la resolución
      de los legacy (`index.html sw.js manifest.json icon.svg`) y el deploy de producción.

## Tarea 3 — Optimizaciones Astro (paquete 1 — seguro/barato)
1. [x] **Self-host Google Fonts**: bajar `Anton` + `Space Grotesk` (woff2, OFL) a
      `public/fonts/`, `@font-face` en `global.css`, quitar css2 + 2 preconnects de `Base.astro`.
      → −3 requests, fonts offline, sin terceros. (riesgo bajo)
      - Anton 18,6 KB + Space Grotesk 22,3 KB (latin, mismo binario para 400–700) en `public/fonts/`.
      - Auditoría 3.1: inicialmente RECHAZADA (referencia a Google Fonts en `index.html` raíz,
        artefacto Vite muerto). **Fix**: eliminado `index.html` raíz → cero referencias en el repo.
        `tsc` ✔ · vitest 27/27 ✔ · build OK (19 archivos precache) ✔ · `dist/index.html` limpio ✔.
        Observación pendiente→ subtarea 3.2 (woff2 no está en `globPatterns`).
2. [x] **SW precache**: ampliar `globPatterns` de la integración `pwa()` a `woff2`/`json`
      → fonts y `manifest.json` precacheados (offline en 2ª visita).
      - `globPatterns` ahora `**/*.{js,css,html,svg,ico,webmanifest,png,woff2,json}` → build OK,
        **22 archivos** en precaché (19 previos + 2 woff2 + manifest.json), verificado en `dist/sw.js`.
      - Auditoría 3.2: ✅ APROBADA (precache contiene fonts+manifest, sin `.sw.bundle.js`; tsc ✔ · vitest 27/27 ✔).
3. [x] **Directivas de islas** (`index.astro`): `Timer`/`Toasts`/`FooterBar` → `client:idle`;
      `NavTabbar` → `client:visible`; `ViewManager` → `client:idle`.
      - `TopBar` y `NavTabs` quedan en `client:load` (reloj + tabs visibles al instante).
      - Verificado: `subscribeToasts` re-emite la cola al suscribirse → no se pierden toasts;
        D-lite (data-view) cubre el hueco pre-hidratación de `ViewManager`.
      - Auditoría 3.3: ✅ APROBADA (tsc ✔ · vitest 27/27 ✔ · build OK · chunks 14 sanos; sin flash de
        vista, sin toasts perdidos; bonus: NavTabbar no hidrata en desktop — oculto por CSS).
4. [x] **Refactor P1**: `viewFromHash()` único compartido (hoy en `Base.astro`, `ViewManager`,
      `appStore`); guard SSR en `src/lib/storage.ts`; `TABS` compartido en `src/components/shared/`.
      - Nuevo `src/lib/view.ts` (`viewFromHash`): usado por `ViewManager`; `Base.astro` conserva
        su script pre-paint inline (no puede importar módulos; espejo documentado con comentario).
      - `storage.ts`: guard `typeof window === 'undefined'` en `load`/`saveL`.
      - `TABS` extraído a `src/components/shared/tabs.tsx`; `NavTabs` y `NavTabbar` lo importan.
      - Validado localmente: tsc ✔ · vitest 27/27 ✔ · build OK (23 archivos precache).
      - Auditoría 3.4: ✅ APROBADA (helper sin ciclo runtime, TABS byte-idéntico y compartido en un solo
        chunk, guard SSR ok; tsc ✔ · vitest 27/27 ✔ · build OK).
5. [x] **netlify.toml**: cabeceras de cache (`/_astro/*` immutable, `/sw.js` no-store, `/fonts/*` 1y).
      - Aplicado: `/_astro/*` → `public, max-age=31536000, immutable`; `/sw.js` → `no-cache, private`;
        `/fonts/*` → `public, max-age=31536000, immutable` (Permissions-Policy sigue en `/*`).
      - Auditoría 3.5: ✅ APROBADA (TOML válido, orden de reglas correcto; sin configs contradictorias;
        tsc ✔ · vitest 27/27 ✔ · build OK). Observaciones menores: fonts sin hash + `immutable`
        (riesgo solo si cambia el binario sin renombrar) y `/manifest.json` sin regla propia (no crítico).
6. [x] **Validar**: `tsc` + `vitest` (27/27) + `npm run build` + prueba en dev/preview/Netlify.
      - tsc ✔ · vitest 27/27 ✔ · build OK (23 archivos precache).
      - Smoke test preview: `/`, `/sw.js`, `/manifest.json`, `/fonts/*` → 200; sin referencias a
        googleapis/gstatic en el HTML; CSS compilado referencia `/fonts/anton-latin.woff2`.
      - Auditoría 3.6: ✅ APROBADA (ver informe del auditor). Paquete 1 completo: tsc ✔ · vitest 27/27 ✔ ·
        build OK (23 archivos precache) · preview 200 en `/`, `/manifest.json`, `/sw.js` · 7 islands
        (4 idle / 1 visible / 2 load) · hash-nav íntegra · 0 referencias a terceros.
- Resultado esperado: ~24 → ~15 requests; fonts offline; sin dependencia de Google.
  Medición real de requests pendiente de hacer en deploy (preview local: fonts 100% propias).

## Tarea 3 — cierre
- Commit `acde33c` en `dev` (local): 15 archivos, −4.686 líneas (+168) — incluye la
  eliminación del monolito `index.html` raíz. `preview.log` (ruido local) sin trackear.
- No incluido en el paquete (intencional): swap React→Preact (iniciativa separada).

## Tarea 4 — Paquete 2 (opcional, moderado)
- [ ] `vite.build.rollupOptions.manualChunks` para fusionar ~9 chunks pequeños
      (TopBar/NavTabs/NavTabbar/Timer/Toasts/toast/timerStore/jsx-runtime/react-shim)
      → 14 JS → ~5–6 fetches (−7–9 requests). Riesgo medio: validar build + hidratación de las 7 islas.
- (No incluido por ahora: swap React→Preact, −165 KB; posible iniciativa separada.)

---

## Validación general
- Siempre: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` · `npm run build` (SW con
  `[forja-pwa] sw.js generado con N archivos`).
- Tests esperados: 33 base → **48** al cerrar R1 → **60** al cerrar R2 → **67** al cerrar R3.
- Manual: `npm run dev` (nav, F5, offline en preview), preview Netlify y prueba en Android
  real (390×844) al cerrar cada release.

---

## Tarea 5 — Volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md)
1. [x] T5-1 Lógica: `mondayOf()` + `weeklyVolume` con ventana lun–dom local (32 tests, portables a cualquier huso).
2. [x] T5-2 UI: leyenda "(lun–dom)" + rango "semana del X al Y" (es-AR, post-mount anti-mismatch) — auditoría APROBADA (SSR sin rango; warning hydration = extensión BIS, no del código).
3. [x] T5-3 Docs: PLAN-V1, MIGRACION-ASTRO, README — auditoría APROBADA (sin "ventana 7 días" en contexto actual, UTF-8 válido).
- **Cierre (2026-08-10)**: auditor final APROBADO (6/6 requisitos, 32 tests, tsc + build OK, portabilidad verificada en Asia/Tokyo y UTC-4). Commits `281a361`, `a8c6c55`, `9254030`, `c5621ca`. Plan de implementación: `docs/superpowers/plans/2026-08-10-volumen-semanal-lun-dom.md`.
- **Cierre docs (2026-08-10)**: `ae072c6` (marcado final en PLAN-V1.md).

## Tarea 6 — Rutina: pullover en polea (lunes) + curl inclinado (viernes) (spec: docs/superpowers/specs/2026-08-28-rutina-pullover-curl-inclinado-design.md)
1. [x] T6-1 Rutina: pullover en polea alta (lunes, tras remo antes de face pull) + curl inclinado (viernes) — `570b8ab` — auditoría APROBADA (orden LUN 8, VIE último, laterales intactos, tsc/test/build OK).
- Plan: `docs/superpowers/plans/2026-08-28-rutina-pullover-curl-inclinado.md`.
- **Cierre (2026-08-28)**: auditor final APROBADO (6/6 requisitos, 32 tests, tsc + build SW 23). Commits `570b8ab`, `616fa4b`.

## Tarea 7 — Rutina: series 4 + predicador (lun) + pushdown (mié) (spec: docs/superpowers/specs/2026-08-28-rutina-series-4-y-nuevos-design.md)
1. [x] T7-1 Rutina: 5 series edits (tríceps mié/vie + curls incl. martillo 3) + predicador (lun) + pushdown (mié) — `61bcc8e` — auditoría APROBADA (LUN 9/MIÉ 7, laterales intactos, tsc/test/build OK).
- Plan: `docs/superpowers/plans/2026-08-28-rutina-series-4-y-nuevos.md`.
- **Cierre (2026-08-28)**: auditor final APROBADO (7/7 requisitos, 32 tests, tsc + build SW 23). Commits `61bcc8e`, `c4e6137`.

## Tarea 8 — Rutina: ajuste EZ y overhead a 3 series (spec: docs/superpowers/specs/2026-08-28-rutina-ajuste-ez-overhead-design.md)
1. [x] T8-1 Ajuste: Lun EZ 4→3 + Mié overhead 4→3 — `2b186a0` — brazos 25→23 (bíceps 14→13, tríceps 11→10).
- Plan: `docs/superpowers/plans/2026-08-28-rutina-ajuste-ez-overhead.md`.
- **Cierre (2026-08-28)**: ajuste verificado — tsc 0, 32 tests, build SW 23.

## Tarea 9 — Rutina: separar brazos en bíceps/tríceps (spec: docs/superpowers/specs/2026-08-28-rutina-biceps-triceps-design.md)
1. [x] T9-1 Datos: GROUPS/GCOLORS/SET_GUIDE 8 claves + 7 retags (3 lun biceps, 2 mie triceps, 2 vie) — `ee9c49d` — auditoría APROBADA (35, laterales intactos).
2. [x] T9-2 Lógica: dual-read `brazos→bíceps/tríceps` por nombre + migración al guardar — `7b0db2e`/`616e5c5` — auditoría APROBADA (33 tests, fix imports ordenados, DRY deferred).
- Plan: `docs/superpowers/plans/2026-08-28-rutina-biceps-triceps.md`.
- **Cierre (2026-08-28)**: auditor final APROBADO (9/9 requisitos, 33 tests, tsc + build SW 23). Commits `ee9c49d`, `7b0db2e`, `616e5c5`, `6909dbd`.

---

## Tarea 10 — Modo GYM R1: confiabilidad (spec: docs/superpowers/specs/2026-10-23-modo-gym-design.md)
> Plan: `docs/superpowers/plans/2026-10-23-modo-gym-r1-confiabilidad.md`
> Objetivo: que FORJA no mienta ni se rompa durante el entrenamiento. Cierre esperado: **48 tests**.
1. [x] T10-1 Volumen canónico: `isCompletedSet`/`setVolume`/`completedSets`/`volumeOf`; `commitSession`, stats, historial, semanal, `exerciseSeries` y `stagnant` usan solo series `done`. Cierre: 39 tests. — `584c0d2` — review APROBADA (spec ✅, 5 minors diferidos al cierre R1).
2. [x] T10-2 Fechas: `src/lib/date.ts` (`capFirst`, `formatLongDate`, `formatWeekday`) y eliminar `text-transform: capitalize` de fechas. Cierre: 42 tests. — `0cc3bcb` — review APROBADA (spec ✅, 3 minors diferidos al cierre R1).
3. [x] T10-3 Overlays: toasts arriba (`z-index: 110`, `pointer-events` selectivo), timer abajo; sin solapamiento a 360/390/412 px. — `d2f51c9` + `5bf86e1` — re-review APROBADA (spec ✅, 5/26/26 px de aire medidos; 2 minors diferidos al cierre R1).
4. [x] T10-4 Timer exacto: `endsAt` + `sync()` por timestamp, pausa real, ±15 s, Wake Lock opcional y resync en `visibilitychange`/`pageshow`/`focus`. Cierre: 48 tests. — `81e040a` — review APROBADA (spec ✅, 5 minors diferidos al cierre R1).
5. [x] T10-5 Undo: toasts con acción de 6 s; deshacer serie, ejercicio, sesión, historial y medición; “Limpiar” deja de usar `confirm()`. — `a14151f` — review APROBADA (spec ✅, 16/16 checks funcionales, 3 minors diferidos al cierre R1).
6. [x] T10-6 Targets y tipografía: controles ≥ 44 px, metadatos ≥ 11 px, fila de serie sin overflow a 360 px. — `c4949e6` — re-review APROBADA (targets medidos, 0 overflow, tabular-nums efectivo; 1 minor diferido: inputs de 49 px a 360).
7. [x] T10-7 Iconos PWA: PNG 192/512/180 + maskable con `scripts/generate-icons.mjs`; manifest y `apple-touch-icon` actualizados; iconos en precaché. — `c3c67eb` — review APROBADA (4 PNG verificados, SW 28 archivos; 1 minor diferido: la franja decorativa del maskable se recorta en las esquinas de la zona segura circular).
8. [x] T10-8 Docs y cierre R1: URL `https://forjavalera.netlify.app/` en README y `astro.config.mjs`, decisión de volumen en `MIGRACION-ASTRO.md`, validación completa y auditoría final. — cierre documental; auditoría final APROBADA.
- **Cierre R1 (2026-10-24)**: auditoría final APROBADA (48 tests, tsc + build OK, timer
  verificado tras salto de 3 min, 0 solapamientos, targets ≥44 px, iconos PNG en precache
  con 28 archivos).
- **Criterio de cierre R1**: 48 tests · tsc limpio · build con SW · timer correcto tras 3 min con pantalla bloqueada · 0 solapamientos · undo en las cuatro acciones destructivas · controles ≥ 44 px · iconos PNG en `dist` · auditoría final APROBADA.

## Tarea 11 — Modo GYM R2: sesión-first (spec: docs/superpowers/specs/2026-10-23-modo-gym-design.md)
> Plan: `docs/superpowers/plans/2026-10-23-modo-gym-r2-sesion-first.md`
> Objetivo: abrir la app y estar registrando, sin scroll y con una mano. Cierre esperado: **60 tests**.
1. [x] T11-1 Cuatro vistas: `registrar | plan | cuerpo | progreso`, `Registrar` home, `#hierro` alias, `Base.astro` y `viewFromHash` alineados, 4 vistas montadas. Cierre: 51 tests. — `95fa27d` — review APROBADA (spec ✅, 4 minors corregidos: alias con prototipos, `CSSProperties`, reporte).
2. [x] T11-2 Inicio de sesión + header sticky: `forja_session_start`, `startSession()`, `formatElapsed`/`sessionSummary`/`nextPending`, `useSaveSession` compartido, header con series/volumen/tiempo/Guardar. Cierre: 56 tests. — `881ceab` — review APROBADA (spec ✅, 3 minors corregidos: `sessionStart` huérfano, intervalo sin sesión, reporte; #418 preexistente diferido).
3. [x] T11-3 Composer plegado: ejercicios primero, `<details>` al final, autocompletado de rutina + historial, metadata (grupo/reps/rest/nota). Cierre: 58 tests. — `ff4cc54` — review APROBADA (spec ✅, 5 minors: 4 corregidos — grupo manual, `useMemo`, cierre por teclado, `aria-label` del select; 2 diferidos — combobox completo y límite 6 con historial largo).
4. [x] T11-4 Fila de serie v2: estado activo, ±1 rep, ±2,5 kg, repetir, “La vez pasada”, auto-scroll a la siguiente pendiente y cadena Enter. — `4893438` — review APROBADA (spec ✅, 7 minors: 3 corregidos — `role="group"` con contexto, foco→scroll, CSS muerto; 4 diferidos — `repeatSet` parcial, `NaN` histórico, retroceso del auto-avance y Enter con campos vacíos).
5. [x] T11-5 Timer manual: presets 60/90/120/180, overlay con anillo, siguiente serie y descanso por defecto de 90 s para ejercicios manuales. — `b25ccd4` — review APROBADA (spec ✅, 4 minors diferidos — header de dos filas en mobile, accesibilidad del panel, `NaN` con kg histórico no numérico y `min-width` bajo 250 px; SW 27 verificado: manifest completo, sin assets faltantes).
6. [x] T11-6 Fin de semana + ConfirmSheet: banner “Hoy no toca bloque · te preparo el lunes”, cargar lunes o repetir último día, `Cargar día` navega a Registrar con undo, sin `window.confirm`. Cierre: 60 tests. — `19f4c3f` — review Needs fixes → corregido: el backdrop quedaba atrapado en el stacking context del footer y no tapaba header/tabbar/toasts; ahora `ConfirmSheet` usa portal a `document.body`, con focus trap, scroll lock y foco restaurado. 60 tests, SW 28 con manifest completo. Diferidos: heurística de sesiones parciales, tests superficiales, banner bajo el fold a 360, `today` fijo al montar y undo que convive con un guardado.
7. [x] T11-7 Docs y cierre R2: README/MIGRACION/PLAN, validación completa y auditor final. — `49dfe32` — review APROBADA (spec ✅, 4 minors corregidos: “3 paneles” → cuatro vistas, `forja_session_start` en el modelo de datos, lista de `shared/` completa y reporte ampliado). 60 tests, `tsc` check limpio y SW 28 con manifest completo. — `a0ecc59` — auditor final **APROBADO**.
- **Cierre R2 (2026-10-23)**: auditor final APROBADO (60 tests, `tsc` + build OK, SW 28 con manifest completo, primera serie sin scroll a 390×844, flujo de 3 series en 2,25 s, 4 pestañas + alias, Guardar visible, timer manual y `ConfirmSheet` sin `window.confirm`). Minor abierto diferido: “La vez pasada” y la precarga muestran `0×0` en series vacías de sesiones parciales guardadas.
- **Criterio de cierre R2**: 60 tests · primera serie visible sin scroll a 390×844 · ≤ 8 s por serie con una mano · 4 pestañas + alias · Guardar siempre visible · timer manual · `ConfirmSheet` sin `window.confirm` · auditor final APROBADO.

## Tarea 12 — Modo GYM R3: RIR y volumen en vivo (spec: docs/superpowers/specs/2026-10-23-modo-gym-design.md)
> Plan: `docs/superpowers/plans/2026-10-23-modo-gym-r3-rir-volumen.md`
> Objetivo: que la inteligencia de FORJA se vea en la fila. Cierre esperado: **67 tests**.
1. [x] T12-1 RIR opcional: `SetData.rir?: number | null`, `setSetRir`, chips 44 px en el set activo, badge en fila e historial, conservado en respaldo v3. — `46dd760` — review APROBADA (spec ✅, 0 Critical, 0 Important, 3 minors del reporte corregidos). 61 tests, `tsc` check limpio, SW 28.
2. [x] T12-2 Sugerencias por RIR: todas al tope + RIR 0 → mantener; al tope + RIR ≤ 2 → subir; en rango + RIR ≥ 3 → subir; bajo mínimo → bajar; sin RIR o RIR parcial → fallback actual. Cierre: 67 tests. — `98ae354` — review APROBADA (spec ✅, 0 Critical, 0 Important, 0 minors de código). 67 tests, `tsc` check limpio, SW 28.
3. [x] T12-3 Semáforo de volumen en vivo: `VolumePulse` reutiliza `weeklyVolume` con la sesión en curso, `role="meter"`, sin duplicar sesiones guardadas. — `44999d3` — review APROBADA (spec ✅, 0 Critical, 0 Important, 2 minors: glifo corregido y duplicación teórica documentada). 67 tests, `tsc` check limpio, SW 28, smoke 33/33.
4. [x] T12-4 Progreso honesto + docs y cierre R3: “series completadas”, vacío distinto de “sin historial”, README/MIGRACION/PLAN, validación completa y auditor final. — `3ee302c` — review APROBADA (spec ✅, 0 Critical, 0 Important, 1 minor preexistente: cardio fuera de `SET_GUIDE`). 67 tests, `tsc` check limpio, SW 28, smoke 63/63. — `58e1eb5` — auditor final **APROBADO CON OBSERVACIONES** (9/9 criterios, 0 Critical, 0 Important, 2 minors documentales corregidos en el cierre).
- **Criterio de cierre R3**: 67 tests · RIR opcional visible y conservado · seis reglas de sugerencia testeadas · respaldo con RIR testeado · semáforo con `weeklyVolume` · Progreso sin “series efectivas” · auditor final APROBADO.
- **Cierre R3 (2026-10-23)**: auditor final APROBADO CON OBSERVACIONES (67 tests, `tsc` check limpio, build OK con SW 28 y manifest completo; RIR opcional visible en fila e historial y conservado en respaldo v3; seis reglas de sugerencia testeadas; semáforo en vivo con `weeklyVolume` sin duplicar volumen; Progreso sin “series efectivas” y con vacío honesto; primera serie visible sin scroll a 360/390/412). Minor abierto diferido: `totalSets` no cuenta cardio y `exerciseSeries` omite kg=0, limitaciones preexistentes fuera de alcance.
