# Sesión 3 (S3): propiedad en `task/` — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que una cuenta solo vea y toque las tareas de las familias a las que pertenece, comprobado en el servidor en cada petición.

**Architecture:** nuevo feature `familia/` con `Membresia(uid, familyId, papel, estado)` en Mongo (índice único `(uid, familyId)`) y una sola función `requireMember(uid, familyId)`. `TaskService` recibe el `uid` del token en sus cinco operaciones y la llama; si no eres miembro, **404** (no se revela si la familia o la tarea existen). `createdBy` sale del token, nunca del cuerpo. **La membresía se obtiene sola**: `POST /api/membresias/yo` lee en Firestore, **con el token de la propia persona**, su documento `usuarios/{uid}` y crea la membresía para el `familyId` que dice Firestore (nunca uno que mande el navegador). Es seguro porque las reglas desplegadas en la sesión 1 impiden crearse un usuario en una familia ajena y cambiar `familyId` después. El `AuthProvider` la pide una vez cuando el perfil está `listo`.

**Tech Stack:** Java 17, Spring Boot 4.1, Spring Data MongoDB, Testcontainers (Mongo), JUnit 5.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` — §1 principio 2, §3 (`Membresia`), §4 "Propiedad en `task/`", §8 fila "3. Propiedad (S3)", §10 "404 entre familias, 403 por papel… Un test recorre todas las rutas con una segunda cuenta".

## Global Constraints

- Demo (§8): **una segunda cuenta no ve ni toca las tareas de la primera**.
- **404 entre familias** (§10): nunca 403 cuando no eres de la familia; el 403 queda para papeles dentro de la misma familia (no hay papeles todavía).
- **Una sola función** `requireMember(uid, familyId)` para todo el backend (§10).
- El `uid` sale **solo** del JWT verificado (`@AuthenticationPrincipal Jwt` → `sub`). Nada de autorización viaja en el cuerpo ni en la URL (§1.2).
- `Membresia` con **índice único `(uid, familyId)`** (§3).
- **1 test de integración con Testcontainers** que recorre las 5 rutas de `task/` con una segunda cuenta (§8, §10).
- Repo público: ningún `uid`, `familyId`, id de proyecto ni email real en ficheros versionados.
- Repo: TDD estricto (rojo por aserción), un commit por tarea en español con el porqué, **sin Co-Authored-By ni atribución a IA**, sin push, sin desplegar. `git log --oneline -5 -- <ruta>` antes de editar. Verificación: `cd backend && ./mvnw test`; al final también `npm run lint`, `npm run typecheck`, `npx vitest run`.
- Gotcha conocido (application.properties): en Boot 4 varias propiedades de Mongo cambiaron de `spring.data.mongodb.*` a `spring.mongodb.*` y la vieja **se ignora sin avisar**. Cualquier propiedad nueva (p. ej. creación automática de índices) se verifica con un test, no a ojo.

## Rulings tomados al escribir el plan

- **`createdBy` deja de ser obligatorio en el cuerpo** (se quita su `@NotBlank`): lo pone el servidor con el `uid` del token. Si un cliente lo manda, se ignora. Coste si es incorrecto: volver a poner la validación.
- **La membresía la crea el servidor verificando en Firestore** (decisión de la dueña, 14-nov: "quien crea la familia tiene que poder ser miembro"), en vez de un script. Sin Firebase Admin SDK (§4): se usa la API REST de Firestore con el **token de la persona**, así que las reglas de Firestore deciden qué puede leer. Coste si es incorrecto: una llamada de red más por cuenta y sesión; en S4 la creación de familias pasa a Java y esto se simplifica.
- **Errores de esa lectura:** Firestore responde 404/403, o el documento no tiene `familyId` → **404** "Familia no encontrada". Cualquier otro fallo (red, 5xx) → **502** con `ProblemDetail`, para no confundirlo con "no eres de la familia".
- **`papel` y `estado`** como enums mínimos (`ADULTO`; `ACTIVA`) — solo lo que S3 usa. `etiqueta` no entra todavía (YAGNI).

## Review Focus

1. **Tarea de otra familia por id** (`GET/PUT/DELETE /api/tasks/{id}`): debe dar 404 igual que una que no existe, sin filtrar que existe. → Task 2 y Task 3.
2. **`PUT` que intenta mover la tarea a otra familia** cambiando `familyId` en el cuerpo: la tarea se queda en su familia original (ya lo hace `actualizadaDesde`; debe seguir así). → test en Task 2.
3. **`POST` con `familyId` de una familia ajena**: 404, y no se guarda nada. → Task 2 y Task 3.
4. **`POST` con `createdBy` falso en el cuerpo**: se guarda el `uid` del token. → Task 2.
5. **Membresía duplicada** (`POST /api/membresias/yo` dos veces, o dos pestañas a la vez): no crea dos documentos. → Task 3 (índice único) y Task 4 (operación idempotente que tolera `DuplicateKeyException`).
6. **El navegador intenta elegir familia** mandando un `familyId` en el cuerpo de `POST /api/membresias/yo`: se ignora; solo cuenta lo que dice Firestore. → Task 4.

---

### Task 1: `familia/` con `Membresia` y `requireMember`

**Files:**
- Create: `backend/src/main/java/es/cookyourweb/points/familia/Membresia.java` (record, `@Document("membresias")`, `@CompoundIndex(def = "{'uid': 1, 'familyId': 1}", unique = true)`)
- Create: `.../familia/Papel.java` (enum `ADULTO`), `.../familia/EstadoMembresia.java` (enum `ACTIVA`)
- Create: `.../familia/MembresiaRepository.java`
- Create: `.../familia/AccesoFamilia.java` (`@Service`)
- Create: `.../familia/FamiliaNoEncontradaException.java`
- Modify: `backend/src/main/java/es/cookyourweb/points/web/ManejadorDeErrores.java` (nuevo handler → 404, título "Familia no encontrada")
- Test: `backend/src/test/java/es/cookyourweb/points/familia/AccesoFamiliaTest.java`

**Interfaces:**
- Produces: `record Membresia(@Id String id, String uid, String familyId, Papel papel, EstadoMembresia estado, Instant creadaEn)`; `MembresiaRepository.existsByUidAndFamilyIdAndEstado(String uid, String familyId, EstadoMembresia estado): boolean`; `AccesoFamilia.requireMember(String uid, String familyId): void` (lanza `FamiliaNoEncontradaException` si no hay membresía `ACTIVA`, o si `uid`/`familyId` son nulos o en blanco); `AccesoFamilia.esMiembro(String uid, String familyId): boolean`.

- [ ] **Step 1: Tests que fallan** (Mockito sobre el repositorio):
  - `miembroActivoPasa`: repo devuelve `true` → `requireMember("u1","f1")` no lanza.
  - `noMiembroLanza404`: repo `false` → `FamiliaNoEncontradaException`.
  - `familyIdEnBlancoLanzaSinConsultar`: `requireMember("u1"," ")` lanza y el repo **no** se llama.
  - `uidNuloLanzaSinConsultar`.
- [ ] **Step 2:** `./mvnw test -Dtest=AccesoFamiliaTest` → rojo por aserción.
- [ ] **Step 3:** implementar; handler 404 con `ProblemDetail`.
- [ ] **Step 4:** `./mvnw test` → verde.
- [ ] **Step 5: Commit** `feat(familia): requireMember decide si eres de una familia porque hasta ahora la API no lo comprobaba`

### Task 2: las cinco rutas de `task/` exigen ser de la familia

**Files:**
- Modify: `.../task/TaskController.java` (cada método recibe `@AuthenticationPrincipal Jwt jwt` y pasa `jwt.getSubject()`)
- Modify: `.../task/TaskService.java`
- Modify: `.../task/Task.java` (quitar `@NotBlank` de `createdBy`; `creada(String nuevoId, String creador, Instant ahora)` pone `createdBy = creador`)
- Test: `backend/src/test/java/es/cookyourweb/points/task/TaskServiceTest.java` (ajustar los existentes a las firmas nuevas sin debilitar sus aserciones)
- Test: `backend/src/test/java/es/cookyourweb/points/task/TaskControllerTest.java` (nuevo, `@WebMvcTest` + `@Import(SeguridadConfig.class)` + `@MockitoBean JwtDecoder` + `.with(jwt())`, como `identidad/YoControllerTest`)

**Interfaces:**
- Consumes: `AccesoFamilia.requireMember` (Task 1).
- Produces: `TaskService.deFamilia(String uid, String familyId)`, `activasDeFamilia(String uid, String familyId)`, `porId(String uid, String id)`, `crear(String uid, Task nueva)`, `actualizar(String uid, String id, Task cambios)`, `borrar(String uid, String id)`. Para `porId/actualizar/borrar`: se carga la tarea; si no existe **o** el `uid` no es miembro de `tarea.familyId()` → `TaskNotFoundException` (mismo 404, mismo mensaje).

- [ ] **Step 1: Tests que fallan** en `TaskServiceTest` (repos mockeados):
  - `listarFamiliaAjenaDa404`: `esMiembro` falso → `FamiliaNoEncontradaException`, repo de tareas no consultado.
  - `tareaAjenaPorIdEsComoNoExistir` (Review Focus 1): la tarea existe en `f2`, uid solo en `f1` → `TaskNotFoundException` con el mismo mensaje que una inexistente.
  - `crearEnFamiliaAjenaNoGuarda` (Review Focus 3): `save` nunca llamado.
  - `crearUsaElUidDelToken` (Review Focus 4): cuerpo con `createdBy="otro"` → guardada con `createdBy="u1"`.
  - `actualizarNoCambiaDeFamilia` (Review Focus 2): cuerpo con `familyId="f2"` → guardada con `familyId="f1"`.
  - `borrarAjenaDa404YNoBorra`.
- [ ] **Step 2: Tests que fallan** en `TaskControllerTest`: `GET /api/tasks?familyId=f1` con `jwt().jwt(j -> j.subject("u1"))` → el servicio recibe `"u1"`; `POST` sin `createdBy` en el cuerpo → 201 (ya no es 400).
- [ ] **Step 3:** `./mvnw test -Dtest='TaskServiceTest,TaskControllerTest'` → rojo por aserción.
- [ ] **Step 4:** implementar.
- [ ] **Step 5:** `./mvnw test` → verde (incluido `SeguridadIntegracionTest`; si su `POST` mal formado necesita ajuste por la firma nueva, que siga comprobando 400).
- [ ] **Step 6: Commit** `fix(api): las tareas solo las ve y toca quien es de su familia porque cualquier cuenta podia leer las de otra`

### Task 3: test de integración con Testcontainers — una segunda cuenta no ve nada

**Files:**
- Modify: `backend/pom.xml` (test: `spring-boot-testcontainers` y `org.testcontainers:mongodb` — verificá las coordenadas exactas de Boot 4.1 con context7; versiones gestionadas por el parent, sin fijar a mano)
- Create: `backend/src/test/java/es/cookyourweb/points/task/PropiedadIntegracionTest.java`
- Modify: `backend/src/main/resources/application.properties` solo si hace falta activar la creación automática de índices (con su comentario del porqué y el nombre de propiedad **verificado por el test**)

**Interfaces:**
- Consumes: Tasks 1-2. `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@Testcontainers` + `@Container @ServiceConnection MongoDBContainer`; `@MockitoBean JwtDecoder` que devuelve un `Jwt` con `sub` según el valor del Bearer (`"token-ana"` → `ana`, `"token-beto"` → `beto`); `app.firebase.project-id=proyecto-test`. Cliente HTTP: el mismo que `SeguridadIntegracionTest` (`java.net.http.HttpClient`).

- [ ] **Step 1: Test que falla** `segundaCuentaNoVeNiTocaNada`: sembrar `Membresia(ana, fA, ADULTO, ACTIVA)` con el repositorio real; `ana` crea una tarea en `fA` (201). Con `beto` (sin membresía en `fA`):
  - `GET /api/tasks?familyId=fA` → 404
  - `GET /api/tasks/{id}` → 404
  - `PUT /api/tasks/{id}` → 404, y la tarea sigue igual (releer con `ana`)
  - `DELETE /api/tasks/{id}` → 404, y la tarea sigue existiendo
  - `POST /api/tasks` con `familyId=fA` → 404, y `ana` sigue viendo una sola tarea
  - Y `ana` sí: `GET` lista 1 tarea con `createdBy == "ana"`.
- [ ] **Step 2: Test que falla** `membresiaDuplicadaRechazada` (Review Focus 5): guardar dos `Membresia(ana, fA)` → la segunda lanza `DuplicateKeyException`.
- [ ] **Step 3:** `./mvnw test -Dtest=PropiedadIntegracionTest` → rojo por aserción (antes de Task 2 ya estaría en verde, así que el rojo se comprueba revirtiendo temporalmente un `requireMember`; anótalo en el informe). El índice sí debe fallar en rojo si la creación automática está apagada.
- [ ] **Step 4:** lo mínimo para el verde (propiedad de índices si hace falta).
- [ ] **Step 5:** `./mvnw test` → verde (requiere Docker; en CI los runners de GitHub lo tienen).
- [ ] **Step 6: Commit** `test(api): una segunda cuenta recorre las cinco rutas de tareas y no ve ni toca nada de otra familia`

### Task 4: `POST /api/membresias/yo` crea tu membresía verificando en Firestore

**Files:**
- Create: `.../familia/PerfilFirestore.java` (interfaz: el puerto)
- Create: `.../familia/PerfilFirestoreRest.java` (adaptador con `RestClient`)
- Create: `.../familia/MembresiaController.java`
- Modify: `.../familia/AccesoFamilia.java` (o un `MembresiaService` en `familia/` si queda más claro: una sola clase decide)
- Create: `.../familia/ServicioExternoException.java` + handler en `ManejadorDeErrores` → 502
- Modify: `backend/src/main/resources/application.properties` (`app.firestore.url-base=https://firestore.googleapis.com/v1`, sobreescribible en tests)
- Test: `backend/src/test/java/es/cookyourweb/points/familia/PerfilFirestoreRestTest.java`, `.../familia/MembresiaControllerTest.java`, ampliar `AccesoFamiliaTest`

**Interfaces:**
- Consumes: `Membresia`, `MembresiaRepository` (Task 1); `app.firebase.project-id` (sesión 2).
- Produces:
  - `interface PerfilFirestore { Optional<String> familyIdDe(String uid, String tokenDeLaPersona); }` — `Optional.empty()` si Firestore responde 404 o 403 o el documento no trae `familyId`; lanza `ServicioExternoException` ante cualquier otro fallo.
  - `PerfilFirestoreRest`: `GET {url-base}/projects/{proyecto}/databases/(default)/documents/usuarios/{uid}` con `Authorization: Bearer <token de la persona>`; lee `fields.familyId.stringValue`. El `uid` va escapado en la ruta.
  - `asegurarMiMembresia(String uid, String token): Membresia` — pide el `familyId` a `PerfilFirestore`; si vacío → `FamiliaNoEncontradaException`; si ya hay membresía `(uid, familyId)` la devuelve; si no, la crea `ADULTO`/`ACTIVA`; si salta `DuplicateKeyException` (carrera entre dos pestañas) relee y devuelve la existente.
  - `POST /api/membresias/yo` (sin cuerpo; si llega uno, se ignora) → `200 {"familyId": "...", "papel": "ADULTO"}`. El token se toma de `jwt.getTokenValue()`.

- [ ] **Step 1: Tests que fallan** en `PerfilFirestoreRestTest` (servidor HTTP falso: `MockRestServiceServer` sobre el `RestClient.Builder`, o `com.sun.net.httpserver.HttpServer` del JDK — el que encaje sin dependencias nuevas):
  - `leeElFamilyIdConElTokenDeLaPersona`: responde `{"fields":{"familyId":{"stringValue":"f1"}}}` → `Optional.of("f1")`, y la petición llevó `Authorization: Bearer tok-ana` a `/projects/proyecto-test/databases/(default)/documents/usuarios/ana`.
  - `documentoInexistenteEsVacio` (404) y `sinPermisoEsVacio` (403) → `Optional.empty()`.
  - `sinCampoFamilyIdEsVacio`.
  - `errorDelServidorLanza502` (500) → `ServicioExternoException`.
- [ ] **Step 2: Tests que fallan** del servicio (puerto falso):
  - `creaLaMembresiaDeLaFamiliaQueDiceFirestore`.
  - `esIdempotente`: dos llamadas → una sola membresía (`save` una vez).
  - `sinFamiliaEnFirestoreDa404`.
  - `duplicadoPorCarreraDevuelveLaExistente`.
- [ ] **Step 3: Tests que fallan** en `MembresiaControllerTest` (`@WebMvcTest`, `@Import(SeguridadConfig.class)`, `@MockitoBean JwtDecoder`):
  - `sinTokenDa401`.
  - `ignoraElFamilyIdDelCuerpo` (Review Focus 6): cuerpo `{"familyId":"ajena"}` → el servicio recibe solo `uid` y token; respuesta con el `familyId` del puerto.
- [ ] **Step 4:** `./mvnw test` → rojo por aserción; implementar; verde.
- [ ] **Step 5: Commit** `feat(familia): la membresia se crea sola leyendo tu familia en Firestore con tu propio token, sin fiarse del navegador`

### Task 5: el frontend pide su membresía al entrar

**Files:**
- Modify: `src/services/identidadService.ts` (`asegurarMembresia(): Promise<{ familyId: string; papel: string }>` = `apiFetch` `POST /api/membresias/yo`)
- Modify: `src/auth/AuthProvider.tsx` (cuando `perfil.tipo === 'listo'` y hay `familyId`, llama **una vez por uid** a `asegurarMembresia`; un fallo se registra con `console.error` y no rompe la sesión)
- Test: `src/__tests__/identidadService.test.ts`, `src/__tests__/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` (sesión 2), `POST /api/membresias/yo` (Task 4).

- [ ] **Step 1: Tests que fallan:**
  - `asegurarMembresiaHacePost`: `apiFetch` llamado con `'/api/membresias/yo'` y `method: 'POST'`, sin `familyId` en el cuerpo.
  - `seAseguraUnaVezPorCuenta`: perfil `listo` emitido dos veces para `ana` → una sola llamada; cambio a `beto` con perfil `listo` → una llamada más.
  - `noSeLlamaSinFamilia`: perfil `sin-documento` o `listo` con `familyId` vacío → ninguna llamada.
  - `unFalloNoRompeLaSesion`: la llamada rechaza → la sesión sigue `autenticado` con perfil `listo`.
- [ ] **Step 2:** rojo por aserción; implementar; `npm run lint`, `npm run typecheck`, `npx vitest run` en verde.
- [ ] **Step 3: Commit** `feat(auth): al entrar se asegura la membresia de tu familia para que la API te deje ver tus tareas`

### Task 6: prueba de punta a punta (la dueña con el controlador)

- [ ] Reiniciar el backend con `FIREBASE_PROJECT_ID`.
- [ ] Entrar con la cuenta de la dueña: en Mongo aparece **una** membresía suya (`db.membresias.countDocuments`), la pestaña de tareas carga (200) y se puede crear una tarea con `createdBy` = su uid.
- [ ] Registrar una cuenta nueva: obtiene su membresía sola y su pestaña de tareas funciona, sin ver las tareas de la otra familia.
- [ ] `MEMORY.md`, `docs/APRENDER-ARQUITECTURA.md` (autorización vs autenticación, por qué 404 y no 403, índice único, Testcontainers, verificar con el token de la persona en vez de fiarse del navegador) y log de sesiones.
