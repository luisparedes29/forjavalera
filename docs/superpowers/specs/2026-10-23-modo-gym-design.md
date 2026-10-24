# Diseño — Modo GYM: confiabilidad, sesión-first e inteligencia visible

- Fecha: 2026-10-23
- Estado: aprobado por el usuario (4 pestañas, RIR en Release 3, URL de producción confirmada)
- Repo: FORJA (PWA Astro 7 + React 19 + Zustand), rama `dev`
- Auditoría fuente: `auditoria/INFORME_FORJA.html` (24 oct 2026)
- Planes de implementación:
  - `docs/superpowers/plans/2026-10-23-modo-gym-r1-confiabilidad.md`
  - `docs/superpowers/plans/2026-10-23-modo-gym-r2-sesion-first.md`
  - `docs/superpowers/plans/2026-10-23-modo-gym-r3-rir-volumen.md`

## 1. Contexto y problema

FORJA tiene una capa de datos sólida (Zustand + `localStorage`, respaldo v3, lógica de
rutina y progresión) y una identidad visual propia. La auditoría confirma que el problema
no es el motor: es **el camino hasta el hierro**. La app está organizada para analizar
después de entrenar, no para registrar durante el entrenamiento.

Hallazgos verificados contra el código actual:

- **B1 — Overlays superpuestos.** `#timer` vive abajo a la izquierda (`z-index: 99`) y
  `#toasts` abajo a la derecha (`z-index: 100`). En móvil el timer ocupa casi todo el ancho
  (`max-width: calc(100vw - 24px)`), así que un toast tapa sus controles.
- **B2 — Timer que miente.** `src/store/timerStore.ts` descuenta `left` con
  `setInterval(1000)`. No hay `endsAt`, ni resincronización al volver de background, ni
  pausa real. Con la pantalla apagada el reloj se atrasa.
- **B3 — Cuatro criterios de volumen.** La barra de sesión suma solo `done`;
  `commitSession` suma todas las series; `weeklyVolume` usa `done || reps > 0`; los stats
  de `HierroView` suman todas. Además `exerciseSeries` y `stagnant` usan series no
  completadas. El mismo entrenamiento produce números distintos según la pantalla.
- **B4 — Fechas con mayúsculas internas.** `text-transform: capitalize` en
  `.chip-date b`, `.hist-date` y `.br-date` convierte “sábado, 24 de octubre de 2026” en
  “Sábado, 24 De Octubre De 2026”.
- **B5 — Iconos PWA solo SVG.** `manifest.json` y `apple-touch-icon` apuntan únicamente a
  `icon.svg`; falta el set PNG 192/512/180 y maskable.
- **U1 — La sesión es el tercer acto.** `HierroView` renderiza stats → rutina → sesión.
  Para registrar hay que scrollear.
- **U2 — El composer manual está arriba.** El formulario para añadir un ejercicio aparece
  antes de los ejercicios ya cargados.
- **U3 — Targets chicos.** `.set-check` mide 22×22, `.icon-btn` 28×28, `.add-set` ~30 px de
  alto, botones del timer ~26 px.
- **U4 — Micro-tipografía.** Columnas, tags y timer usan 9–10 px.
- **U5–U10.** No hay header sticky de sesión, ni reloj de sesión, ni timer manual, ni
  presets, ni RIR por serie, ni “la vez pasada”, ni undo, ni cadena Enter; los `confirm()`
  son nativos y el fin de semana se mapea a lunes sin explicación.

La auditoría habla de “tres criterios”; el código actual tiene **cuatro**, más dos usos
secundarios (`exerciseSeries`, `stagnant`). El plan corrige todos.

## 2. Objetivo y criterios de éxito

1. **Confiabilidad:** el timer sigue siendo correcto después de bloquear la pantalla, los
   overlays no se tapan y todos los números de volumen salen de la misma fuente.
2. **Velocidad:** con un día cargado, la primera serie está visible en el primer viewport
   (sin scroll) y registrar una serie completa lleva ≤ 8 s con una mano.
3. **Seguridad:** toda acción destructiva frecuente se puede deshacer; “Guardar” está
   siempre accesible durante la sesión.
4. **Inteligencia:** RIR opcional por serie y semáforo de volumen en vivo, sin convertir
   el registro en un formulario.
5. **Cero regresiones:** offline-first, `localStorage`, respaldo v3, identidad visual y
   compatibilidad con datos históricos intactos.

Métricas de aceptación:

| Métrica | Objetivo |
|---|---|
| Scroll hasta la primera serie (día cargado, 390×844) | 0 px |
| Tiempo para registrar una serie | ≤ 8 s |
| Timer tras 3 min con pantalla apagada | Diferencia ≤ 1 s |
| Overlays superpuestos (timer + 2 toasts) | 0 |
| Controles interactivos | ≥ 44×44 px |
| Metadatos | ≥ 11 px |
| Fuente de volumen | Una sola: series `done` |

## 3. Decisiones aprobadas

- **Cuatro pestañas:** `Registrar / Plan / Cuerpo / Progreso`.
  - `Registrar` es la home.
  - `Plan` contiene la rutina completa, semana, deload y notas.
  - `#hierro` se mantiene como alias de `#registrar` para no romper enlaces guardados.
- **RIR va en Release 3**, después de confiabilidad y sesión-first. Es opcional, nunca
  obligatorio.
- **URL de producción real:** `https://forjavalera.netlify.app/`. El README y
  `astro.config.mjs` todavía dicen `forja.netlify.app`; se corrigen en R1.
- **Volumen canónico = series completadas (`done`).** Aplica a barra de sesión, historial,
  volumen semanal, stats, progresión por ejercicio, estancamiento y respaldo. Los datos
  viejos se recalculan al mostrarse; no hay migración destructiva.
- **Offline-first se conserva:** sin backend, sin cuentas, datos solo en `localStorage`,
  respaldo JSON v3.
- **No se promete notificación local confiable con pantalla apagada.** El timestamp,
  `visibilitychange`/`pageshow` y Wake Lock resuelven la exactitud mientras la página vive.
  Si el sistema mata la PWA, la alarma no se dispara. Eso requeriría wrapper nativo o push
  con backend, y queda fuera de alcance.
- **Flujo de trabajo:** mismo que Tareas 5–9. Spec + plan por release, tareas con checkbox,
  commits en español, auditoría con subagente `general` por tarea y auditor final. Sin push
  salvo orden explícita.

## 4. Arquitectura de información

| Vista | Hash | Contenido | Acción primaria |
|---|---|---|---|
| Registrar | `#registrar` (alias `#hierro`) | Header sticky de sesión, ejercicios de la sesión, historial | Registrar serie / Guardar |
| Plan | `#plan` | Stats, rutina de 5 días, semana, deload, notas | Cargar día / Añadir ejercicio |
| Cuerpo | `#cuerpo` | Registro antropométrico, deltas, gráfico de peso | Guardar medición |
| Progreso | `#progreso` | Volumen semanal, progresión por ejercicio | Cambiar métrica |

Reglas de navegación:

- `ViewId` pasa a `'registrar' | 'plan' | 'cuerpo' | 'progreso'`.
- `initialView()` devuelve siempre `'registrar'` para evitar hydration mismatch. El hash se
  aplica en `useEffect` de `ViewManager`, después de montar.
- `Base.astro` conserva el script pre-paint y mapea `hierro`/`registrar` → `registrar`.
- Las cuatro vistas quedan **montadas** y se muestran con `display` según
  `:root[data-view]`. No se desmontan para no perder estado de formularios.
- `#hierro` no se reescribe a `#registrar` al abrir; el alias se resuelve en lectura.
  Al hacer click en la pestaña Registrar se escribe `#registrar`.

## 5. Modelo de datos

### 5.1 Claves existentes (sin cambios)

`forja_session`, `forja_history`, `forja_body`, `forja_week` conservan formato y nombres.
El respaldo sigue siendo `version: 3`.

### 5.2 Clave nueva

`forja_session_start`: timestamp en ms del inicio de la sesión actual, o ausente.

- Se crea al cargar un día o al tildar la primera serie.
- Se conserva al recargar la app (la sesión sigue en curso).
- Se borra al guardar, vaciar, importar un respaldo o borrar todos los datos.
- No entra en el respaldo v3: es estado de UI, no dato de entrenamiento.

### 5.3 RIR opcional

```ts
export interface SetData {
  reps: number | string | null
  kg: number | string | null
  done: boolean
  rir?: number | null
}
```

- `undefined`/`null` = sin RIR.
- Valores admitidos: `0`, `1`, `2`, `3` (donde `3` representa “3 o más”).
- El respaldo v3 lo conserva porque los sets se copian con spread. Los respaldos viejos
  siguen siendo válidos porque el campo es opcional.
- No se agrega migración ni se reescriben datos históricos.

### 5.4 Volumen canónico

Helpers puros en `src/lib/logic.ts`:

```ts
isCompletedSet(s)  // s.done === true
setVolume(s)       // (Number(reps) || 0) * (Number(kg) || 0)
completedSets(sets)
volumeOf(sets)     // suma solo completadas
```

`isEff` se elimina: no tiene otros consumidores que `weeklyVolume` y sus tests.

Reglas:

- `weeklyVolume`, `exerciseSeries`, `stagnant` y stats usan `isCompletedSet`.
- `commitSession` guarda `volume` calculado solo con `done`.
- `Historial` muestra “completadas / totales” y recalcula el volumen desde los sets, no
  desde `h.volume` (que puede venir inflado de datos viejos).
- `sessionSummary` (R2) usa los mismos helpers; no se crea un quinto criterio.
- `focusOf` no cambia: el enfoque de una sesión no es una métrica de volumen.

## 6. Release 1 — Confiabilidad

Objetivo: que la app no mienta ni se rompa en el momento de entrenar.

1. **Volumen canónico** (logic, store, stats, historial, sesión).
2. **Fechas correctas** (`capFirst`, sin `text-transform: capitalize`).
3. **Overlays:** toasts arriba, timer abajo, sin solapamiento a 360/390/412 px.
4. **Timer por timestamp:** `endsAt`, `sync()`, pausa real, ±15 s, Wake Lock opcional,
   resincronización en `visibilitychange`/`pageshow`/`focus`.
5. **Undo:** snackbar con acción para serie, ejercicio, sesión, historial y medición.
   “Limpiar” deja de usar `confirm()`: vacía y ofrece deshacer.
6. **Targets y tipografía:** controles ≥ 44 px; metadatos ≥ 11 px.
7. **Iconos PWA:** PNG 192/512/180 + maskable, generados por script.
8. **Documentación:** URL de producción correcta, README y `MIGRACION-ASTRO.md`.

Criterio de salida: `tsc` limpio, tests verdes, build con SW, y prueba manual en Android
con pantalla bloqueada 3 min.

## 7. Release 2 — Modo GYM (sesión-first)

Objetivo: abrir la app y estar registrando, sin scroll y con una mano.

1. **Cuatro pestañas** y alias `#hierro`.
2. **Header sticky de sesión:** `4/26 series · 1.240 kg · 38 min · Guardar`.
   - `sessionStartedAt` persistido.
   - Guardar visible desde cualquier punto.
3. **Composer plegado:** ejercicios primero; “+ Añadir ejercicio” al final en `<details>`.
   - Autocomplete con `allExerciseNames(history)` + nombres de `ROUTINE`.
   - Al elegir un nombre de la rutina, se autocompletan grupo, reps, descanso y nota.
4. **Fila de serie v2:**
   - Check de 48 px, inputs de 48 px, números tabulares de 20 px.
   - Barra de herramientas del set activo: ±1 rep, ±2,5 kg, repetir serie anterior.
   - Línea “La vez actual pasada: 50×10 · 50×10 · 50×9 · objetivo 8–12”.
   - Borrar con undo; auto-scroll a la siguiente serie pendiente.
   - Cadena Enter: reps → kg → tildar → siguiente serie.
5. **Timer manual + overlay:** presets 60/90/120/180, ±15, pausa, anillo grande y
   “Siguiente: Remo · S3 · 52,5 kg × 8–12”. Descanso por defecto de 90 s para ejercicios
   manuales sin string de descanso.
6. **Fin de semana explícito:** “Hoy no toca bloque · te preparo el lunes”, con opción de
   cargar el último día entrenado. `Cargar día` deja de decir “de hoy”.
7. **ConfirmSheet** propio para importar respaldo y borrar todos los datos; deja de usar
   `window.confirm`.

Criterio de salida:

- Primera serie visible sin scroll con un día cargado.
- ≤ 8 s por serie en prueba manual con una mano.
- 100% de controles ≥ 44 px en 360/390/412.
- `#hierro` sigue funcionando; las 4 pestañas navegan bien; Guardar siempre visible.
- Timer manual funciona en un ejercicio añadido a mano.

## 8. Release 3 — Inteligencia visible

Objetivo: que el diferencial de FORJA se vea en la fila, no escondido en Progreso.

1. **RIR opcional por serie:** chips `— / 0 / 1 / 2 / 3+` en la barra del set activo.
   - Se muestra como badge en la fila y en el historial.
   - Se conserva en el respaldo.
2. **Sugerencias afinadas por RIR** con reglas simples y testeadas:
   - Todas las series en el tope y RIR 0 → mantener (no subir todavía).
   - Todas en el tope y RIR ≤ 2 → subir.
   - En rango y RIR ≥ 3 → subir.
   - Alguna serie bajo el mínimo → repetir/bajar.
   - Sin RIR → comportamiento actual intacto.
3. **Semáforo de volumen en vivo:** historial de la semana + sesión actual, por grupo,
   contra `SET_GUIDE`. Usa exactamente `weeklyVolume`, no un helper nuevo.
4. **Progreso honesto:** leyenda “series completadas”, RIR visible en historial y copy,
   estados vacíos cuando no hay series completadas.

## 9. Fuera de alcance

- Notificaciones locales confiables con pantalla apagada o app cerrada.
- Backend, cuentas, sincronización multi-dispositivo, push.
- Wrapper nativo (Capacitor) o alarma de sistema.
- Reescritura visual completa o cambio de identidad.
- Cambio de `localStorage` a IndexedDB.
- Migración destructiva de datos o cambio de versión del respaldo (sigue v3).
- RIR obligatorio o cálculo automático de RIR.
- Long-press como única forma de borrar.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambiar la IA a 4 pestañas rompe enlaces o back/forward | Alias `#hierro`, todas las vistas montadas, tests de `viewFromHash`, prueba manual de hash/back |
| Cambiar el criterio de volumen altera números históricos | Es una corrección: recalcular al mostrar, no migrar; documentar en README y probar con datos viejos |
| El timer no suena con pantalla apagada | No prometerlo; Wake Lock mientras corre y resync al volver; documentar la limitación |
| El service worker sirve JS viejo tras el deploy | `skipWaiting`/`clients.claim` ya existen; indicar cerrar y reabrir la PWA tras actualizar |
| RIR agrega fricción | Opcional, en la barra del set activo, chips de 44 px; nunca bloquea guardar |
| `sharp` agrega dependencia de build | Es `devDependency`; los PNG generados se commitean y el build no depende de `sharp` |
| Undo restaurar una sesión ya guardada | Snackbar de 6 s; el undo de borrados de sesión no cruza el guardado en el flujo normal |

## 11. Validación

Automatizada:

- `npx tsc --noEmit -p tsconfig.check.json`
- `npm test`
- `npm run build` con log `[forja-pwa] sw.js generado con N archivos`

Tests nuevos:

- `isCompletedSet`, `setVolume`, `volumeOf`, volumen canónico en `weeklyVolume`,
  `exerciseSeries` y `stagnant`.
- `capFirst` y formato de fechas.
- `remainingAt`, salto temporal, pausa/reanudación, ±15, `finish` idempotente.
- `viewFromHash` con alias `#hierro`.
- `sessionSummary`, `formatElapsed`, `nextPending`, `lastTrainedDayIdx`.
- `suggestFor` con RIR, `weeklyVolume` con sesión viva, respaldo con RIR.

Manual en Android real (390×844):

1. Instalar la PWA, cargar un día, verificar primera serie sin scroll.
2. Registrar 3 series con una mano y medir tiempo.
3. Iniciar timer, bloquear pantalla 3 min, volver y verificar el tiempo.
4. Borrar serie/ejercicio/sesión y deshacer.
5. Abrir `#hierro` y las 4 pestañas; back/forward.
6. Exportar respaldo, importarlo y verificar datos.
7. Verificar iconos en la instalación.

## 12. Orden de ejecución y dependencias

```
R1 (confiabilidad)
  ├── T1 volumen canónico ─────────────┐
  ├── T2 fechas                        │
  ├── T3 overlays                      │
  ├── T4 timer ────────────────────────┤
  ├── T5 undo                          │
  ├── T6 targets/tipografía            │
  └── T7 iconos ───────────────────────┘
                 ↓
R2 (sesión-first) — depende de R1 (helpers de volumen, undo, timer)
  ├── T1 4 pestañas
  ├── T2 header sticky + reloj
  ├── T3 composer plegado
  ├── T4 fila de serie v2
  ├── T5 timer manual + overlay
  └── T6 fin de semana + ConfirmSheet
                 ↓
R3 (inteligencia visible) — depende de R2 (fila v2, header, volumen vivo)
  ├── T1 RIR
  ├── T2 sugerencias con RIR
  ├── T3 semáforo de volumen
  └── T4 progreso honesto
```

No se empieza R2 hasta que R1 tenga auditor final aprobado. No se empieza R3 hasta que R2
tenga auditor final aprobado. Cada release es desplegable por separado.

## 13. Referencias

- `auditoria/INFORME_FORJA.html`
- `MIGRACION-ASTRO.md`
- `PLAN-V1.md`
- `docs/superpowers/plans/2026-08-10-volumen-semanal-lun-dom.md` (formato de plan)
- `docs/superpowers/specs/2026-08-28-rutina-biceps-triceps-design.md` (formato de spec)
