# Sesión 3 (S3): propiedad en `task/` — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que una cuenta solo vea y toque las tareas de las familias a las que pertenece, comprobado en el servidor en cada petición.

**Architecture:** nuevo feature `familia/` con `Membresia(uid, familyId, papel, estado)` en Mongo (índice único `(uid, familyId)`) y una sola función `requireMember(uid, familyId)`. `TaskService` recibe el `uid` del token en sus cinco operaciones y la llama; si no eres miembro, **404** (no se revela si la familia o la tarea existen). `createdBy` sale del token, nunca del cuerpo. La membresía de la familia de la dueña se crea con un script; las altas nuevas la tendrán con las invitaciones (S4).

**Tech Stack:** Java 17, Spring Boot 4.1, Spring Data MongoDB, Testcontainers (Mongo), JUnit 5.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` — §1 principio 2, §3 (`Membresia`), §4 "Propiedad en `task/`", §8 fila "3. Propiedad (S3)", §10 "404 entre familias, 403 por papel… Un test recorre todas las rutas con una segunda cuenta".

## Global Constraints

- Demo (§8): **una segunda cuenta no ve ni toca las tareas de la primera**.
- **404 entre familias** (§10): nunca 403 cuando no eres de la familia; el 403 queda para papeles dentro de la misma familia (no hay papeles todavía).
- **Una sola función** `requireMember(uid, familyId)` para todo el backend (§10).
- El `uid` sale **solo** del JWT verificado (`@AuthenticationPrincipal Jwt` → `sub`). Nada de autorización viaja en el cuerpo ni en la URL (§1.2).
- `Membresia` con **índice único `(uid, familyId)`** (§3).
- **1 test de integración con Testcontainers** que recorre las 5 rutas de `task/` con una segunda cuenta (§8, §10).
- Repo público: ningún `uid`, `familyId` ni email real en ficheros versionados; el script los recibe como argumentos.
- Repo: TDD estricto (rojo por aserción), un commit por tarea en español con el porqué, **sin Co-Authored-By ni atribución a IA**, sin push, sin desplegar. `git log --oneline -5 -- <ruta>` antes de editar. Verificación: `cd backend && ./mvnw test`; al final también `npm run lint`, `npm run typecheck`, `npx vitest run`.
- Gotcha conocido (application.properties): en Boot 4 varias propiedades de Mongo cambiaron de `spring.data.mongodb.*` a `spring.mongodb.*` y la vieja **se ignora sin avisar**. Cualquier propiedad nueva (p. ej. creación automática de índices) se verifica con un test, no a ojo.

## Rulings tomados al escribir el plan

- **`createdBy` deja de ser obligatorio en el cuerpo** (se quita su `@NotBlank`): lo pone el servidor con el `uid` del token. Si un cliente lo manda, se ignora. Coste si es incorrecto: volver a poner la validación.
- **Cuentas nuevas sin membresía** reciben 404 en tareas personalizadas hasta S4 (invitaciones / crear familia). Se declara como límite; la demo es con la familia de la dueña, sembrada por script. Coste: las cuentas de prueba nuevas no usan esa pestaña hasta S4.
- **`papel` y `estado`** como enums mínimos (`ADULTO`; `ACTIVA`) — solo lo que S3 usa. `etiqueta` no entra todavía (YAGNI).

## Review Focus

1. **Tarea de otra familia por id** (`GET/PUT/DELETE /api/tasks/{id}`): debe dar 404 igual que una que no existe, sin filtrar que existe. → Task 2 y Task 3.
2. **`PUT` que intenta mover la tarea a otra familia** cambiando `familyId` en el cuerpo: la tarea se queda en su familia original (ya lo hace `actualizadaDesde`; debe seguir así). → test en Task 2.
3. **`POST` con `familyId` de una familia ajena**: 404, y no se guarda nada. → Task 2 y Task 3.
4. **`POST` con `createdBy` falso en el cuerpo**: se guarda el `uid` del token. → Task 2.
5. **Membresía duplicada** (el script se ejecuta dos veces): no crea dos documentos. → Task 3 (índice único) y Task 4 (upsert).

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

### Task 4: script de membresía para la familia de la dueña

**Files:**
- Create: `backend/scripts/sembrar-membresia.sh` (ejecutable)
- Modify: `docs/LEVANTAR-EN-LOCAL.md` (cómo y por qué)

**Interfaces:**
- `backend/scripts/sembrar-membresia.sh <uid> <familyId>`: falla con uso si falta algún argumento o está en blanco; hace `docker exec points-mongo mongosh points --quiet --eval ...` con un **upsert** sobre `membresias` filtrando por `{uid, familyId}` y `$setOnInsert` de `papel: "ADULTO"`, `estado: "ACTIVA"`, `creadaEn: new Date()`, `_class` igual al que escribe Spring (`es.cookyourweb.points.familia.Membresia`). Los argumentos se pasan a mongosh sin interpolarlos en el código JS (p. ej. por variables de entorno `-e` del `docker exec` y `process.env` en el `--eval`), para que un valor con comillas no rompa ni inyecte nada.

- [ ] **Step 1:** test manual documentado en el informe: sin argumentos → sale con código ≠ 0 y el uso; dos ejecuciones con los mismos valores de prueba (`uid-prueba`, `familia-prueba`) → `db.membresias.countDocuments({uid:"uid-prueba"})` = 1; después borrar ese documento de prueba.
- [ ] **Step 2:** implementar y documentar en `LEVANTAR-EN-LOCAL.md`.
- [ ] **Step 3: Commit** `chore(api): script para dar de alta la membresia de una familia mientras no existan las invitaciones`

### Task 5: prueba de punta a punta (la dueña con el controlador)

- [ ] Reiniciar el backend con `FIREBASE_PROJECT_ID`.
- [ ] Sembrar la membresía de la cuenta de la dueña con el script (uid y familyId leídos en el momento, no escritos en ningún fichero).
- [ ] Con esa cuenta: la pestaña de tareas personalizadas carga (200) y se puede crear una tarea.
- [ ] Con la cuenta de prueba nueva (sin membresía): la misma pestaña recibe 404 de la API.
- [ ] `MEMORY.md`, `docs/APRENDER-ARQUITECTURA.md` (autorización vs autenticación, por qué 404 y no 403, índice único, Testcontainers) y log de sesiones.
