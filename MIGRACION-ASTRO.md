# FORJA — Migración de monolito a Astro + React (islas)

Documento de **contexto persistente**: cualquier sesión nueva debe leerlo antes de
tocar el código para retomar el trabajo sin perder el hilo.

## Estado
- Fecha: 2026-08-03
- Estado: **Fases 0–4 COMPLETAS** · Fase 5 (paridad + fixes) **validada en dev** · pendiente: deploy Netlify + respaldo/re-import de datos
- Rama de trabajo: `main` (monolito) · rama de migración: `feat/migrar-astro` (árbol sin commitear aún)
- Verificaciones actuales: tsc ✅ · vitest 27/27 ✅ · `npm run build` ✅ (SW `dist/sw.js` con precache inyectado, 19 archivos)
- Fixes aplicados en dev y validados: nav tras F5 (sin residuo), acordeón Historial,
  reloj TopBar (sin hydration-mismatch), SW dev (sin registro/errores `chrome-extension`),
  parpadeo de Hierro al F5 (D-lite: `data-view` pre-paint). Servers de dev cerrados.

## 1. Contexto del proyecto
FORJA es una PWA de seguimiento de entrenamiento de fuerza (en español, voseo),
**offline-first, 100% client-side**: no hay backend, ni cuentas, ni red. Todo el
estado vive en `localStorage`. No tiene build, dependencias ni framework.

- Repo: `https://github.com/luisparedes29/forjavalera.git` (ramas `main` y `dev`; la migración vive en `feat/migrar-astro`)
- Stack actual: un solo `index.html` (~4.578 líneas = CSS + HTML + JS vanilla)
- Archivos: `index.html` · `sw.js` · `manifest.json` · `icon.svg`
- Node v24.14.1 / npm 11.3.0 · SO: Windows (PowerShell)

### Funcionalidad actual (3 vistas con navegación por hash)
1. **Hierro**: stats, rutina/bloque 5 días (L–V), semanas 1–6, DELOAD, detección
   de estancamiento, sesión actual (autoguardado, check de series que dispara
   temporizador, sugerencias ▲/▼/✓), historial colapsable.
2. **Cuerpo**: registro antropométrico (peso, altura, 9 medidas), deltas,
   gráfico de peso en SVG dibujado a mano, acordeón de registros.
3. **Progreso**: volumen semanal por grupo vs. rango recomendado (`SET_GUIDE`),
   progresión por ejercicio (kg / e1RM Epley / volumen) con PR, última, delta.

PWA: `manifest.json` + `sw.js` (stale-while-revalidate, caché del shell y fonts).

## 2. Decisiones tomadas (no reabrir sin motivo)
- **Framework**: Astro (`output: 'static'`) + **islas React** (`client:load`).
  - JavaScript: el usuario domina React; no Next (overkill: sin SEO ni servidor).
  - Astro aporta: build de Vite, ship estático, y que header/tabs/footer no
    gasten JS (solo los 3 paneles interactivos son islas).
- **Estado entre islas**: **Zustand** (store externo) — las islas React de Astro
  NO comparten Context; cada una hidrata su propio árbol. El store global debe
  ser externo y suscribir a las islas.
- **Persistencia**: seguir con `localStorage`, conservando **las mismas keys
  `forja_session/_history/_body/_week`** y el formato de respaldo **v3**.
- **Deploy**: Netlify (build `npm run build`, publish `dist`). Vercel auto-det.
- **Backend futuro**: "quizá" (sync/nube). Por eso la capa de datos
  (`src/lib/storage.ts`) queda AISLADA para poder sustituirse luego.
- **CSS**: mover el bloque `<style>` actual a `src/styles/global.css` tal cual →
  máxima paridad visual desde el día 1.

## 3. Arquitectura del monolito (referencia de donde vive cada cosa)
Todo el código vive en `index.html`:
- `<style>...</style>` líneas 29–~2299 (CSS completo)
- HTML de las 3 vistas: líneas ~2379–2696
- `<script>` (JS de la app): líneas 2798–4576

### Mapa de funciones → destino
| Símbolo/función | Línea aprox. | Destino propuesto |
|---|---|---|
| `$`, `$$`, `uid`, `esc`, `load/saveL`, `fmtN` | 2799–2829 | `src/lib/` utilidades |
| `LS` (keys), `GROUPS`, `GCOLORS`, `SET_GUIDE`, `MEASURES` | 2831–2878 | `src/data/` |
| `ROUTINE` | 2881–3188 | `src/data/routine.ts` |
| `normName`, `repRange`, `suggestFor`, `lastSets`, `stagnant`, `parseRest` | 3224–3289 | `src/lib/logic.ts` |
| `setNum` (con animación) | 3309–3326 | `src/components/shared/AnimatedNumber.tsx` |
| `Timer`, `beep`, WebAudio, vibrate | 3394–3500 | `src/lib/audio.ts` + `components/Timer.tsx` |
| `activeSets`, `refreshStall`, `renderRoutine` | 3503–3595 | `src/components/hierro/Rutina.tsx` |
| `buildOne`, `renderExercises`, `exCardHTML`, `setRowHTML` | 3597–3732 | `src/components/hierro/Sesion.tsx` |
| `saveSession/clearSession/copySession` | 3843–3942 | `src/lib/session.ts` |
| `renderHistory` | 3945–3988 | `src/components/hierro/Historial.tsx` |
| `saveBody`, `lastDelta`, `renderDeltas`, `renderChart` | 3995–4123 | `src/components/cuerpo/*` |
| `renderBody` | 4124–4195 | `src/components/cuerpo/BodyList.tsx` |
| `weeklyVolume`, `exerciseSeries` (e1RM), `updateProgreso*` | 4207–4279 | `src/lib/logic.ts` |
| `renderVolume` | 4280–4325 | `src/components/progreso/Volumen.tsx` |
| `renderProgSelect`, `renderProgChart` | 4326–4445 | `src/components/progreso/Progresion.tsx` |
| export/import respaldo, wipe | 4447–4531 | `src/lib/backup.ts` |
| `toast` | 4506–4518 | `src/lib/toast.ts` + `Toasts.tsx` |
| PWA install + SW register | 4543–4560 | `src/sw.ts` + integración `pwa()` (workbox injectManifest) en `astro.config.mjs` |
| `renderAll`, IntersectionObserver | 4532–4575 | init en `src/pages/index.astro` |

## 4. Modelo de datos (NO cambiar las keys)
- `forja_session` → sesión en curso (`state.exercises`)
- `forja_history` → sesiones guardadas (`{ id, ts, volume, focus, exercises[] }`)
- `forja_body` → registros antropométricos (`{ id, ts, peso, altura, m{} }`)
- `forja_week` → `{ week: 1..6, deload: bool }`

Backup v3 (export): `{ app:'FORJA', version:3, week, session, history, body }`.
Importante preservar el formato byte a byte (compatibilidad con respaldos viejos).

## 5. Plan de migración por fases

### Fase 0 — Scaffold e infraestructura
1. Rama: `git checkout -b feat/migrar-astro` (NO borrar `main` = referencia). ✅
2. `npm create astro@latest` template minimal + TypeScript; add `@astrojs/react`.
3. Instalar `zustand`, `vite-plugin-pwa`, `vitest`, `eslint`, `typescript`.
4. `astro.config`: `output:'static'`, `site`, `integrations:[react()]`, `vite.plugins:[VitePWA(...)]`.
5. Copiar `manifest.json` + `icon.svg` a `public/`.
6. Mover el CSS actual a `src/styles/global.css` y cargarlo desde un `Layout`/página.

### Fase 1 — Extraer y testear la lógica pura
- Trasladar tal cual a `src/lib/*` y `src/data/routine.ts` (ver tabla §3). Son
  funciones puras → no reescribir, solo trasladar.
- Escribir **Vitest** con casos dorados:
  - `suggestFor`: up / down / ok según rangos de reps.
  - `parseRest`: `"2 min"`, `"60–90 s"`, `"2.5-3 min"`.
  - `stagnant`: 3 sesiones sin mejora.
  - `exerciseSeries` e1RM (Epley) y `weeklyVolume` (ventana 7 días).
- Correr `npx vitest run` y dejar verde.

### Fase 2 — Store global (Zustand) + persistencia
- `src/store/appStore.ts`: estado `{ exercises, history, body, weekState, view }`.
- Storage con listeners personalizados que escriban/lean las keys `forja_*`
  manteniendo el formato exacto (mismo `JSON.stringify` que hoy).
- `view` controlada por la URL hash (`#hierro/#cuerpo/#progreso`).

### Fase 3 — Componentes React (islas) ✅
- `src/pages/index.astro`: shell estático (tape, header, footer) + **islas `client:load`**:
  `TopBar`, `NavTabs`, `ViewManager`, `FooterBar`, `NavTabbar`, `Timer`, `Toasts`.
- **Decisión final (§6 resuelta)**: **1 isla de vistas** (`ViewManager.tsx`) que renderiza
  los 3 `.view` con clase `active` según `store.view` (usa `useReveal` para los `.reveal`).
  Nav superior/inferior en islas separadas. Resultado: visualmente idéntico al monolito.
- `src/components/hierro/`: `Rutina.tsx`, `Sesion.tsx`, `Historial.tsx`, `HierroView.tsx` (stats+composición).
- `src/components/cuerpo/`: `CuerpoView.tsx` (Registro + Evolución + Deltas + BodyList consolidados) + `shared/ChartLine.tsx`.
- `src/components/progreso/`: `ProgresoView.tsx` (Volumen + Progresión consolidados).
- `src/components/shared/`: `Timer.tsx`, `Toasts.tsx`, `AnimatedNumber.tsx`, `TopBar.tsx`, `FooterBar.tsx`.
- `src/components/ViewManager.tsx` + `src/hooks/useReveal.ts` + `src/store/routineStore.ts` (`dayIdx` compartido Rutina/Sesion).
- Al cambiarse el store (Zustand global), todas las islas se actualizan: no hay render manual.
- Detalle: `local.forja_session` persiste por cada tecla (`saveL`); `commitSession` réplica el guard de sesión.

### Fase 4 — PWA y deploy — ✅ (decisión: injectManifest propio, sin plugin)
Checkpoint: `@vite-pwa/astro@1.2.0` exige `astro ^1–^5` (NO soporta Astro 7) y `vite-plugin-pwa`
no se ejecuta en el pipeline de Astro 7 (Vite 8/Rolldown). **Solución adoptada**:
- `src/sw.ts`: SW propio con Workbox (`precacheAndRoute(self.__WB_MANIFEST)`,
  `cleanupOutdatedCaches`, network-first para navegación c/fallback offline,
  stale-while-revalidate para assets).
- `astro.config.mjs`: integración `pwa()` → hook `astro:build:done` que bundlea `sw.ts`
  con **esbuild** y luego **`workbox-build.injectManifest`** (el mismo motor del modo
  injectManifest del plugin) inyecta el precache de `dist/` (glob js/css/html/svg/png).
  Emite `dist/sw.js` con los assets hasheados precacheados (≈19) y borra el bundle temp.
- `index.astro`: `<script is:inline>` registra `/sw.js` en `load`.
- `public/manifest.json` + `icon.svg` intactos (el plugin NO genera manifest: `manifest:false` era solo del experimento, ahora no se usa el plugin).

### Fase 5 — Verificación y paridad
- Checklist manual de paridad vs `main`: stats, sugerencias, deload, deltas,
  gráficos, respaldo v3.
- `npx vitest` + `npm run build` verdes.
- `localStorage` es por origen: si el dominio cambia → avisar al usuario que
  **exporte respaldo** en la app vieja y lo **reimporte** tras el deploy.

### Fase 5 (fixes de la prueba visual)
- **Acordeón Historial**: `Historial.tsx` renderizaba `.hist-body` solo si `open` y sin la
  clase `.open` en `.hist-item` → `max-height`/chevron nunca animaban. Fix: `.hist-body`
  montado siempre + `className="hist-item open"` condicional.
- **Nav tras F5/residuo**: diagnostico por consola (`[dbg] store.view` + warning de React)
  reveló la causa exacta: **hydration-mismatch**. El SSR (build-time, sin hash) escribía
  `class="tab active"` en Hierro; el cliente hidrataba con `view` del hash (p. ej. `progreso`)
  → React 19 **no parchea atributos que difieren del SSR** → el `active` de Hierro quedaba
  huérfano en el DOM aunque el store estuviera bien. Los intentos previos
  (`setViewFromHash` en mount) fallaban porque el mismatch ya había ocurrido en el primer render.
  **Fix aplicado**:
  - `initialView()` retorna siempre `hierro` → **SSR y primer render del cliente idénticos**
    → sin hydration-mismatch.
  - `ViewManager` aplica la URL en un `useEffect` de mount (`fromHash`) + listener `hashchange`
    (además soporta back/forward) → re-render normal que React sí actualiza.
  - `class=` → `className=` en `TopBar`, `NavTabs`, `NavTabbar`, `FooterBar` (React dev no
    reconoce `class`; riesgo de perder estilos; `.astro`/`.html` siguen usando `class`).
  - **TopBar (reloj)**: `useState(() => new Date())` causaba hydration-mismatch (SSR vs
    cliente). Fix: estado inicial `null` + `setNow(new Date())` en `useEffect` de mount.
  - **SW en dev**: registro de `/sw.js` solo con `import.meta.env.PROD` (script procesado,
    no `is:inline`); en dev hace `getRegistrations().unregister()` para limpiar SW viejos
    del origen (provenientes de preview). `sw.ts`: rutas guardadas con `url.startsWith('http')`
    + `sameOrigin` + try/catch (evita `cache.put` de URLs `chrome-extension://`).
  - `<meta name="mobile-web-app-capable">` agregado junto al de Apple.
  - **Parpadeo de Hierro al F5 (Opción D-lite)**: el SSR no conoce el hash → renderiza el
    default (`hierro`) y el cambio post-hidratación se ve un frame. Fix: `<script is:inline>`
    en `Base.astro` (lee el hash y setea `document.documentElement.dataset.view` antes del
    primer paint) + CSS `.view` gobernado por `:root[data-view]` (con fallback
    `:root:not([data-view]) #view-hierro` para no-JS/sin hash). La visibilidad de las vistas
    pasa del class `active` de React al atributo `data-view`; el sync vive **dentro de
    `setView`** (único punto de control por donde pasa todo cambio de vista) → invariante
    sin drift. Las clases de React se mantienen (ARIA/semántica); flash eliminado en dev y prod.
- Validación: `tsc` 0 err, `vitest` 27/27, `npm run build` verde (sw.js con 19 archivos).

## 6. Riesgos y decisiones abiertas
- Islas React con Zustand: los wraps de estado son el único punto delicado → se
  mitiga teniendo un único store como fuente de verdad. ✅ resuelto.
- Regresión de comportamiento: mitigada con Vitest + `main` de referencia.
- Bundle: React (~40–50 kb gzip); asumible para una app instalable.
- Mantener `aria-*` y roles de accesibilidad actuales. ✅ (los components replican los atributos del monolito).
- **Resuelto (Fase 3)**: vista por isla (3 islas) vs 1 app → **1 isla `ViewManager`**
  que monta los 3 `.view` con toggle de clase `active`; Nav (top/móvil) en islas propias.
- **Resuelto (Fase 4)**: PWA sin `vite-plugin-pwa` (incompatible con Astro 7) → integración
  propia `pwa()` con esbuild + `workbox-build.injectManifest` (= modo injectManifest del plugin).
- **Siguiente paso**: commit inicial de la migración en `feat/migrar-astro`, deploy Netlify
  y respaldo/re-import de datos (ver check-list).

## 7. Check-list de la primera sesión (orden de ejecución)
1. [x] Guardar este documento en el repo.
2. [x] `git checkout -b feat/migrar-astro`
3. [x] Fase 0: scaffold + integración React + PWA + CSS global.
4. [x] Fase 1: extraer `lib/logic` + `data/routine` + Vitest verde (27 tests).
5. [x] Fase 2: store Zustand + persistencia `forja_*` (appStore, backup, toast, audio) + typecheck tsc.
6. [x] Fase 3: componentes por vista (React TSX) + ensamblado index.astro (7 islas). tsc ✅.
7. [x] Fase 4: PWA propio (sw.ts + workbox injectManifest en `astro:build:done`) + 19 archivos precacheados.
8. [x] Fase 5: paridad + fixes validados en dev (nav F5, acordeón Historial, reloj TopBar,
     SW limpieza en dev, parpadeo D-lite).
9. [ ] Commit inicial de la migración en `feat/migrar-astro` (todo el árbol está untracked).
10. [ ] Deploy Netlify (preview/prod) + verificación online/offline + instalación PWA.
11. [ ] Respaldo de datos manual del usuario: en la app vieja **Exportar respaldo** y
     **Importar** en la nueva (`localStorage` es por origen).

## 7. Comandos útiles
- Dev: `npm run dev` (Astro)
- Tests: `npx vitest`
- Build: `npm run build` → `dist/`
- Preview: `npm run preview`
- Lint: `npx eslint`
- (Windows / PowerShell: no usar `&&`; encadenar con `;` o `if ($?)`.)