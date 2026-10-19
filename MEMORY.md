# MEMORY.md — teenage-points-system

> Reglas: ≤50 líneas; resumí o quitá lo que ya no aporte. Nunca claves,
> tokens ni datos personales (repo público). Log completo de sesiones:
> `memoria/index.html` (localStorage + backup JSON local) — este archivo
> lleva el resumen, el log vive allá.

## Estado actual

- Branch `develop` al día con `origin/develop` (push 19-oct, CI `39267451164` ✅ back+front). Versión `0.0.0`.
- 💚 **301/301 tests** (19-oct-2026). `lint`/`typecheck`/`build` medidos por última vez el 16-oct.
- Backend: `./mvnw test` verde sin Mongo (11 tests); la traza `ConnectException` del log es ruido, no fallo.
- Plan coach: traspaso en `.opencode/plan/sesion-2026-10-17-coach-acuerdos.md` (**gitignored**: lleva contenido del método).
- Iteración 0: ✅ `NOTICE.md` (`0b85f1f`); ⏳ limpieza de `categorias`. Iteración 1 empezada: ✅ `src/utils/perfilPadre.ts` + test (`d3b6fa4`, `aa27b1b`).
- Riesgo declarado: `ChildView`/`RewardTracker`/`TaskManagement` sin tests propios.

## Decisiones y por qué

- **AGENTS.md en dos piezas**: OpenCode carga lo anidado solo al tocar esa carpeta.
- **`ci.yml` completo, sin atajos**: sin `--passWithNoTests` ni `continue-on-error`.
- **`MEMORY.md` lleva el resumen; el log completo vive en `memoria/index.html`**: una sola verdad por cosa.
- **Coach**: modelo aditivo (no lo hace → no gana, jamás pierde); acuerdos padre-hijo; **nivel de confianza NUNCA baja**; `Task.java` intocable (el acuerdo crea la tarea por el POST existente); proveedor **Claude**; el nivel sube por **acuerdo mutuo** con datos que solo informan, no deciden.
- **Derechos**: el método **Efera** (Error-Foco-Estrategia-Rol-Acción) y los 5 colores son de **Vicent Ginés Romero**; licencia de alumna = uso personal, no comercializable → el método vive en **Firestore, nunca en el repo** (ni en planes versionados). Los **5 colores ya están** en `child.tiposAdolescente` (`AddEditChild.tsx:152`).

## Ojo — errores ya pagados (no repites)

- `tsc --noEmit` a secas = **no-op** → solo `npm run typecheck`.
- El backend arranca con Mongo caído y no se reconecta: levantar Mongo después = reiniciar backend.
- Dos copias del mismo código = dos verdades (lo vigila `arquitectura.test.ts`).
- **El agente SÍ puede leer Firestore**: `firestore.rules` tiene `allow read: if true` en `categorias`; se lee por REST con la key de `.env`. Ese contenido está sucio (duplicados/typos): limpiar en la iteración 0 antes de dárselo al LLM.
- **Este archivo envejece**: si un commit cambia el estado y no toca `MEMORY.md`, el próximo agente arranca con datos falsos (19-oct propuso rehacer `NOTICE.md`). Contrastar con `git log` antes de proponer.
- OpenCode: MCP local = `"command": ["npx", "-y", "pkg"]` (lista). Con `command`+`args` lo ignora sin avisar.

## Próximos pasos

1. CI avisa deprecaciones: `actions/setup-java@v4`→v5 y acciones en Node 20; login sin `h1` y título "Vite + React + TS".
2. Plan coach: limpieza de `categorias` (con OK de la dueña) y seguir iteración 1 (perfil del padre: cuestionario + guardado).
3. Migrar dominios restantes a Java (`docs/MIGRACION-A-JAVA.md`) y rol admin (`docs/PENDIENTES-ADMIN.md`).

## Sesiones

| Fecha | Tema | Min |
|---|---|---|
| 2026-10-19 | MCP chrome-devtools en OpenCode, plugins v1→v2, API key nueva, MEMORY al día, engram subido, informe RAG | 145 |
| 2026-10-18 | Estructura .opencode (agente + 4 skills), backend Java explicado, plan coach al repo (gitignored) | 60 |
| 2026-10-17 | Plan coach (método Efera / Vicent Ginés): research, derechos, acuerdos y 5 iteraciones | 131 |
| 2026-10-16 | AGENTS.md×2, flujo TDD/PR/CI, lint+8 any, plantilla PR, MEMORY, memoria/ | 75 |

**Total: 4 sesiones · 411 min · racha 4** (la cuenta verificable: `memoria/sesiones-teenage-points.json`)
