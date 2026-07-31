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

**Frontend conectado a la API (31-jul-2026).** `customTaskService.ts` ya no habla con
Firestore: habla con `localhost:8080`. Los componentes no han cambiado ni una línea,
porque nunca supieron de dónde venían los datos.

Y funcionó como decía el plan: la dependencia de Firebase estaba encerrada en el
servicio, así que migrar fue escribir otro adaptador, no reescribir la aplicación.
Un solo componente importa este servicio, `TaskManagement.tsx`, y usa cuatro funciones.

Tres cosas que aparecieron al conectar:

| Qué | Por qué importaba |
|---|---|
| `createdAt` y `updatedAt` pasan de `Timestamp` de Firestore a `string` ISO-8601 | Ningún componente las leía, así que no rompió nada. Si las hubiera leído, habría fallado al llamar a `.toDate()` |
| `updateCustomTask` recibe la tarea entera, no un parcial | El `PUT` reemplaza el registro completo porque `Task` es un `record` inmutable. Los dos sitios que la llaman ya mandaban el objeto entero |
| `toggleMultipleTasksStatus` ahora lee antes de escribir | Mandaba solo `{ isActive }`. Contra la API eso sería un 400 por nombre en blanco |

**Dos funciones eliminadas**, ninguna con consumidores:

- `fetchCustomTasks()` devolvía **las tareas de todas las familias**. En un sistema
  con datos de menores eso no es una función que falte migrar: es una que no debía
  existir. No tiene equivalente en la API y no lo va a tener.
- `getTasksByCreator()` no tiene ruta en el controlador. El repositorio sí tiene
  `findByCreatedBy`, así que el día que haga falta son cuatro líneas.

**CORS configurado (31-jul-2026).** `config/CorsConfig.java`, con 4 tests.

Los orígenes se declaran uno a uno en vez de abrir con `*`, y se leen de
`application.properties` para que producción no dependa de recompilar. Hay un test
que comprueba que un origen desconocido recibe **403**: sin él, el día que alguien
escriba `*` para salir del paso, nada avisaría.

**Circuito completo verificado contra el servidor real (31-jul-2026).** No solo con
tests: con Mongo levantado, la API corriendo y la cabecera `Origin` en cada llamada,
igual que la manda el navegador.

```
OPTIONS preflight     200  Allow-Origin, Allow-Methods, Max-Age 3600
OPTIONS origen ajeno  403
POST   /api/tasks     201  id y fechas puestas por el servidor
GET    ?familyId=     200  filtrado por familia
PUT    /{id}          200  createdAt conservado, updatedAt refrescado
DELETE /{id}          204  y 404 al volver a pedirla
                      400  con el detalle por campo
```

Y la prueba real encontró un fallo que los tests no veían.

El adaptador se quedaba con el `detail` del `ProblemDetail`, pero en un 400 de
validación ese `detail` es genérico: *"hay campos que no cumplen las reglas"*. El
motivo de verdad viaja en la propiedad `campos`. Quien rellenaba el formulario veía
un mensaje que no le decía qué arreglar.

El mock del test tenía un `detail` específico que la API nunca devuelve. Es
exactamente el fallo contra el que avisaba el comentario de ese mismo fichero:
funcionar contra un mock que acepta cualquier cosa y romperse contra la API. Los
tests nuevos usan el cuerpo copiado del servidor.

**Es la segunda vez en el proyecto que un test verde no probaba nada.** La primera
fue el de métodos CORS, que pasaba sin la configuración puesta porque Spring
responde 200 al `OPTIONS` por defecto. La regla que queda: si un test pasa antes de
escribir la funcionalidad, el test está roto.

**Eliminada una copia duplicada del servicio (31-jul-2026).**

`src/components/FamilyPointsOverview.tsx` no era un componente: era una copia entera
de `customTaskService`, con las mismas 9 funciones, guardada con nombre de componente
en julio de 2025. Seguía hablando con Firestore.

Y tenía consumidor. `usePointsManagement` importaba `getActiveTasksByFamily` de ahí,
y ese hook lo usa `ChildView`. Así que al migrar `customTaskService` la aplicación se
quedó con dos fuentes de verdad para las mismas tareas:

```
TaskManagement  ->  customTaskService    ->  API Java  ->  Mongo
ChildView       ->  usePointsManagement  ->  la copia  ->  Firestore
```

Se creaba una tarea desde el panel y la vista del hijo no la veía.

**El fallo no lo introdujo la copia: lo introdujo migrar sin buscarla.** Llevaba más
de un año sin molestar porque las dos rutas iban a Firestore y coincidían. Migrar una
y no la otra es lo que las puso a discrepar.

Lo encontró una pregunta, no una herramienta: *"¿seguro que eso no era para algo?"*.
La comprobación previa buscó quién importaba `customTaskService` y respondió "un solo
fichero". Era cierto, y era la pregunta equivocada: nadie preguntó si existía **otra
copia del mismo servicio con otro nombre**.

Quedan `docs/arquitectura` en forma de tests (`src/__tests__/arquitectura.test.ts`):
cada operación de tareas se exporta desde un único fichero, `customTaskService` no
importa firebase, y ningún fichero de `components/` exporta funciones de acceso a
datos sin ser un componente.

Un test de comportamiento no habría detectado nada: **las dos copias funcionaban. Lo
que fallaba era que hubiera dos.**

### Pendiente

- [ ] **Probarlo en el navegador.** Falta abrir la aplicación y crear una tarea de
      verdad desde la interfaz, y comprobar que la vista del hijo la ve. El circuito
      HTTP está verificado; la pantalla no.
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
