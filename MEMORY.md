# MEMORY.md — teenage-points-system

> Reglas: ≤50 líneas; resumí o quitá lo que ya no aporte. Nunca claves,
> tokens ni datos personales (repo público). Log completo de sesiones:
> `memoria/index.html` (localStorage + backup JSON local) — este archivo
> lleva el resumen, el log vive allá.

## Estado actual

- Branch `develop`, limpio en `355b0d1`. Versión `0.0.0` (package.json).
- 💚 `lint` 0 · `typecheck` 0 · **296/296 tests** · `npm run build` exit 0 (16-oct-2026).
- Backend: `./mvnw test` en verde **sin Mongo** (11 tests). Falla conocida del log de tests: la traza `ConnectException` con Mongo apagado es ruido, no fallo.
- Nuevo hoy: `AGENTS.md` (raíz + `backend/`), `ci.yml` (front lint→typecheck→tests→build y back `./mvnw test`), plantilla PR (`.github/pull_request_template.md`), ESLint regla `no-unused-vars` para rest siblings (15 errores → 0), 8 `any` tipados, `diasSemana` a módulo, `loadCustomTasks` en `useCallback`, `memoria/index.html`.
- Riesgo declarado: el `ChildView`/`RewardTracker`/`TaskManagement` quedaron **sin tests propios** (solo cubre la suite general).

## Decisiones y por qué

- **AGENTS.md en dos piezas** (raíz front + `backend/`): OpenCode carga lo anidado solo al tocar esa carpeta; el root se queda liviano.
- **`ci.yml` completo, sin atajos**: era el único pipeline que había (storybook.yml) y lint no corría en CI. Sin `--passWithNoTests` ni `continue-on-error`: puerta falsa = la peor deuda.
- **Rest siblings en ESLint, no borrar el código**: los `_ignorado`/`_tampoco` son la enforcement del contrato sin `className` del design system, no descuidos.
- **`MEMORY.md` lleva solo el resumen; el log completo vive en `memoria/index.html`**: una sola verdad por cosa — este repo ya pagó por tener dos (ver abajo).
- **Export/import JSON en `memoria/`**: MDN dice que en `file://` el `localStorage` es indefinido y puede lanzar `SecurityError`; el JSON es la copia durable, el storage es caché.

## Ojo — errores ya pagados (no repites)

- `tsc --noEmit` a secas = **no-op** acá (`tsconfig` raíz con referencias) → solo `npm run typecheck`.
- El backend **arranca con Mongo caído** y no se reconecta: si levantás Mongo después, reiniciás el backend; `/actuator/health` vacío = aviso.
- Dos copias del mismo código = dos verdades: hubo una copia entera de `customTaskService` camuflada como componente (`FamilyPointsOverview.tsx`); hoy lo vigila `arquitectura.test.ts`.

## Próximos pasos

1. Empujar esta ronda a `develop` y ver el `ci.yml` nuevo en verde (si algo da rojo, se arregla ahí, es el CI que el repo nunca tuvo).
2. Migrar los dominios que faltan de Firestore a Java: `docs/MIGRACION-A-JAVA.md`.
3. Revisar rol de administrador y sus pendientes: `docs/PENDIENTES-ADMIN.md`.

## Sesiones

Una sola sesión por partida, la más nueva arriba:

| Fecha | Tema | Min |
|---|---|---|
| 2026-10-16 | AGENTS.md×2, flujo TDD/PR/CI, lint+8 any, plantilla PR, MEMORY, memoria/ | 75 |

**Total: 1 sesión · 75 min · racha 1**
(Es la cuenta completa; se actualiza al terminar cada tarea.)
