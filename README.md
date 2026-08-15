# FORJA · Cuaderno de Entrenamiento

PWA **offline-first** de seguimiento de entrenamiento de fuerza, en español. Sin backend,
sin cuentas, sin red: tus datos viven **solo en este navegador** (`localStorage`).

**URL:** https://forja.netlify.app

## Funcionalidades

3 vistas con navegación por hash (`#hierro`, `#cuerpo`, `#progreso`):

- **Hierro** — Rutina de 5 días (lun–vie) con semanas 1–6 y DELOAD; sesión actual con
  autoguardado, prefill de la última sesión y sugerencias ▲/▼/✓; detección de
  estancamiento; historial colapsable.
- **Cuerpo** — Registro antropométrico (peso, altura y 9 medidas), deltas y gráfico de
  peso dibujado en SVG.
- **Progreso** —Volumen semanal por grupo muscular vs. rango recomendado (`SET_GUIDE`) — ventana: semana lun–dom y
  progresión por ejercicio (kg / e1RM Epley / volumen) con PR y deltas.

Además: **instalable (PWA)** y funciona **sin conexión** (Service Worker con Workbox,
fuentes Anton + Space Grotesk self-hosted, sin Google Fonts), con **respaldo export/import**
(formato v3).

## Stack

- [Astro 7](https://astro.build) (`output: 'static'`) + **React 19** (islas)
- **Zustand** como store global compartido entre islas
- TypeScript, Vite, Vitest
- **Workbox** vía integración `pwa()` propia en `astro.config.mjs` (esbuild +
  `workbox-build` `injectManifest`, incompatibilidad de `vite-plugin-pwa` con Astro 7)
- Node ≥ 22.12

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm install` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo (Astro) |
| `npm run build` | Build estático → `dist/` |
| `npm run preview` | Previsualizar el build |
| `npm test` | Tests con Vitest (27 casos) |

## Estructura

```
src/
  pages/index.astro      # shell estático + 7 islas React (client:*)
  layouts/Base.astro     # layout, metas, fuentes, script de vista pre-paint
  components/
    hierro/  cuerpo/  progreso/  shared/   # vistas y componentes
  store/appStore.ts      # estado global (Zustand)
  lib/                   # logic, view, storage, backup, types, toast, audio
  data/routine.ts        # rutina, grupos musculares, SET_GUIDE
  sw.ts                  # service worker (workbox precache + runtime)
  styles/global.css
public/                  # manifest, iconos, favicons, fonts/ (self-hosted)
```

## Modelo de datos

Todo el estado se persiste en `localStorage` (`src/lib/storage.ts`):

| Clave | Contenido |
| --- | --- |
| `forja_session` | Ejercicios y series de la sesión actual |
| `forja_history` | Historial de sesiones completadas |
| `forja_body` | Registros antropométricos |
| `forja_week` | Semana actual y estado DELOAD |

El respaldo exportado usa el formato **v3**:
`{ app: 'FORJA', version: 3, exportedAt, week, session, history, body }`.

> ⚠️ `localStorage` es **por origen**: si cambia el dominio, **exportá un respaldo** en la
> app anterior e **importalo** en la nueva para no perder datos. Si ya usás la app en el
> teléfono, hacé un respaldo v3 **antes** de una actualización que cambie la URL.

## Deploy

- **Netlify**: build `npm run build`, publica `dist/`, rama de producción `main`
  (config en `netlify.toml`, con `Permissions-Policy` y cabeceras de cache).
- El Service Worker se registra solo en producción; en desarrollo se limpian registros viejos.

## Contexto histórico

FORJA empezó como un monolito vanilla (`index.html` ~4.578 líneas). La migración a
Astro + React (acciones, decisiones y check-list) está documentada en
[`MIGRACION-ASTRO.md`](./MIGRACION-ASTRO.md), y el plan de V1 en [`PLAN-V1.md`](./PLAN-V1.md).