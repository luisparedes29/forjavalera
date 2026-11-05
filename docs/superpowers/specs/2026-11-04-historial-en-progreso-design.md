# Diseño — Historial dentro de Progreso y renderizado liviano

- Fecha: 2026-11-04
- Estado: aprobado por el usuario (4 pestañas; Historial como sub-vista de Progreso)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`
- Alcance: **bloque 2**, después de la Tarea 14.

## 1. Problema

Hoy `RegistrarView` renderiza el historial debajo de la sesión en curso:

```tsx
<SessionHeader />
<VolumePulse />
<Sesion />
<section className="panel reveal d2">…Historial…</section>
```

Eso mezcla dos tareas en la misma vista: registrar la serie de hoy y consultar sesiones viejas. En el teléfono, el historial aparece después de un scroll largo y compite con la sesión.

Además, `Historial` renderiza **todos** los `.hist-body` aunque estén cerrados; el CSS solo los colapsa con `max-height`. Con 200 sesiones, el historial colapsado explica el **76% del heap** y el **84% de los nodos** (Tarea 13):

| Escenario (200 sesiones) | Heap JS | Nodos DOM |
|---|---:|---:|
| `#registrar` actual | 15,5 MB | 53.301 |
| Solo historial liviano | 3,7 MB | 8.364 |
| `#progreso` actual | 26,7 MB | 86.266 |

### 1.1 Por qué no una quinta pestaña

El tabbar móvil es `grid-template-columns: repeat(4, 1fr)`. A 320 px cada pestaña mide 80 px; con 5 bajaría a 64 px. “Registrar” e “Historial” tienen 9 letras y hoy usan 10 px con `letter-spacing: 0.14em`: no entran en 64 px. A 360 px (Samsung A32) quedarían en 72 px, casi sin aire. Habría que abreviar etiquetas, bajar la tipografía o pasar a iconos, y se degradaría la navegación principal.

`ViewManager` además monta las 4 vistas siempre. Una quinta vista se montaría en todas las pestañas, salvo que se refactorice el montaje. El historial no justifica ese costo.

## 2. Objetivo

1. Mantener **4 pestañas** y el tabbar móvil actual.
2. Mover el historial a **Progreso**, con un control segmentado `Resumen | Historial`.
3. `Registrar` queda solo con la sesión en curso.
4. Montar `Historial` **solo** cuando la sub-vista Historial está activa.
5. Renderizar el cuerpo de cada sesión **solo** cuando el ítem está abierto.
6. Conservar `#historial` como deep link y que Atrás/Adelante funcionen.
7. No cambiar datos, store de entrenamiento, `localStorage`, respaldo v3 ni timer.

## 3. Decisiones del usuario

- El historial va **dentro de Progreso**, no en una quinta pestaña.
- `#historial` sigue siendo una URL válida.
- Los 4 stats semanales (`series completadas`, `grupos en rango`, `ejercicios`, `kg esta semana`) se muestran solo en Resumen: son un resumen de la semana y no deben acompañar la consulta de sesiones viejas.
- El historial ocupa el ancho completo en escritorio.
- La apertura de una sesión se anima; el cierre es instantáneo. La prioridad es no renderizar cuerpos colapsados.

## 4. Diseño técnico

### 4.1 Estado y hash

En `src/store/appStore.ts`:

```ts
export type ProgresoSub = 'resumen' | 'historial'

interface AppStore {
  progresoSub: ProgresoSub
  setProgresoSub: (sub: ProgresoSub, push?: boolean) => void
}
```

- `progresoSub` arranca en `'resumen'`.
- `setProgresoSub('historial', true)` actualiza el estado y la URL a `#historial`.
- `setProgresoSub('resumen', true)` actualiza el estado y la URL a `#progreso`.
- Si la URL ya es la correcta, hace scroll al tope sin duplicar la entrada del historial.
- `setView('progreso', true)` sigue funcionando: si el hash actual es `#historial`, lo cambia a `#progreso` y el listener de `hashchange` vuelve a Resumen. Tocar la pestaña Progreso desde Historial lleva a Resumen.

En `src/lib/view.ts`:

```ts
const ALIAS: Record<string, ViewId> = { hierro: 'registrar', historial: 'progreso' }

export function progresoSubFromHash(hash?: string): ProgresoSub {
  return hashOf(hash) === 'historial' ? 'historial' : 'resumen'
}
```

`viewFromHash('#historial')` devuelve `'progreso'`; `VALID` sigue teniendo 4 vistas. Se extrae `hashOf()` para no repetir el acceso a `window.location.hash`.

En `src/components/ViewManager.tsx`, el listener de hash actualiza vista y sub-vista:

```ts
const hash = window.location.hash
const state = useAppStore.getState()
state.setView(viewFromHash(hash), false)
state.setProgresoSub(progresoSubFromHash(hash), false)
```

En `src/layouts/Base.astro`, el script pre-paint espeja la misma regla: `#historial` pinta `data-view="progreso"` antes de hidratar.

### 4.2 ProgresoView

Estructura nueva:

```tsx
<>
  <div className="prog-subnav">
    <div className="seg" role="group" aria-label="Contenido de Progreso">
      <button type="button" aria-pressed={sub === 'resumen'} …>Resumen</button>
      <button type="button" aria-pressed={sub === 'historial'} …>Historial</button>
    </div>
  </div>

  {sub === 'resumen' ? (
    <>
      <section className="stats stats-progreso">…</section>
      <div className="progreso-main">…paneles actuales…</div>
    </>
  ) : (
    <div className="progreso-main hist-only">
      <section className="panel">…Historial…</section>
    </div>
  )}
</>
```

- El segmento es un `role="group"` con botones `aria-pressed`, no un tablist anidado. Evita `aria-controls` colgando cuando el panel inactivo no existe.
- `ProgresoView` sigue montado siempre (lo mantiene `ViewManager`), así que `metric` y `selected` sobreviven al ida y vuelta entre sub-vistas.
- Los cálculos pesados se saltean en Historial:
  - `weeklyVolume(history)` solo en Resumen.
  - `allExerciseNames(history)` solo en Resumen.
  - `exerciseSeries(history, keySel)` solo en Resumen.
- El panel de Historial **no** lleva `.reveal`: `useReveal` corre una sola vez al montar y un panel condicional quedaría en `opacity: 0`.

### 4.3 Historial

`Historial` se muda de `src/components/hierro/Historial.tsx` a `src/components/progreso/Historial.tsx` (`git mv`). Es contenido de la vista Progreso; `hierro/` agrupa Registrar y Plan.

Renderizado liviano:

```tsx
<button
  type="button"
  className="hist-head"
  aria-expanded={isOpen}
  aria-controls={isOpen ? `hist-body-${h.id}` : undefined}
  onClick={() => toggle(h.id)}
>
  …
</button>
{isOpen ? (
  <div className="hist-body" id={`hist-body-${h.id}`}>
    …
  </div>
) : null}
```

- El cuerpo no existe en el DOM cuando está cerrado.
- `aria-controls` se emite solo expandido, igual que la fila de serie de la Tarea 14.
- El botón “Eliminar sesión” también lleva `type="button"`.
- Al cerrar, el cuerpo se desmonta; al abrir, se monta con una animación corta.

### 4.4 Registrar

`RegistrarView` pierde el import de `Historial`, el import de `CSSProperties` y la sección `02/ Historial`. Queda:

```tsx
<main>
  <SessionHeader />
  <VolumePulse />
  <Sesion />
</main>
```

`main` sigue siendo una grilla de 2 columnas. Para que la sesión no quede a media pantalla en escritorio, `#sessionPanel` pasa a ocupar todo el ancho:

```css
#sessionPanel {
  grid-column: 1 / -1;
}
```

`SessionHeader` y `VolumePulse` ya tenían `grid-column: 1 / -1`.

### 4.5 CSS

- `.prog-subnav`: contenedor alineado a la izquierda, mismo ancho máximo que `.stats` (1340 px), `padding: 24px 28px 0`; a ≤640 px, `14px 16px 0`.
- `.prog-subnav .seg button`: `min-height: 44px` y `padding: 11px 16px` para un target táctil cómodo.
- `.progreso-main.hist-only`: `grid-template-columns: minmax(0, 1fr)` para que el historial use todo el ancho.
- `.hist-body`: `max-height: 440px; overflow: auto; animation: hist-in 0.22s ease;` y se eliminan la regla colapsada (`max-height: 0`) y `.hist-item.open .hist-body`.
- `@keyframes hist-in`: `opacity 0 → 1` y `translateY(-4px) → 0`.
- La regla existente de `prefers-reduced-motion` ya desactiva la animación.

### 4.6 Accesibilidad

- Segmento: `role="group"` + `aria-label="Contenido de Progreso"` + `aria-pressed` en cada botón.
- Botones de sesión: `type="button"`, `aria-expanded` y `aria-controls` solo expandido.
- Targets del segmento ≥ 44 px.
- El cambio de sub-vista mantiene el foco en el botón tocado; no se fuerza foco al panel.
- El deep link `#historial` tiene que dejar `data-view="progreso"` desde el pre-paint para que el topbar no parpadee con el estilo de Registrar.

### 4.7 Memoria medida

Con 200 sesiones y todo colapsado, sobre el build final (Chrome headless, `HeapProfiler.collectGarbage` ×3, bfcache desactivado y target limpio por escenario):

| Vista | Antes (Tarea 13) | Después (medido) |
|---|---:|---:|
| `#registrar` | 15,5 MB / 53.301 | **3,21 MB / 4.162** (sin historial) |
| `#progreso` Resumen | 26,7 MB / 86.266 | **3,26 MB / 4.159** (sin lista) |
| `#historial` colapsado | — | **3,74 MB / 7.848**, 200 ítems y 0 cuerpos |

Los 200 ítems del historial colapsado suman 1.600 nodos. La primera medición reutilizaba el
target y dejaba documentos en bfcache (`documents` 3→5, heap 10,98 MB); por eso se repitió con
bfcache desactivado. Los valores son de Chrome headless y sirven para comparar, no como medida
absoluta de Android.

## 5. Validación

- Unitarios: `src/lib/test/view.test.ts` con 3 tests nuevos:
  - `viewFromHash('#historial') === 'progreso'`.
  - `progresoSubFromHash('#historial') === 'historial'`.
  - `progresoSubFromHash` cae en `'resumen'` para `#progreso`, `#plan`, `''` y desconocidos.
- Unitarios: `src/store/appStore.test.ts` con 3 tests nuevos de `setProgresoSub`:
  - `push=true` actualiza la sub-vista y escribe `#historial`.
  - `push=true` con el hash ya activo hace scroll al tope.
  - `push=false` solo actualiza el estado, sin tocar el hash ni hacer scroll.
- Unitarios: `src/components/progreso/ProgresoView.test.tsx` con 2 tests de la sub-vista, renderizados con `react-dom/server`: Resumen muestra el segmento y los stats sin la lista; Historial muestra la lista y oculta los stats.
- Base 72 → **80 tests**.
- `npx tsc --noEmit -p tsconfig.check.json`.
- `npm run build` (SW 28 archivos).
- Smoke CDP con preview 4321 y Chrome 9222:
  1. Registrar no muestra “Historial” ni `#historyList`.
  2. Progreso muestra el segmento `Resumen | Historial`; Resumen conserva stats y los dos paneles.
  3. Historial muestra la lista, oculta los stats y la URL queda en `#historial`.
  4. Una sesión cerrada no tiene `.hist-body` en el DOM; al abrir aparece uno; al cerrar vuelve a 0.
  5. Recarga directa de `#historial`: `data-view="progreso"`, sub-vista Historial, sin flash de Registrar.
  6. Atrás vuelve a Resumen (`#progreso`); Adelante vuelve a Historial.
  7. Eliminar una sesión sigue funcionando y el undo la restaura.
  8. Anchos 320/360/390/412/768/1024/1440 sin overflow; segmento ≥ 44 px.
  9. Memoria con 200 sesiones: Registrar y Progreso por debajo de los umbrales de 4.7.
- Prueba manual en Android: abrir Progreso, cambiar a Historial, abrir/cerrar una sesión, recargar en `#historial`, volver con Atrás.

## 6. Fuera de alcance

- Quinta pestaña Historial.
- Vistas lazy o `ViewManager` condicional.
- Timer persistente entre recargas.
- Cambios en `forja_session`, `forja_history`, `forja_body`, `forja_week`, `forja_session_start` o respaldo v3.
