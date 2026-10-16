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
- `./mvnw --batch-mode test` — 11 tests. **Pasa sin Mongo levantado** (verificado
  16-oct-2026: BUILD SUCCESS con Mongo apagado). Con la conexión caida el log
  escupe una traza `ConnectException` del monitor de conexión de Mongo: es
  ruido conocido, no un fallo del test.

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
