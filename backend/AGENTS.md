# Instrucciones para `backend/` — API points-api

Java 17 + Spring Boot 4.1 + MongoDB. Maven wrapper, sin Maven global.
Código en `es.cookyourweb.points`, organizado por feature:

- `task/` — dominio de tareas: `Task` (record), `TaskController`, `TaskRepository`, `TaskService`, `TaskNotFoundException`
- `web/` — `ManejadorDeErrores` (`@RestControllerAdvice`)
- `config/` — `CorsConfig`, `ClockConfig`
- pruebas espejo en `backend/src/test/java/es/cookyourweb/points/**`

## Comandos

- `./mvnw spring-boot:run` — API en http://localhost:8080 (puerto por defecto;
  `application.properties` no hay override).
- `./mvnw --batch-mode test` — 153 tests (19-nov-2026). `PropiedadIntegracionTest`
  necesita **Docker** (Testcontainers levanta su propio Mongo); el resto pasa sin
  Mongo levantado. Con la conexión caida el log escupe una traza `ConnectException`
  del monitor de conexión de Mongo: es ruido conocido, no un fallo del test.

Ojo con el arranque: Tomcat dice "Started" aunque Mongo esté caído y **no se
reconecta solo** — si levantas Mongo después, hay que reiniciar el backend.
Mongo se levanta con Docker (`docker start mongo-points`, el 27017; ver
`docs/LEVANTAR-EN-LOCAL.md`).

## Lo que un agente erraría

- **La propiedad de Mongo es `spring.mongodb.uri`, NO `spring.data.mongodb.uri`.**
  En Spring Boot 4 la antigua se ignoró sin avisar: la app arranca, guarda y lee,
  pero cae en el fallback `mongodb://localhost/test` — escribiendo en OTRA base,
  sin ningún error. Síntoma: "todo funciona" y los datos no están donde pensás.
- **Credenciales por variable de entorno, nunca en `application.properties`**:
  el fichero está versionado y el repo es público.
  `SPRING_MONGODB_URI='mongodb+srv://...' ./mvnw spring-boot:run`
- **`Task` es un `record` inmutable.** Una tarea no se muta a trozos: se
  reemplaza entera con `PUT`.
- `actualizar()` ignora `familyId` y `createdBy` **a propósito** aunque lleguen
  en la petición: una tarea no cambia de familia. No lo relajes ni en el
  controller ni en el record completo.
- El `Clock` está inyectado (`config/ClockConfig`), los tests fijan el instante.
  No llames `Instant.now()` dentro del servicio.
- Los errores van centralizados en `ManejadorDeErrores`: tarea inexistente →
  404, validación → 400 con la lista de fallos. Formato `ProblemDetail`
  (RFC 7807). No captures excepciones dentro del controller ni inventes códigos.
- JSON de salida camelCase y SIN campos nulos (`non_null`): el frontend ya
  recibe esa forma. No traduzcas campos en el controller.
- **Errores sin fuga (CWE-209)**: nunca devolver `e.getMessage()` de algo que pueda venir de
  una libreria. Lo inesperado sale generico con `idError` y el detalle va al log con ese id.
  El catch-all de `ManejadorDeErrores` relanza las excepciones del framework (`ErrorResponse`,
  seguridad...) para no convertir un 400/404/405/401/403 en 500.
- **Topes de entrada (CWE-770)**: `@Size` en cada DTO (nombre 50 y description 200 = los
  `maxLength` del formulario) y cuerpo maximo 16 KB → 413 (`web/LimiteDeCuerpoFiltro`).
  `FormContentFilter` y multipart estan APAGADOS en `application.properties`: corrian antes
  de la seguridad y leian el cuerpo entero sin tope. Ningun endpoint usa formularios ni
  subidas; si alguno los necesita, hay que volver a acotar esa lectura.
- `Retry-After` va en `exposedHeaders` de `CorsConfig`; sin eso el frontend lee null.
- **Tope de peticiones (CWE-799)**: POST/PUT en `/api/ia/**`, 5 cada 10 min por `sub` → 429
  con `Retry-After` (`config/LimiteIaConfig`). En memoria = por instancia: en Lambda con N
  instancias el tope real es N×5. `LimiteIaConfig` NO es `WebMvcConfigurer` a proposito
  (`@WebMvcTest` lo cargaria en cada test y pediria un `Clock`).
- CORS solo desde `http://localhost:5173`, configurable vía
  `app.cors.origenes-permitidos`; el preflight lo vigila el test `CorsTest`.
  El frontend Vite es `strictPort` por diseño (falla si el 5173 está ocupado
  en vez de cambiar de puerto).

## API (lo que expone hoy el controller)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET /api/tasks?familyId=&soloActivas=` | lista de tareas de una familia |
| `GET /api/tasks/{id}` | una tarea |
| `POST /api/tasks` | crear → `201` |
| `PUT /api/tasks/{id}` | reemplazo completo |
| `DELETE /api/tasks/{id}` | borrar → `204` |
| `GET /api/ia/tipo/preguntas` | colores y afirmaciones `{id, texto}`, sin el color al que apunta cada una |
| `POST /api/ia/tipo/perfil` | respuestas → nivel por color (`id`, `nombre`, `nivel`); `400` con `campos` `{id: motivo}` |
| `PUT /api/familias/{f}/hijos/{h}/tipo` | el adulto guarda sus colores (+ principal opcional); `400` con `campos` `{campo: motivo}` |
| `GET /api/familias/{f}/hijos/{h}/tipo` | elecciones de la familia sobre ese hijo y si coinciden |
| `GET /api/familias/{f}/hijos/{h}/deberes` | deberes del hijo (`?soloActivos=`) |
| `POST /api/familias/{f}/hijos/{h}/deberes` | crear un deber → `201`; `409` si la `clave` ya existe |
| `PUT /api/familias/{f}/hijos/{h}/deberes/{id}` | actualizar o archivar un deber |
| `PUT /api/familias/{f}/hijos/{h}/importaciones-deberes` | anota la fecha de la última importación |
| `GET /api/familias/{f}/hijos/{h}/importaciones-deberes` | cuándo fue la última importación |
