# Diseño — Fila de serie sin teclado y ajustes al tocar

- Fecha: 2026-11-04
- Estado: aprobado por el usuario (check sin teclado, Enter encadena, +1 repetición)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`
- Alcance: **bloque 1**. La mudanza del historial a una pestaña propia queda para un bloque posterior.

## 1. Problema

En el teléfono, completar una serie con el check abre el teclado porque `markDone()` enfoca el input de reps de la siguiente serie (`Sesion.tsx:255-267` y `241-253`). Eso obliga a cerrar el teclado después de cada serie.

Además, las herramientas de la fila (`-1 rep`, `+1 rep`, `-2,5 kg`, `+2,5 kg`, `Repetir`, RIR) solo se renderizan cuando un input recibe foco (`Sesion.tsx:425`, `448`, `481-552`). Sin abrir el teclado no hay forma de usarlas.

## 2. Objetivo

1. Tocar el check marca la serie y **no enfoca ningún input**: no aparece el teclado.
2. Usar Enter en el campo de peso mantiene la cadena rápida: reps → kg → siguiente reps.
3. Tocar el número de serie o el espacio libre de la fila abre/cierra las herramientas **sin teclado**.
4. Tocar reps o kg sigue abriendo el teclado para escribir.
5. El número de serie es un botón accesible con `aria-expanded` y `aria-controls`.
6. No cambian datos, store, `localStorage`, respaldo v3 ni timer.

## 3. Decisiones del usuario

- Check: sin teclado. Enter: mantiene la cadena.
- “Subir una serie” significa **+1 repetición**, no “+ Añadir serie”.
- El historial se moverá a una pestaña propia en otro bloque; acá no se toca `RegistrarView` ni la navegación.

## 4. Diseño técnico

### 4.1 Próxima serie pendiente

Nuevo helper puro en `src/lib/session.ts`:

```ts
export interface SetTarget {
  exId: string
  si: number
}

export function nextSetTarget(
  exercises: Exercise[],
  exId: string,
  si: number
): SetTarget | null
```

Busca la próxima serie pendiente desde `si + 1` en el mismo ejercicio; si no queda, devuelve la primera pendiente de otro ejercicio, en el orden actual. Devuelve `null` si no hay ninguna o si `exId` no existe.

Esto reemplaza la duplicación de `nextPending` dentro de `markDone` y permite testear la selección sin DOM.

### 4.2 Completar serie

`markDone(e, si, focusNext = false)`:

- El check llama `markDone(e, si)` → `focusNext = false`.
- Enter en kg llama `markDone(e, si, true)` → `focusNext = true`.

Con `focusNext = false` se hace scroll a la próxima fila con `scrollIntoView({ block: 'nearest' })`, sin `focus()`. Con `focusNext = true` se conserva `focusSet()` actual.

### 4.3 Herramientas sin teclado

- `toggleActive(exId, si)` abre la fila si está cerrada, o la cierra si ya estaba activa.
- El número de serie pasa de `<span>` a `<button type="button">` con:
  - `aria-expanded={isActive}`
  - `aria-controls="set-tools-… set-rir-…"` **solo cuando `isActive` es true**; colapsado no se emite porque los IDs no existen en el DOM.
  - `aria-label="Serie N[, RIR X]: ajustes"`
- El check también es `<button type="button">`, para que Enter no lo trate como submit implícito.
- La fila completa también escucha `onClick`, ignorando `input` y `button` con `closest()`. Así el pulgar tiene un área grande, pero los controles conservan su comportamiento.
- Los contenedores `.set-tools` y `.set-tools-rir` reciben IDs estables.
- El foco en reps/kg sigue setea `active` como hoy.
- Enter en kg de una serie ya completada no vuelve a marcarla: solo encadena el foco a la próxima reps pendiente.
- Los IDs de ejercicio se asumen únicos (`uid()` usa `crypto.randomUUID()`); `nextSetTarget` no soporta IDs duplicados.

### 4.4 CSS

- `.set-num` mantiene tamaño y borde actuales, pero se resetea como botón: `padding: 0`, `font: 700 12px 'Space Grotesk', sans-serif`, `cursor: pointer`, `appearance: none`.
- Estado abierto: `.set-num[aria-expanded='true']` con fondo y color del grupo, más un anillo `box-shadow` que lo distingue del hover.
- No se agranda la grilla: el toque grande lo aporta la fila; el botón queda de 28 px (por encima del mínimo WCAG 2.2 de 24 px).

## 5. Validación

- Unitarios: `src/lib/test/session.test.ts` con 5 casos nuevos para `nextSetTarget`: misma serie, siguiente ejercicio, `si > 0`, vuelta a un ejercicio anterior con pendientes y sin pendientes/ejercicio inexistente. Base 67 → **72 tests**.
- `npx tsc --noEmit -p tsconfig.check.json`.
- `npm run build` (SW 28 archivos).
- Smoke CDP con preview 4321 y Chrome 9222:
  1. Check: `document.activeElement` no es `INPUT`; fila `.done`; timer encendido.
  2. Número de serie: `.set-tools` visible sin foco en input.
  3. `+1 rep` cambia el valor sin abrir teclado.
  4. Enter en reps → foco en kg.
  5. Enter en kg → foco en la próxima reps pendiente.
  6. Enter y Space activan el botón de número; `aria-controls` solo existe expandido.
  7. Anchos 320/360/390/412/768/1024/1440 sin overflow y targets ≥ 24/44 px.
- Los 8 errores de hidratación React #418 del arnés son baseline (sembrar `localStorage` antes de hidratar), no regresión.
- Prueba manual en Android: completar varias series sin que aparezca el teclado; abrir herramientas tocando el número; escribir reps/kg cuando se quiera.

## 6. Fuera de alcance

- Pestaña Historial y renderizado liviano del historial.
- Timer persistente entre recargas.
- Cambios en `forja_session`, `forja_history`, `forja_body`, `forja_week`, `forja_session_start` o respaldo v3.
