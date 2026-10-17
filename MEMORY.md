# MEMORY.md — teenage-points-system

> Reglas: ≤50 líneas; resumí o quitá lo que ya no aporte. Nunca claves,
> tokens ni datos personales (repo público). Log completo de sesiones:
> `memoria/index.html` (localStorage + backup JSON local) — este archivo
> lleva el resumen, el log vive allá.

## Estado actual

- Branch `develop`, limpio en `355b0d1`. Versión `0.0.0` (package.json).
- 💚 `lint` 0 · `typecheck` 0 · **296/296 tests** · `npm run build` exit 0 (16-oct-2026).
- Backend: `./mvnw test` verde sin Mongo (11 tests); la traza `ConnectException` del log es ruido, no fallo.
- 16-oct: `AGENTS.md`×2, `ci.yml`, plantilla PR, ESLint rest siblings (15→0), 8 `any` tipados, `memoria/index.html`.
- 17-oct: **plan del coach + perfil del padre CERRADO, sin implementar**. Traspaso completo: `.opencode/plan/sesion-2026-10-17-coach-acuerdos.md` (iteraciones 0-5, decisiones, método leído de Firestore).
- Riesgo declarado: `ChildView`/`RewardTracker`/`TaskManagement` sin tests propios.

## Decisiones y por qué

- **AGENTS.md en dos piezas**: OpenCode carga lo anidado solo al tocar esa carpeta.
- **`ci.yml` completo, sin atajos**: sin `--passWithNoTests` ni `continue-on-error`.
- **`MEMORY.md` lleva el resumen; el log completo vive en `memoria/index.html`**: una sola verdad por cosa.
- **Coach**: modelo aditivo (no lo hace → no gana, jamás pierde); acuerdos padre-hijo; **nivel de confianza NUNCA baja**; `Task.java` intocable (el acuerdo crea la tarea por el POST existente); proveedor **Claude**; el nivel sube por **acuerdo mutuo** con datos que solo informan, no deciden.
- **Derechos**: el método **Efera** (Error-Foco-Estrategia-Rol-Acción) y los 5 colores son de **Vicent Ginés Romero**; licencia de alumna = uso personal, no comercializable → el método vive en **Firestore, nunca en el repo**; `NOTICE.md` pendiente (iteración 0). Los **5 colores ya están** en `child.tiposAdolescente` (`AddEditChild.tsx:152`).

## Ojo — errores ya pagados (no repites)

- `tsc --noEmit` a secas = **no-op** → solo `npm run typecheck`.
- El backend arranca con Mongo caído y no se reconecta: levantar Mongo después = reiniciar backend.
- Dos copias del mismo código = dos verdades (lo vigila `arquitectura.test.ts`).
- **El agente SÍ puede leer Firestore**: `firestore.rules` tiene `allow read: if true` en `categorias`; se lee por REST con la key de `.env`. Ese contenido está sucio (duplicados/typos): limpiar en la iteración 0 antes de dárselo al LLM.

## Próximos pasos

1. Plan coach, iteración 0: `NOTICE.md` + limpieza de `categorias` (con OK de la dueña); luego iteración 1: **perfil del padre**, empezando por el test de `src/utils/perfilPadre.ts`.
2. Empujar la ronda del 16-oct a `develop` y ver el `ci.yml` nuevo en verde.
3. Migrar dominios restantes a Java (`docs/MIGRACION-A-JAVA.md`) y rol admin (`docs/PENDIENTES-ADMIN.md`).

## Sesiones

Una sola sesión por partida, la más nueva arriba:

| Fecha | Tema | Min |
|---|---|---|
| 2026-10-17 | Plan coach (método Efera / Vicent Ginés): research, derechos, acuerdos y 5 iteraciones | 131 |
| 2026-10-16 | AGENTS.md×2, flujo TDD/PR/CI, lint+8 any, plantilla PR, MEMORY, memoria/ | 75 |

**Total: 2 sesiones · 206 min · racha 2**
(Es la cuenta de este resumen; la cuenta completa y verificable vive en `memoria/index.html`.)
