# PLAN V1 — README · merge dev→main · optimizaciones Astro

> Documento de **contexto persistente** para la V1. Cualquier sesión nueva debe leerlo
> antes de tocar el código. Complementa a `MIGRACION-ASTRO.md` (migración monolito→Astro).

## Estado
- Fecha: 2026-08-03 · Última actualización: tras Tarea 3 (paquete 1).
- **Hecho**: Tareas 1 (README), 2 (merge dev→main, por el usuario) y 3 (optimizaciones,
  commiteada en `dev` local `acde33c`, **push pendiente**).
- **En curso**: Tarea 5 — volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md).
- **Pendiente**: push de `dev` → merge a `main` (lo hace el usuario) → deploy producción +
  verificación en el teléfono; **respaldo v3 antes del deploy** (el usuario SÍ tiene datos
  de la semana pasada en el teléfono, en la URL vieja); Tarea 4 opcional.
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
- Siempre: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (27/27) · `npm run build` (SW ~23 archivos).
- Manual: `npm run dev` (nav, F5, offline en preview) y preview Netlify.

---

## Tarea 5 — Volumen semanal lun–dom (spec: docs/superpowers/specs/2026-08-10-volumen-semanal-lun-dom-design.md)
1. [x] T5-1 Lógica: `mondayOf()` + `weeklyVolume` con ventana lun–dom local (32 tests, portables a cualquier huso).
2. [x] T5-2 UI: leyenda "(lun–dom)" + rango "semana del X al Y" (es-AR, post-mount anti-mismatch) — auditoría APROBADA (SSR sin rango; warning hydration = extensión BIS, no del código).
3. [x] T5-3 Docs: PLAN-V1, MIGRACION-ASTRO, README — auditoría APROBADA (sin "ventana 7 días" en contexto actual, UTF-8 válido).
- **Cierre (2026-08-10)**: auditor final APROBADO (6/6 requisitos, 32 tests, tsc + build OK, portabilidad verificada en Asia/Tokyo y UTC-4). Commits `281a361`, `a8c6c55`, `9254030`, `c5621ca`. Plan de implementación: `docs/superpowers/plans/2026-08-10-volumen-semanal-lun-dom.md`.
