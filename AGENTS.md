# Instrucciones para agentes en este repositorio

## Dónde empezar y terminar cada sesión

- **Al empezar**: leé `MEMORY.md` — un resumen de ≤ 50 líneas con el estado del proyecto, las decisiones tomadas y por qué, los errores a evitar y los próximos pasos. Sirve para no repetir trabajo ni reabrir discusiones cerradas.
- **Al terminar una tarea**: actualizá `MEMORY.md` — estado actual, decisiones importantes y por qué, errores a evitar, próximos pasos.
- **Cerrar sesión (siempre, sin que la dueña lo pida)**: tras actualizar `MEMORY.md`, entregale `Tema: … · Minutos: …` listos para pegar en `memoria/index.html` (fecha sola va precargada). Los minutos se cuentan por la hora real de inicio/fin, no a ojo. El `localStorage` del navegador no es accesible para el agente: ella lo carga con clics; evitá duplicar si ya hay sesión del día.
- **El log tiene copia durable en el repo**: `memoria/sesiones-teenage-points.json` — el agente la actualiza en cada cierre con la misma fila que va a `MEMORY.md`. El `localStorage` es caché; el JSON es la verdad. Si la página sale vacía, se reconstruye desde el JSON (clics: importar). El log solo se usa desde la URL `http://localhost:4000/memoria/index.html` (para no partir el `localStorage` en dos orígenes).
- Máximo **50 líneas**: resumí o quitá lo que ya no aporte.
- **Nunca guardar datos sensibles** (claves, tokens, datos personales) en `MEMORY.md` ni en ningún archivo versionado: el repo es público.
- El log completo de sesiones (fecha, tema, minutos) vive en `memoria/index.html`; con su botón copiás la tabla lista para `MEMORY.md`.

## Verificación, antes y después de cada cambio

| Comando | Tipo | Nota |
|---|---|---|
| `npm run lint` | estilo | tiene que devolver 0 |
| `npm run typecheck` | tipos | `tsc -b` — es el único que compila de verdad: el `tsconfig.json` raíz es `{ "files": [], "references": [...] }`, el `tsc --noEmit` a secas no compila nada |
| `npx vitest run` | tests | `npm test` corre en modo watch |
| `npm run build` | build | `tsc -b` + `vite build`, salida en `dist/` |

Backend (`backend/`): Java 17 / Spring Boot 4.1 con Maven wrapper. `./mvnw test` desde `backend/`. El detalle vive en `backend/AGENTS.md`, que se carga automáticamente al tocar esa carpeta.

## Flujo de trabajo de este repo

1. **El test va primero**: lo escribís, lo ves fallar por una aserción (no por módulo faltante), implementás lo mínimo y lo ves en verde. Si no hay unidad testable, extraé una función — no lo salteés. Las excepciones solo con permiso de la dueña.
2. **Un commit por tarea**, en español, con el porqué en el título, y sin Co-Authored-By. Formato: `feat(ui): ...`, `fix(ui): ...`, `fix(ci): ...`, `refactor(ui): ...`, `test: ...`, `docs: ...`, `chore: ...`.
3. **Antes de editar un fichero**, mirar su historia: `git log --oneline -10 -- <ruta>`.
4. Ramas: se trabaja en `develop`; a `main` solo con el sí explícito de la dueña, nunca push directo. El Storybook se publica en GitHub Pages solo al empujar a `main` (`.github/workflows/storybook.yml`).
5. **Antes de subir a main**: medir el antes, comparar con el después; si sale PEOR, no se sube, aunque el arreglo funcione.
6. PR con el cuerpo:
   - **Qué sube** (por commit, con fichero:línea),
   - **Lo que esto NO hace**,
   - **Lo medido antes de abrir este PR** (suite, tsc, build, cifras),
   - **Límites declarados** (lo que no se probó, o se probó solo local, y la deuda que sigue abierta),
   - línea `Tests: <archivo> | no aplica porque ...`.
7. Al comunicar resultados: cada afirmación lleva su grado — ✅ (medido: dónde) o 🔶 (razonado). No se cree lo que el agente dice: se verifica.

## Estructura del proyecto

- Frontend React 18 + TypeScript 5.7, Vite 5, React Router 7, Tailwind 3.4 sobre tokens CSS (3 niveles), en `src/`.
- Backend Java 17 + Spring Boot 4.1 + MongoDB en `backend/`, con Maven wrapper (`./mvnw`).
- **`src/services/` es la única capa que toca fuentes de datos**: Firestore vía `baseService.ts` para lo no migrado, y la API de Java vía el adaptador `customTaskService.ts` para lo que ya vive en Mongo. Los componentes no conocen el proveedor.
- `backend/` está por feature: `task/` (dominio record inmutable), `web/` (ManejadorDeErrores), `config/` (CORS, Clock inyectado) — y su espejo en `backend/src/test/`.
- Dos bases de datos conviven a la vez, por migración deliberada: MongoDB (tareas personalizadas, ya migradas) y Firestore (usuarios, familias, privilegios y FAQs, por migrar). No unificar por gusto. Detalle en `docs/ARQUITECTURA.md` y `docs/MIGRACION-A-JAVA.md`.

## Prohibiciones

- **Design system**: los 8 componentes de `src/components/ui/` (Accordion, Button, Card, Checkbox, Field, Modal, Tabs, ThemeToggle) **no aceptan `className`**: el intento de pisar estilos falla en compilación. El color va solo por tokens de 3 niveles y el modo oscuro es una variable CSS, no una clase `dark:` dentro del componente.
- No tocar `Firestore` (ni Firebase) fuera de `src/services/`.
- **No debilitar las reglas de Firestore ni los tests de accesibilidad/contraste/arquitectura** para que un test pase.
- Repositorio público: **nunca claves, tokens ni datos personales** versionados. Las credenciales de Firebase ya viven en `.env` / `.env.local`, gitignored.
- No editar `dist/`, `storybook-static/` ni `backend/target/` (artefactos generados).
- **No agregar contenido del método al repo**: el Método Efera y la tipología de colores
  son de Vicent Ginés Romero (usó de alumna, no comercializable — ver `NOTICE.md`).
  Viven en Firestore (colección `categorias`); el código solo guarda la **estructura**
  (nombres de pasos y colores) y el contenido va al prompt en tiempo de ejecución.

## Gotchas

- Vite tiene `strictPort: true`: si el 5173 está ocupado **falla a propósito** en vez de tomarse otro puerto — el backend solo acepta CORS de 5173. Leé el error, no cambiés el puerto.
- El backend **arranca aunque Mongo esté caído** pero `/actuator/health` no contesta `UP` y no se reconecta solo; levantar Mongo **después** obliga a reiniciar el backend.
- `MONGODB_URI`/Spring por variable de entorno, nunca en `application.properties` (versionado, repo público).
- Agregar/cambiar historias de Storybook exige reiniciar el dev server; si falla `importers[path] is not a function`, `rm -rf node_modules/.cache/storybook`.
- `npx tsc --noEmit` es un no-op: el `tsconfig.json` raíz tiene `files: []` con referencias; solo `npm run typecheck` (`tsc -b`) compila de verdad.

## Fuentes verificados

- `docs/LEVANTAR-EN-LOCAL.md` — cómo levantar las tres piezas localmente.
- `docs/ARQUITECTURA.md` — el diseño, cifras medidas.
- `docs/MIGRACION-A-JAVA.md` — el plan para migrar el resto de dominios a Firestore.
