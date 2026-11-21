# Sesión 4: descubrir el perfil de colores del hijo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un adulto responde unas afirmaciones sobre su hijo y el **servidor** le devuelve un **perfil de los cinco colores**: cuánto hay de cada uno (nada, algo o mucho). Con eso, **el adulto marca** los colores que reconoce en su hijo (uno o varios) y, si quiere, cuál es el **principal**. Cada adulto elige por separado. Si las elecciones no coinciden, se muestran las diferencias sin decidir.

**Architecture:**
- Feature nueva `es.cookyourweb.points.ia`, organizada igual que `task/`.
- `ContenidoMetodoPort` entrega los colores, las afirmaciones y el mapa afirmación→color. Hoy lo implementa `ContenidoFicticio`, en memoria: las afirmaciones y las descripciones van marcadas `[FICTICIO]`. El adaptador de Firestore con el contenido real llegará después, sin tocar el resto.
- `TipoService.perfil` es una **función pura y determinista**, sin modelo.
- El navegador **nunca** recibe el mapa afirmación→color. Solo recibe el texto de las afirmaciones y el perfil ya calculado.
- La elección del adulto se guarda en Mongo (`EleccionTipo`): una por adulto y por hijo, protegida con `requireMember`.

**Tech Stack:** Java 17, Spring Boot 4.1, Spring Data MongoDB, Testcontainers; React 18 + TS, Vitest, Testing Library, `vitest-axe`.

**Spec:**
- `docs/superpowers/specs/2026-11-13-arquitectura-ia-design.md`: §2 `TipoService`/`ContenidoMetodoPort`, §3 momento (a), §7 anti-fuga `[FICTICIO]`, §8 firma del puerto.
- `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md`: §8 fila "4. Tipo", §6 Tests, §1 principios.
- `docs/superpowers/specs/2026-11-13-vision-producto-design.md`: §3 punto 1.
- Corrección de la dueña (15-nov-2026): el hijo puede ser **una mezcla de varios colores**. Los colores son los de `categorias`/"Tipo de adolescente": verde, rojo, azul, negro y amarillo.

## Global Constraints

- Demo (§8): **el test devuelve un perfil de colores con contenido de ejemplo**.
- **Nada del método en el repo** (AGENTS.md, NOTICE.md):
  - En el código solo van los **nombres e ids de los cinco colores** (`verde`, `rojo`, `azul`, `negro`, `amarillo`), porque son estructura.
  - Las descripciones de los colores, las afirmaciones y sus opciones son **inventadas**, y cada una lleva el marcador `[FICTICIO]`. Un test falla si falta (spec IA §7).
  - En esta sesión no se lee la colección `categorias`.
- `TipoService` es **determinista y sin modelo** y vive en el servidor. El mapa afirmación→color **nunca** sale en una respuesta HTTP; un test lo comprueba.
- **El adulto decide**: el perfil es solo una orientación. Puede marcar cualquier combinación de colores válidos, incluso uno que el perfil dé como "nada".
- **Una elección por adulto y por hijo.** Si los adultos no coinciden, se muestran las diferencias y **no se decide**.
- **El adolescente no ve su color.** Hoy no hay cuentas de adolescente, y las rutas exigen membresía de adulto.
- Autorización: las elecciones van bajo `/api/familias/{familyId}/hijos/{hijoId}/tipo`, con `requireMember` (404 entre familias) y el `uid` sacado del token.
- Frontend:
  - `src/services/coachService.ts` es el único adaptador a `/api/ia` (spec IA §3).
  - Se usan los componentes del design system de `src/components/ui/`, sin `className`.
  - Los textos van con tildes.
  - La pantalla nueva pasa `vitest-axe` (front-back §6).
- Repo: TDD estricto y un commit por tarea, en español y con el porqué, sin Co-Authored-By ni atribución a IA. Sin push y sin build. Verificación: `cd backend && ./mvnw test`; `npm run lint`, `npm run typecheck`, `npx vitest run`.

## Rulings tomados al escribir el plan

- **Afirmaciones de frecuencia, no preguntas de elegir uno.** Si cada pregunta obligara a elegir un color, las respuestas sumarían siempre lo mismo y no se podría detectar "mucho de dos colores a la vez".
  - Cada afirmación apunta a un color y se responde `NUNCA` (0), `A_VECES` (1) o `A_MENUDO` (2).
  - El contenido ficticio tiene **10 afirmaciones, 2 por color**.
  - Coste si es incorrecto: cambiar la forma del fixture y una función pura.
- **Nivel por color** según la suma de sus afirmaciones (de 0 a 4): `0 → NADA`, `1–2 → ALGO`, `3–4 → MUCHO`.
  - El umbral es relativo al máximo de cada color, para que siga valiendo cuando la dueña cambie el número de afirmaciones: `suma == 0 → NADA`, `suma*2 <= max → ALGO` y el resto `MUCHO`.
  - Coste si es incorrecto: cambiar los umbrales en una función pura.
- **Color principal opcional.** Si se indica, tiene que estar entre los colores marcados. Las FAQs no dicen nada sobre cuál predomina; la dueña aprobó la propuesta el 15-nov.
- **`coinciden`** es verdadero solo si los adultos marcaron **el mismo conjunto de colores y el mismo principal**. Con un solo adulto, `coinciden = true`.
- **La elección se guarda en Mongo y NO se copia a `tiposAdolescente`** del hijo en Firestore.
  - Con varios adultos, ¿cuál de las elecciones se copiaría? Además, los ids de `tiposAdolescente` salen del documento de `categorias` y no se leen en esta sesión.
  - Coste: el selector viejo de `AddEditChild` todavía no refleja el test. Queda como límite declarado.
- **El perfil no explica qué respuestas llevaron a cada color**, porque eso revelaría el mapa. Junto al nivel solo se muestra la descripción del color (ficticia).

## Review Focus

1. **Respuestas incompletas, ids que no existen o valores fuera de `NUNCA/A_VECES/A_MENUDO`** → 400 que indica qué falta. Nunca se devuelve un perfil a medias. → Tasks 1 y 2.
2. **El mapa afirmación→color se cuela en el JSON** de `GET /preguntas` o del perfil. → Task 2, con un test que serializa la respuesta y lo busca.
3. **Un adulto de otra familia guarda o lee elecciones** de un hijo ajeno → 404. → Task 3.
4. **Dos adultos marcan combinaciones distintas** (por ejemplo, mismo conjunto pero distinto principal). La pantalla muestra las dos y avisa de que no coinciden, sin elegir por ellos. → Tasks 3 y 4.
5. **Elección inválida**: ningún color, un color inexistente, colores repetidos o un principal que no está entre los marcados → 400. → Task 3.

---

### Task 1: contenido ficticio y `TipoService` (puro)

**Files:**
- Create en `backend/src/main/java/es/cookyourweb/points/ia/`:
  - `ContenidoMetodoPort.java`
  - `ContenidoFicticio.java`
  - `ContenidoTipo.java`: record con `List<Color> colores` y `List<Afirmacion> afirmaciones`.
  - `Color.java`: record con `id`, `nombre` y `descripcion`.
  - `Afirmacion.java`: record con `id`, `texto` y `colorId`.
  - `Frecuencia.java`: enum `NUNCA(0)`, `A_VECES(1)`, `A_MENUDO(2)`.
  - `Nivel.java`: enum `NADA`, `ALGO`, `MUCHO`.
  - `Perfil.java`: record con `List<NivelDeColor> colores`, donde `NivelDeColor` es un record con `Color color` y `Nivel nivel`, en el orden en que se definen los colores.
  - `TipoService.java`
  - `RespuestasInvalidasException.java`
- Test: `backend/src/test/java/es/cookyourweb/points/ia/TipoServiceTest.java`, `ContenidoFicticioTest.java`

**Interfaces:**
- Produces:
  - `ContenidoMetodoPort.contenidoDeTipo(): ContenidoTipo`
  - `TipoService.perfil(Map<String, Frecuencia> respuestas /* afirmacionId→frecuencia */): Perfil`. Lanza `RespuestasInvalidasException` con la lista de afirmaciones sin responder o con ids inválidos.
  - `TipoService.colores(): List<Color>`
  - `TipoService.esColorValido(String colorId): boolean`
- `ContenidoFicticio` tiene:
  - Los **5 colores** con ids `verde`, `rojo`, `azul`, `negro` y `amarillo`, nombres `Verde`, `Rojo`, `Azul`, `Negro` y `Amarillo`, y `descripcion` con `[FICTICIO]`.
  - **10 afirmaciones**, 2 por color, con `[FICTICIO]` en el `texto`.

- [ ] **Step 1: Tests que fallan:**
  - `losCincoColoresConSusIds`
  - `descripcionesYAfirmacionesLlevanMarcaFicticio`
  - `cadaAfirmacionApuntaAUnColorExistente`
  - `cadaColorTieneAlMenosUnaAfirmacion`
  - `todoNuncaDaNadaEnTodos`
  - `mezclaDosColoresEnMucho`: las dos de rojo y las dos de amarillo en `A_MENUDO`, el resto `NUNCA` → rojo y amarillo `MUCHO`, los demás `NADA`.
  - `umbrales`: suma 1 → `ALGO`, 2 → `ALGO`, 3 → `MUCHO`.
  - `ordenDeDefinicion`
  - `respuestasIncompletasLanzan`: con 9 de 10, la excepción nombra la que falta.
  - `afirmacionInexistenteLanza`
  - `determinista`: las mismas respuestas dan el mismo perfil, 100 veces.
- [ ] **Step 2:** ver el rojo por aserción, implementar y dejar `./mvnw test` en verde.
- [ ] **Step 3: Commit** `feat(ia): el perfil de colores del hijo lo calcula el servidor con una funcion determinista y contenido ficticio`

### Task 2: `GET /api/ia/tipo/preguntas` y `POST /api/ia/tipo/perfil`

**Files:**
- Create:
  - `.../ia/TipoController.java`
  - `.../ia/PreguntasPublicas.java`: record con `colores: [{id, nombre, descripcion}]` y `afirmaciones: [{id, texto}]`, **sin** `colorId`.
- Modify: `.../web/ManejadorDeErrores.java`, para que `RespuestasInvalidasException` dé 400 con `campos` (también si el JSON trae una frecuencia desconocida).
- Test: `backend/src/test/java/es/cookyourweb/points/ia/TipoControllerTest.java`, con `@WebMvcTest`, `@Import(SeguridadConfig.class)` y `@MockitoBean JwtDecoder`, como `identidad/YoControllerTest`.

**Interfaces:**
- `GET /api/ia/tipo/preguntas` → `200 PreguntasPublicas`.
- `POST /api/ia/tipo/perfil` con cuerpo `{ "respuestas": { "<afirmacionId>": "NUNCA|A_VECES|A_MENUDO" } }` → `200 { "colores": [{ "id", "nombre", "nivel": "NADA|ALGO|MUCHO" }] }`.
- Las dos rutas exigen token (401 sin él).

- [ ] **Step 1: Tests que fallan:**
  - `sinTokenDa401`, para las dos rutas.
  - `preguntasNoRevelanElMapa` (Review Focus 2): el JSON de `GET` no contiene `colorId`.
  - `perfilNoRevelaElMapa`: el JSON del perfil no contiene ids de afirmaciones.
  - `respuestasIncompletasDa400`, con `campos`.
  - `frecuenciaDesconocidaDa400` (Review Focus 1).
  - `perfilValidoDa200`.
- [ ] **Step 2:** ver el rojo, implementar y dejar los tests en verde.
- [ ] **Step 3: Commit** `feat(ia): afirmaciones y perfil de colores por la API sin que el navegador vea a que color apunta cada una`

### Task 3: la elección de cada adulto, en Mongo

**Files:**
- Create:
  - `.../ia/EleccionTipo.java`: record `@Document("eleccionesTipo")` con `@CompoundIndex(unique)` sobre `{familyId, hijoId, uid}`. Campos: `id`, `familyId`, `hijoId`, `uid`, `List<String> colores`, `String principal` (nullable) e `Instant elegidaEn`.
  - `.../ia/EleccionTipoRepository.java`
  - `.../ia/EleccionTipoService.java`
  - `.../ia/EleccionTipoController.java`
  - `.../ia/EleccionInvalidaException.java`, que da 400.
- Modify: `.../config/IndicesMongo.java`, para crear también este índice único.
- Test: `.../ia/EleccionTipoServiceTest.java`, `.../ia/EleccionTipoControllerTest.java` y `.../ia/EleccionTipoIntegracionTest.java` (Testcontainers).

**Interfaces:**
- Consumes: `AccesoFamilia.requireMember` (sesión 3) y `TipoService.esColorValido`.
- `PUT /api/familias/{familyId}/hijos/{hijoId}/tipo` con cuerpo `{ "colores": ["rojo","amarillo"], "principal": "rojo" | null }` → `200 { colores, principal, elegidaEn }`.
  - Crea o sustituye **la elección del propio adulto**. Es idempotente.
  - Los colores se guardan ordenados según se definen los colores, para poder comparar.
- `GET` en la misma ruta → `200 { "elecciones": [{ "uid", "colores", "principal", "elegidaEn", "esMia": bool }], "coinciden": bool }`.

- [ ] **Step 1: Tests que fallan:**
  - `guardaLaDelAdulto`
  - `sustituyeNoDuplica`: dos PUT dejan una sola elección.
  - `variosColoresSinPrincipal`
  - `eleccionInvalidaDa400` (Review Focus 5): lista vacía, color inexistente, repetidos, o principal que no está entre los marcados.
  - `otraFamiliaDa404` (Review Focus 3), en el servicio y en el test de integración, con una segunda cuenta para PUT y GET.
  - `coincidenFalsoSiDifiereElPrincipal` (Review Focus 4)
  - `coincidenFalsoSiDifiereElConjunto`
  - `coincidenVerdaderoAunqueElOrdenDelCuerpoCambie`
  - `noPuedeEscribirLaDeOtroAdulto`: el `uid` sale del token, nunca del cuerpo.
- [ ] **Step 2:** ver el rojo, implementar y dejar `./mvnw test` en verde.
- [ ] **Step 3: Commit** `feat(ia): cada adulto guarda por separado los colores que reconoce en su hijo y solo dentro de su familia`

### Task 4: la pantalla "Descubrir sus colores"

**Files:**
- Create: `src/services/coachService.ts`, con `getPreguntasTipo()`, `pedirPerfil(respuestas)`, `guardarEleccionTipo(familyId, hijoId, { colores, principal })` y `getEleccionesTipo(familyId, hijoId)`, todo con `apiFetch`.
- Create: `src/components/tipo/DescubrirTipo.tsx`. Flujo de la pantalla:
  1. Cada afirmación es un grupo accesible de tres opciones: Nunca, A veces o A menudo.
  2. Botón "Ver perfil".
  3. Se muestran los cinco colores, cada uno con su nivel en palabras y su descripción.
  4. El adulto marca los colores que reconoce. Vienen premarcados los que salieron "algo" o "mucho", y puede marcar o desmarcar cualquiera.
  5. Opcionalmente elige el principal entre los marcados.
  6. Botón "Guardar mi elección".
  7. Se muestran las elecciones de los adultos. Si no coinciden, aparece un aviso neutro: "No coincidís: es un buen punto para hablarlo".
- Modify: la ficha del hijo en el panel (donde hoy se muestran los `tiposAdolescente`), para que abra `DescubrirTipo`.
- Modify: `package.json` (devDependency `vitest-axe`) y el setup de vitest si hace falta.
- Test: `src/__tests__/coachService.test.ts`, `src/__tests__/DescubrirTipo.test.tsx`

**Interfaces:**
- Consumes: Tasks 2 y 3; `apiFetch` y `ErrorHttp` (sesión 2); `useSesion`, para el `uid` y la familia.

- [ ] **Step 1: Tests que fallan:**
  - Del servicio: rutas, métodos y cuerpos exactos.
  - De la pantalla, con `coachService` mockeado:
    - `noDejaPedirSinResponderTodo`: botón deshabilitado o mensaje.
    - `muestraLosCincoColoresConSuNivel`
    - `premarcaAlgoYMucho`
    - `elAdultoPuedeCambiarLaMezcla`: guarda lo marcado, no lo que dio el perfil.
    - `principalSoloEntreLosMarcados`
    - `muestraDiferenciasSinDecidir` (Review Focus 4): con dos elecciones distintas, aparece el aviso y se ven las dos, sin marcar ninguna como "la buena".
    - `sinViolacionesDeAccesibilidad` (`vitest-axe`)
    - `errorDeRedSeMuestra`
- [ ] **Step 2:** ver el rojo, implementar con los componentes de `src/components/ui/` y dejar en verde `npm run lint`, `npm run typecheck` y `npx vitest run`.
- [ ] **Step 3: Commit** `feat(ui): pantalla para descubrir la mezcla de colores del hijo con el perfil del servidor y la eleccion del adulto`

### Task 5: demo (la dueña con el controlador)

- [ ] Levantar Mongo, el backend (con `FIREBASE_PROJECT_ID`) y `npm run dev`.
- [ ] En la ficha de un hijo: responder, ver el perfil, cambiar la mezcla, elegir un principal y guardar.
- [ ] Con una segunda cuenta adulta de la misma familia (si existe), marcar otra mezcla y comprobar que aparece el aviso de que no coinciden.
- [ ] Actualizar `MEMORY.md`, el log de sesiones y `docs/APRENDER-ARQUITECTURA.md`, con estos temas:
  - Puerto y adaptador.
  - Función pura determinista.
  - Por qué el mapa no sale del servidor.
  - Perfil frente a etiqueta única.
  - Contenido ficticio.
- [ ] Pendiente de la dueña: escribir las afirmaciones reales (en Firestore, no en el repo) para el adaptador real.
