# Sistema de puntos familiar

Una plataforma para que las familias acuerden tareas, puntos y privilegios con sus
hijos adolescentes, y para que los hijos vean su progreso sin depender de que
alguien se lo recuerde.

Los padres definen las tareas y lo que vale cada una. Los hijos las completan y
acumulan puntos. Al llegar a cierto umbral se desbloquean privilegios, y cada hijo
tiene un enlace propio de solo lectura para consultar su marcador.

Nació de un problema doméstico real y se ha convertido en el proyecto donde pruebo
decisiones de arquitectura de punta a punta.

---

## Con qué está hecho

**Frontend**
React 18 · TypeScript · Vite · React Router · Tailwind · Vitest y Testing Library

**Backend**
Java 17 · Spring Boot 4.1 · Spring Data MongoDB · Bean Validation · JUnit 5 y Mockito

**Datos y servicios**
MongoDB · Firebase (Auth y Firestore, en migración)

---

## Arquitectura, y por qué está a medio camino

El backend original es Firestore, con el frontend hablando directamente con él.
Ahora se está migrando a una API propia en Spring Boot. **Los dos conviven**: se
migra endpoint por endpoint, sin reescribir nada y sin parar la aplicación.

```
componentes React
       |
src/services/*.ts        <- la unica capa que sabe de donde vienen los datos
       |                                    |
   Firestore                        API Spring Boot
   (lo que queda)                          |
                                        MongoDB
```

Que esto sea barato no es casualidad. Los componentes nunca llamaron a Firestore
directamente: llaman a `fetchTasks()`, `addCustomTask()`, `updateCustomTask()`. Toda
la dependencia del proveedor está encerrada en seis ficheros de `src/services/`.

El puerto ya estaba construido. La migración consiste en escribir otro adaptador.

Es el mismo enfoque que aplico cuando hay que cambiar una pieza de un sistema vivo:
incremental, con las dos versiones funcionando a la vez, nunca un big bang.

El mapa completo con el estado y las decisiones está en
[`docs/MIGRACION-A-JAVA.md`](docs/MIGRACION-A-JAVA.md).

---

## Algunas decisiones, y su motivo

**`Task` es un `record` inmutable, no una clase con setters.** Una tarea no se muta
a trozos: se reemplaza entera. Así es imposible dejarla en un estado intermedio.

**El `Clock` se inyecta en lugar de llamar a `Instant.now()` dentro del servicio.**
Sin eso ningún test puede afirmar nada sobre `createdAt` ni `updatedAt`. Con el
reloj inyectado, los tests lo fijan y lo comprueban de verdad.

**`actualizar()` ignora `familyId` y `createdBy` aunque vengan en la petición.** Una
tarea no cambia de familia ni de autor. Sin esa regla, cualquiera con el id de una
tarea podría moverla a la suya. Hay un test que lo comprueba.

**Los nombres de los campos en Java son idénticos a los de TypeScript.** El JSON que
devuelve la API es el mismo objeto que el frontend ya maneja, así que la migración
no necesita capa de traducción.

**Los errores salen como `ProblemDetail` (RFC 7807).** El cliente recibe siempre la
misma forma: `404` para lo que no existe, `400` con la lista de campos que fallan y
por qué.

---

## Cómo levantarlo

```bash
# 1. Base de datos
docker run -d --name points-mongo -p 27017:27017 -v points-mongo-data:/data/db mongo:7

# 2. API      (no hace falta instalar Maven: el proyecto trae el wrapper)
cd backend && ./mvnw spring-boot:run          # http://localhost:8080

# 3. Frontend
npm install && npm run dev                     # http://localhost:5173
```

Comprobar que la API responde:

```bash
curl localhost:8080/actuator/health
```

El frontend necesita un `.env` con la configuración de Firebase mientras dure la
migración. Las variables son las que aparecen en `src/firebase.ts`.

---

## Tests

```bash
npm test                    # frontend
cd backend && ./mvnw test   # backend
```

Los tests del backend no necesitan MongoDB levantado: el repositorio va mockeado,
porque lo que se prueba ahí son las reglas de negocio y no que Mongo sepa guardar.

---

## La API hoy

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/tasks?familyId=` | Tareas de una familia. `&soloActivas=true` para filtrar |
| `GET` | `/api/tasks/{id}` | Una tarea |
| `POST` | `/api/tasks` | Crear. Devuelve `201` |
| `PUT` | `/api/tasks/{id}` | Actualizar |
| `DELETE` | `/api/tasks/{id}` | Borrar. Devuelve `204` |

---

## El design system

La interfaz tiene ocho piezas propias y **ninguna acepta `className`**. La regla
que ordena todo es que un componente nunca nombra un color, nombra un rol, y la
consecuencia es que el modo oscuro son veinte declaraciones en vez de las 521
clases `dark:` que había escritas a mano.

La accesibilidad no es una capa encima: está dentro de los componentes. `Field`
obliga a poner etiqueta en el tipo, `Modal` trae trampa de foco, y el contraste
**se mide en los tests**, 21 estados por dos modos.

**290 tests**, de tres clases: comportamiento, contraste y guardas de
arquitectura que impiden que vuelvan a entrar controles crudos.

Todo está documentado en Storybook, con once funciones `play` que son tests que
se pueden mirar:

```bash
npm run storybook
```

---

## Cómo levantarlo

Son **tres piezas**, y con menos la aplicación se ve pero no funciona: crear
tareas no guarda. Está explicado paso a paso, con sus trampas, en
[`docs/LEVANTAR-EN-LOCAL.md`](docs/LEVANTAR-EN-LOCAL.md).

---

## Qué falta

- **Nadie comprueba de qué familia eres**: cambiando el identificador de la URL
  se entra en los puntos de otra familia. Es lo más urgente, y está en
  [`docs/PENDIENTES-ADMIN.md`](docs/PENDIENTES-ADMIN.md)
- Autenticación en el backend, que hoy está abierto
- Los dominios de privilegios, familias y recompensas
- Migrar los datos existentes
- Desplegar

---

## Los documentos

| | |
|---|---|
| [`ARQUITECTURA.md`](docs/ARQUITECTURA.md) | cómo está montado, con las cifras medidas |
| [`LEVANTAR-EN-LOCAL.md`](docs/LEVANTAR-EN-LOCAL.md) | las tres piezas y sus trampas |
| [`MIGRACION-A-JAVA.md`](docs/MIGRACION-A-JAVA.md) | el plan de salida de Firebase |
| [`DESIGN-SYSTEM-PROPUESTA.md`](docs/DESIGN-SYSTEM-PROPUESTA.md) | el diagnóstico del que salió el sistema |
| [`AUDITORIA-ACCESIBILIDAD.md`](docs/AUDITORIA-ACCESIBILIDAD.md) | los 54 hallazgos y su estado |
| [`MODELO-DE-ROLES.md`](docs/MODELO-DE-ROLES.md) | por qué el rol actual no da para lo que hace falta |
| [`PENDIENTES-ADMIN.md`](docs/PENDIENTES-ADMIN.md) | el agujero de propiedad entre familias |
| [`TODO-UI.md`](docs/TODO-UI.md) | el plan de mejoras de interfaz |
