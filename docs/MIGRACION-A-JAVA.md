# Migración de Firestore a una API propia en Java

**Iniciada el 31 de julio de 2026.**

Este documento es el mapa de la migración: de dónde viene el proyecto, qué se ha
hecho ya, y qué falta. Si vuelves en tres meses, empieza por aquí.

---

## Por qué

El frontend habla directamente con Firestore desde `src/services/`. Eso funciona,
pero ata el producto a un proveedor y deja toda la lógica de negocio en el cliente:
cualquiera con la consola del navegador abierta ve las reglas y puede saltárselas.

La migración persigue dos cosas a la vez:

1. **Producto.** Mover las reglas al servidor, donde no se pueden manipular.
2. **Portfolio.** Un sistema full-stack Java + React verificable, que es lo que piden
   las ofertas a las que se está aplicando (Duetto pide Java/Spring Boot con
   TypeScript/React; eDreams trabaja también con Java).

---

## La estrategia: incremental, nunca big bang

**No se reescribe nada. Los dos backends conviven** y se migra endpoint por endpoint.

Es exactamente el patrón de la migración de Vue a React en ALD Automotive: la
plataforma seguía viva y entregando mientras se movía pieza a pieza. Un big bang
aquí significaría dejar la app rota durante semanas.

```
HOY                              DESTINO
componentes React                componentes React      (sin cambios)
      ↓                                ↓
src/services/*.ts                src/services/*.ts      (cambia el interior)
      ↓                                ↓
   Firestore                      API Spring Boot
                                        ↓
                                     MongoDB
```

**La clave de que esto sea barato**: los componentes nunca llamaron a Firestore
directamente. Llaman a `fetchTasks()`, `addCustomTask()`, `updateCustomTask()`. La
dependencia de Firebase está encerrada en seis ficheros de `src/services/`.

Eso ya es arquitectura hexagonal: el puerto está construido. Solo hay que escribir
otro adaptador.

---

## Estado actual

### Hecho

**Frontend saneado (31-jul-2026).** Venía con 22 errores de TypeScript y sin
compilar. Ahora `tsc --noEmit` da 0, `npm run build` pasa y los 3 tests están en
verde.

De esos 22 errores, 21 eran **una línea de import que faltaba** en
`TaskManagement.tsx`: usaba `CustomTask`, `getTasksByFamily`, `addCustomTask`,
`updateCustomTask` y `deleteCustomTask` sin importarlos, y los cinco llevaban
escritos y exportados desde el principio en `services/customTaskService.ts`. Los
otros 7 eran tipos que se habían quedado atrás mientras el código avanzaba.

**Backend, primera rodaja vertical (31-jul-2026).** `backend/`, Spring Boot 4.1 con
Java 17 y Spring Data MongoDB. El dominio `Task` completo de punta a punta:

| Fichero | Qué es |
|---|---|
| `task/Task.java` | La entidad. Un `record`, inmutable |
| `task/TaskType.java` | Enum que serializa `'diarias' \| 'extra'` |
| `task/TaskRepository.java` | Interfaz. Spring Data genera la implementación |
| `task/TaskService.java` | Las reglas de negocio |
| `task/TaskController.java` | Las rutas HTTP |
| `web/ManejadorDeErrores.java` | Excepciones a respuestas HTTP, en un solo sitio |
| `config/ClockConfig.java` | El reloj, inyectable |

Verificado contra Mongo real, no solo con tests:

```
POST   /api/tasks              201, con id y fechas selladas
GET    /api/tasks?familyId=    200, filtrado por familia
PUT    /api/tasks/{id}         200, conservando familyId, createdBy y createdAt
DELETE /api/tasks/{id}         204
                               400 con el detalle por campo
                               404 cuando no existe
```

7 tests Java en verde.

### Pendiente

- [ ] **Conectar el frontend.** Cambiar `customTaskService.ts` para que llame a
      `localhost:8080` en vez de a Firestore. Es el momento en que esto deja de ser
      un backend suelto y pasa a ser una migración de verdad.
- [ ] **CORS.** Sin configurarlo, el navegador bloqueará las llamadas de `:5173` a
      `:8080`. Es lo primero que va a fallar.
- [ ] **Autenticación.** Hoy la API está abierta: cualquiera puede pedir las tareas
      de cualquier familia. Es la pieza más grande que queda.
- [ ] Resto de dominios: `Privilege`, `Family`, `Reward`.
- [ ] Migrar los datos que ya existen en Firestore.
- [ ] Desplegar en algún sitio.

---

## Decisiones tomadas, y por qué

**MongoDB y no SQL.** Firestore es documental. Portar a Mongo mantiene la forma de
los datos y evita rediseñar el modelo a la vez que se cambia de tecnología. Una cosa
cada vez.

**Los nombres de campo son idénticos a los de TypeScript.** `nombre`, `tipo`,
`puntos`, `familyId`, `createdBy`, `isActive`. El JSON que devuelve la API es el
mismo objeto que el frontend ya maneja. Sin capa de traducción, sin sorpresas.

**`Task` es un `record` inmutable, no una clase con setters.** Una tarea no se muta
a trozos: se reemplaza entera. Así es imposible dejarla a medias.

**El `Clock` se inyecta.** Si el servicio llamara a `Instant.now()` por dentro,
ningún test podría afirmar nada sobre `createdAt` ni `updatedAt`. Con el reloj
inyectado, los tests lo fijan y lo comprueban de verdad.

**`actualizar()` ignora `familyId` y `createdBy` si vienen del cliente.** Una tarea
no cambia de familia ni de autor. Sin esa regla, cualquiera con el id de una tarea
podría moverla a su familia. Está comprobado en un test.

**Errores como `ProblemDetail` (RFC 7807).** El cliente recibe siempre la misma
forma, venga el error de donde venga, con la lista de campos que fallan y por qué.

**Sin Lombok.** Reduce líneas pero añade magia. En un proyecto que también sirve para
aprender Java a fondo, entender lo que hay escrito vale más que escribir menos.

---

## Cómo levantarlo

```bash
# 1. Mongo
docker run -d --name points-mongo -p 27017:27017 -v points-mongo-data:/data/db mongo:7

# 2. API (descarga Maven la primera vez)
cd backend && ./mvnw spring-boot:run          # localhost:8080

# 3. Frontend
npm run dev                                    # localhost:5173
```

Comprobar que la API está viva: `curl localhost:8080/actuator/health`

No hace falta instalar Maven: el proyecto trae el wrapper (`mvnw`).

---

## Aviso sobre el `.env`

El repo es **público**. El `.gitignore` ya excluye `.env`, pero no lo hacía hasta el
31-jul-2026. Si en algún momento se commiteó, hay que rotar las claves de Firebase.

---

## Rama de respaldo

`respaldo/vista-hijo-solo-lectura` guarda 670 líneas de trabajo sobre la vista del
hijo (permisos de solo lectura, enlace compartido) que llevaban un año solo en local
y sin subir. **Esa versión no compila**: el componente nuevo quedó pegado detrás del
viejo, con 610 líneas de JSX colgando después del `export default`. Está guardada
para no perderla, no para integrarla tal cual.
