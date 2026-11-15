# Sesión 4: descubrir el tipo del hijo (contenido ficticio) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un adulto responde unas preguntas sobre su hijo, el **servidor** le sugiere un tipo con su margen y su porqué, y **el adulto elige** (puede elegir otro). Cada adulto elige por separado; si no coinciden, se muestran las diferencias sin decidir.

**Architecture:** feature nueva `es.cookyourweb.points.ia` (como `task/`). `ContenidoMetodoPort` entrega preguntas, opciones, tipos y el mapa opción→tipo; hoy lo implementa `ContenidoFicticio` (en memoria, todo marcado `[FICTICIO]`); el adaptador de Firestore con el contenido real llega después sin tocar lo demás. `TipoService.sugerir` es una **función pura y determinista** (sin modelo). El navegador **nunca** recibe el mapa opción→tipo: solo el texto de las preguntas y la sugerencia ya calculada. La elección del adulto se guarda en Mongo (`EleccionTipo`), una por adulto, protegida con `requireMember`.

**Tech Stack:** Java 17, Spring Boot 4.1, Spring Data MongoDB, Testcontainers; React 18 + TS, Vitest, Testing Library, `vitest-axe`.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-ia-design.md` (§2 `TipoService`/`ContenidoMetodoPort`, §3 momento (a), §7 anti-fuga `[FICTICIO]`, §8 firma del puerto), `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` (§8 fila "4. Tipo", §6 Tests, §1 principios), `docs/superpowers/specs/2026-11-13-vision-producto-design.md` (§3 punto 1).

## Global Constraints

- Demo (§8): **el test sugiere un tipo con contenido de ejemplo**.
- **Nada del método en el repo** (AGENTS.md, NOTICE.md): preguntas, opciones, tipos y descripciones son **inventados**, y cada texto lleva el marcador `[FICTICIO]`; un test falla si falta (spec IA §7). No se lee la colección `categorias` en esta sesión.
- `TipoService` es **determinista y sin modelo**; vive en el servidor. El mapa opción→tipo **nunca** sale en una respuesta HTTP (test que lo comprueba).
- **El adulto decide**: la sugerencia es solo una sugerencia; puede guardar cualquier tipo válido.
- **Una elección por adulto** y por hijo; si los adultos no coinciden, se muestran las diferencias y **no se decide**.
- **El adolescente no ve su tipo** (hoy no hay cuentas de adolescente; las rutas exigen membresía de adulto).
- Autorización: elecciones bajo `/api/familias/{familyId}/hijos/{hijoId}/tipo`, con `requireMember` (404 entre familias), `uid` del token.
- Frontend: `src/services/coachService.ts` es el único adaptador a `/api/ia` (spec IA §3); componentes del design system de `src/components/ui/` (sin `className`); textos con tildes; `vitest-axe` en la pantalla nueva (front-back §6).
- Repo: TDD estricto, un commit por tarea en español con el porqué, sin Co-Authored-By ni atribución a IA, sin push, sin build. Verificación: `cd backend && ./mvnw test`; `npm run lint`, `npm run typecheck`, `npx vitest run`.

## Rulings tomados al escribir el plan

- **Los tipos también son ficticios** (`[FICTICIO] Tipo Brújula`, etc.): sus nombres reales están en Firestore (`categorias`, "tipo de adolescente") y son contenido del método. Coste si es incorrecto: renombrar 5 cadenas de un fixture.
- **La elección se guarda en Mongo y NO se copia a `tiposAdolescente`** del hijo en Firestore: con tipos ficticios ensuciaría los datos reales. Las dos fuentes conviven hasta que entre el contenido real. Coste: el selector viejo de `AddEditChild` no refleja el test todavía (límite declarado).
- **Margen** como categoría, no número: `CLARO` (el primero supera al segundo por ≥ 2 respuestas), `AJUSTADO` (por 1), `EMPATE` (empate en cabeza: se sugiere el primero en orden de definición y se marca empate). Coste: cambiar umbrales en una función pura.
- **`porQue`** = la descripción del tipo sugerido (texto del contenido), no qué respuestas apuntaron a él (eso revelaría el mapa).

## Review Focus

1. **Respuestas incompletas o con ids que no existen** → 400 con qué falta; nunca una sugerencia a medias. → Task 2.
2. **El mapa opción→tipo se cuela en el JSON** de `GET /preguntas` o de la sugerencia. → Task 2 (test que serializa y busca).
3. **Un adulto de otra familia guarda o lee elecciones** de un hijo ajeno → 404. → Task 3.
4. **Dos adultos eligen distinto**: la pantalla muestra ambas y un aviso de que no coinciden, sin elegir por ellos. → Task 4.
5. **Guardar un tipo que no existe** → 400. → Task 3.

---

### Task 1: contenido ficticio y `TipoService` (puro)

**Files:**
- Create: `backend/src/main/java/es/cookyourweb/points/ia/ContenidoMetodoPort.java`, `ContenidoFicticio.java`, `ContenidoTipo.java` (record: `List<Tipo> tipos`, `List<Pregunta> preguntas`), `Tipo.java` (record `id, nombre, descripcion`), `Pregunta.java` (record `id, texto, List<Opcion> opciones`), `Opcion.java` (record `id, texto, String tipoId`), `TipoService.java`, `Sugerencia.java` (record `Tipo tipo, Margen margen, String porQue`), `Margen.java` (enum `CLARO, AJUSTADO, EMPATE`), `RespuestasInvalidasException.java`
- Test: `backend/src/test/java/es/cookyourweb/points/ia/TipoServiceTest.java`, `ContenidoFicticioTest.java`

**Interfaces:**
- Produces: `ContenidoMetodoPort.contenidoDeTipo(): ContenidoTipo`; `TipoService.sugerir(Map<String,String> respuestas /* preguntaId→opcionId */): Sugerencia` (lanza `RespuestasInvalidasException` con la lista de preguntas sin responder o ids inválidos); `TipoService.tipos(): List<Tipo>`; `TipoService.esTipoValido(String tipoId): boolean`.
- `ContenidoFicticio`: **5 tipos y 6 preguntas** inventados, 5 opciones por pregunta (una por tipo), todo con `[FICTICIO]` en `nombre`, `descripcion`, `texto`.

- [ ] **Step 1: Tests que fallan:** `todoLlevaMarcaFicticio` (recorre tipos, preguntas y opciones: cada texto contiene `[FICTICIO]`); `cadaOpcionApuntaAUnTipoExistente`; `sugiereElTipoMasVotado` (6 respuestas, 4 a T1 → T1, `CLARO`); `margenAjustado` (3 vs 2 → `AJUSTADO`); `empate` (3 vs 3 → primero en orden de definición, `EMPATE`); `respuestasIncompletasLanzan` (5 de 6 → excepción que nombra la pregunta que falta); `opcionInexistenteLanza`; `determinista` (mismas respuestas → misma sugerencia, 100 veces); `porQueEsLaDescripcionDelTipo`.
- [ ] **Step 2:** rojo por aserción; implementar; `./mvnw test` verde.
- [ ] **Step 3: Commit** `feat(ia): el tipo sugerido lo calcula el servidor con una funcion determinista y contenido ficticio`

### Task 2: `GET /api/ia/tipo/preguntas` y `POST /api/ia/tipo/sugerencia`

**Files:**
- Create: `.../ia/TipoController.java`, `.../ia/PreguntasPublicas.java` (record con `tipos: [{id, nombre}]` y `preguntas: [{id, texto, opciones: [{id, texto}]}]` — **sin** `tipoId` ni descripciones)
- Modify: `.../web/ManejadorDeErrores.java` (`RespuestasInvalidasException` → 400 con `campos`)
- Test: `backend/src/test/java/es/cookyourweb/points/ia/TipoControllerTest.java` (`@WebMvcTest` + `@Import(SeguridadConfig.class)` + `@MockitoBean JwtDecoder`, como `identidad/YoControllerTest`)

**Interfaces:**
- `GET /api/ia/tipo/preguntas` → `200 PreguntasPublicas`. `POST /api/ia/tipo/sugerencia` `{ "respuestas": { "<preguntaId>": "<opcionId>" } }` → `200 { "tipo": {id, nombre}, "margen": "CLARO|AJUSTADO|EMPATE", "porQue": "..." }`. Ambos exigen token (401 sin él).

- [ ] **Step 1: Tests que fallan:** `sinTokenDa401` (las dos rutas); `preguntasNoRevelanElMapa` (Review Focus 2: el JSON de `GET` no contiene `tipoId` ni ninguna descripción de tipo); `sugerenciaNoRevelaElMapa` (el JSON de la sugerencia no contiene ids de opciones ni `tipoId`); `respuestasIncompletasDa400` (Review Focus 1, con `campos`); `sugerenciaValidaDa200`.
- [ ] **Step 2:** rojo; implementar; verde.
- [ ] **Step 3: Commit** `feat(ia): preguntas y sugerencia de tipo por la API sin que el navegador vea el mapa de respuestas`

### Task 3: la elección de cada adulto, en Mongo

**Files:**
- Create: `.../ia/EleccionTipo.java` (record `@Document("eleccionesTipo")`, `@CompoundIndex(unique) {familyId, hijoId, uid}`: `id, familyId, hijoId, uid, tipoId, Instant elegidaEn`), `.../ia/EleccionTipoRepository.java`, `.../ia/EleccionTipoService.java`, `.../ia/EleccionTipoController.java`
- Modify: `.../config/IndicesMongo.java` (crear también este índice único)
- Test: `.../ia/EleccionTipoServiceTest.java`, `.../ia/EleccionTipoControllerTest.java`; añadir un caso a `task/PropiedadIntegracionTest.java` o un `ia/EleccionTipoIntegracionTest.java` con Testcontainers

**Interfaces:**
- Consumes: `AccesoFamilia.requireMember` (sesión 3), `TipoService.esTipoValido`.
- `PUT /api/familias/{familyId}/hijos/{hijoId}/tipo` `{ "tipoId": "..." }` → `200 { tipoId, elegidaEn }` (crea o sustituye **la del propio adulto**; idempotente). `GET` misma ruta → `200 { "elecciones": [{ "uid", "tipoId", "elegidaEn", "esMia": bool }], "coinciden": bool }`.

- [ ] **Step 1: Tests que fallan:** `guardaLaDelAdulto`; `sustituyeNoDuplica` (dos PUT → una elección); `tipoInexistenteDa400` (Review Focus 5); `otraFamiliaDa404` (Review Focus 3, en servicio y en el test de integración con una segunda cuenta para PUT y GET); `coincidenFalsoSiDifieren`; `noPuedeEscribirLaDeOtroAdulto` (el `uid` sale del token, nunca del cuerpo).
- [ ] **Step 2:** rojo; implementar; `./mvnw test` verde.
- [ ] **Step 3: Commit** `feat(ia): cada adulto guarda su eleccion de tipo por separado y solo dentro de su familia`

### Task 4: la pantalla "Descubrir su tipo"

**Files:**
- Create: `src/services/coachService.ts` (`getPreguntasTipo()`, `pedirSugerencia(respuestas)`, `guardarEleccionTipo(familyId, hijoId, tipoId)`, `getEleccionesTipo(familyId, hijoId)`, todo con `apiFetch`)
- Create: `src/components/tipo/DescubrirTipo.tsx` (preguntas como grupos de opciones accesibles → "Ver sugerencia" → muestra tipo, margen en palabras y porqué → el adulto elige entre **todos** los tipos, con el sugerido preseleccionado → "Guardar mi elección" → muestra las elecciones de los adultos y, si no coinciden, un aviso neutro "No coincidís: es un buen punto para hablarlo")
- Modify: la ficha del hijo en el panel (donde hoy se muestran `tiposAdolescente`) para abrir `DescubrirTipo`
- Modify: `package.json` (devDependency `vitest-axe`) y el setup de vitest si hace falta
- Test: `src/__tests__/coachService.test.ts`, `src/__tests__/DescubrirTipo.test.tsx`

**Interfaces:**
- Consumes: Tasks 2-3; `apiFetch`/`ErrorHttp` (sesión 2); `useSesion` para el `uid` y la familia.

- [ ] **Step 1: Tests que fallan:** servicio (rutas, métodos y cuerpos exactos); pantalla con `coachService` mockeado: `noDejaPedirSinResponderTodo` (botón deshabilitado o mensaje); `muestraSugerenciaConMargenYPorQue`; `elAdultoPuedeElegirOtroTipo` (guarda el elegido, no el sugerido); `muestraDiferenciasSinDecidir` (Review Focus 4: dos elecciones distintas → aviso y ambas visibles, ninguna marcada como "la buena"); `sinViolacionesDeAccesibilidad` (`vitest-axe`); `errorDeRedSeMuestra`.
- [ ] **Step 2:** rojo; implementar con los componentes de `src/components/ui/`; `npm run lint`, `npm run typecheck`, `npx vitest run` verdes.
- [ ] **Step 3: Commit** `feat(ui): pantalla para descubrir el tipo del hijo con sugerencia del servidor y eleccion del adulto`

### Task 5: demo (la dueña con el controlador)

- [ ] Levantar Mongo, backend (con `FIREBASE_PROJECT_ID`) y `npm run dev`.
- [ ] En la ficha de un hijo: responder, ver la sugerencia, elegir otro tipo distinto y guardar.
- [ ] Con una segunda cuenta adulta de la misma familia (si existe) elegir otro tipo → aviso de que no coinciden.
- [ ] `MEMORY.md`, `docs/APRENDER-ARQUITECTURA.md` (puerto y adaptador, función pura determinista, por qué el mapa no sale del servidor, contenido ficticio) y log de sesiones.
