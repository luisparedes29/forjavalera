# PLAN V1 — README · merge dev→main · optimizaciones Astro

> Documento de **contexto persistente** para la V1. Cualquier sesión nueva debe leerlo
> antes de tocar el código. Complementa a `MIGRACION-ASTRO.md` (migración monolito→Astro).

## Estado
- Fecha: 2026-08-03 · Última actualización: tras Tarea 1 (README).
- **Punto de corte acordado**: se ejecutó la Tarea 1 (README) y se actualiza el plan.
  **Quedan Tareas 2–4 pendientes de confirmación del usuario** ("seguimos o no").

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

## Tarea 2 — Merge dev→main + deploy V1 (producción)
> Netlify deploya producción desde `main` (`origin/HEAD → origin/main`). Hoy `main` es el monolito.
1. [ ] Commitear pendientes (`MIGRACION-ASTRO.md`, `PLAN-V1.md`, `README.md`) + `git fetch`.
2. [ ] Decidir vía: **PR GitHub** (recomendado) vs merge local.
3. [ ] Resolver los 4 conflictos **borrando** los legacy (`index.html sw.js manifest.json icon.svg`)
      del resultado del merge (y opcional: borrarlos también de `dev` para converger).
4. [ ] Merge a `main` → Netlify (prod) rebuild automático (`command`+`publish` ya configurados).
5. [ ] Verificar `https://forja.netlify.app`: PWA, offline, instalación, sin legacy.

## Tarea 3 — Optimizaciones Astro (paquete 1 — seguro/barato)
1. [ ] **Self-host Google Fonts**: bajar `Anton` + `Space Grotesk` (woff2, OFL) a
      `public/fonts/`, `@font-face` en `global.css`, quitar css2 + 2 preconnects de `Base.astro`.
      → −3 requests, fonts offline, sin terceros. (riesgo bajo)
2. [ ] **SW precache**: ampliar `globPatterns` de la integración `pwa()` a `woff2`/`json`
      → fonts y `manifest.json` precacheados (offline en 2ª visita).
3. [ ] **Directivas de islas** (`index.astro`): `Timer`/`Toasts`/`FooterBar` → `client:idle`;
      `NavTabbar` → `client:visible`; `ViewManager` → `client:idle`.
4. [ ] **Refactor P1**: `viewFromHash()` único compartido (hoy en `Base.astro`, `ViewManager`,
      `appStore`); guard SSR en `src/lib/storage.ts`; `TABS` compartido en `src/components/shared/`.
5. [ ] **netlify.toml**: cabeceras de cache (`/_astro/*` immutable, `/sw.js` no-store, `/fonts/*` 1y).
6. [ ] **Validar**: `tsc` + `vitest` (27/27) + `npm run build` + prueba en dev/preview/Netlify.
- Resultado esperado: ~24 → ~15 requests; fonts offline; sin dependencia de Google.

## Tarea 4 — Paquete 2 (opcional, moderado)
- [ ] `vite.build.rollupOptions.manualChunks` para fusionar ~9 chunks pequeños
      (TopBar/NavTabs/NavTabbar/Timer/Toasts/toast/timerStore/jsx-runtime/react-shim)
      → 14 JS → ~5–6 fetches (−7–9 requests). Riesgo medio: validar build + hidratación de las 7 islas.
- (No incluido por ahora: swap React→Preact, −165 KB; posible iniciativa separada.)

---

## Validación general
- Siempre: `npx tsc --noEmit -p tsconfig.check.json` · `npm test` (27/27) · `npm run build` (SW 19+ archivos).
- Manual: `npm run dev` (nav, F5, offline en preview) y preview Netlify.
