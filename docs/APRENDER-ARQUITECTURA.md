# Aprender la arquitectura (para repasar)

> Apuntes de estudio, escritos según los vamos trabajando. Las líneas de código
> citadas están comprobadas sobre `develop` el 13-nov-2026. El detalle técnico
> completo vive en [ARQUITECTURA.md](./ARQUITECTURA.md); este documento es para
> **entenderlo y poder contarlo**.

---

## 1. Cómo está hoy: tres piezas y dos bases de datos

```
                 ┌──────────────────────────┐
  Navegador ───▶ │ React (src/)             │
                 │  componentes             │  ← no saben de dónde salen los datos
                 │      │                   │
                 │  src/services/  ◀── la ÚNICA puerta a los datos
                 └──────┬──────────┬────────┘
                        │          │
           (directo)    │          │  HTTP
                        ▼          ▼
                 ┌──────────┐  ┌──────────────────┐
                 │ Firebase │  │ API Java         │
                 │ Auth +   │  │ Spring Boot      │
                 │ Firestore│  │ (backend/)       │
                 └──────────┘  └────────┬─────────┘
                 usuarios, familias,    ▼
                 PUNTOS, privilegios ┌────────┐
                                     │MongoDB │ tareas personalizadas
                                     └────────┘
```

**Tres ideas clave**

1. **Dos bases de datos a propósito.** La app nació sobre Firebase y se está
   migrando a Java **dominio a dominio**. Las tareas personalizadas ya están en
   Mongo; el resto sigue en Firestore. Migrar por partes evita romper todo de golpe.
2. **`src/services/` es la frontera.** Los componentes piden "dame las tareas" y
   no saben si contesta Firestore o Java (patrón *adaptador*, arquitectura hexagonal).
3. **Consecuencia práctica:** hacen falta tres cosas levantadas (React, API Java y
   Mongo). Si solo arrancás React, todo se ve pero crear tareas no guarda.

---

## 2. La capa de servicios (service layer)

### El problema

Si cada componente hablara directo con Firestore:

```tsx
// ❌ dentro de un componente
const snap = await getDocs(collection(db, "privileges"));
```

…el día que los privilegios pasan a Java hay que reescribir **cada componente**
que los use. Y cada componente conoce detalles que no le importan (nombre de la
colección, librería, cómo se arma la consulta).

### La solución

Una carpeta de funciones que son **la única puerta a los datos**:

```
Componente ──"dame los privilegios"──▶ Servicio ──▶ Firestore / Java / lo que sea
           ◀──────── Privilege[] ─────
```

El componente pide **qué** quiere; el servicio sabe **cómo** conseguirlo.

### En el código

- `src/services/privilegesService.ts` ofrece funciones con nombres de negocio
  (`fetchPrivileges`, línea 19; `redeemPrivilege`, línea 162). Por dentro usa
  Firestore (`collection(db, "privileges")`, línea 21).
- `src/components/dashboard/PrivilegeManagement.tsx:27` solo importa la función.
  No sabe que existe Firestore.
- `src/services/customTaskService.ts` ofrece lo mismo (`getTasksByFamily`), pero
  por dentro hace `fetch()` a la API Java (línea 71). Para el componente es igual.

> **En una frase:** la capa de servicios separa *qué datos necesita la pantalla*
> de *dónde y cómo se guardan*. Es un enchufe: la lámpara no sabe si la luz viene
> de una placa solar o de la red.

### Ejercicio resuelto: migrar los privilegios a Java

- ✏️ **Se cambia** `src/services/privilegesService.ts`: de Firestore a HTTP,
  copiando la forma de `customTaskService.ts`.
- 🚫 **No se tocan** los 4 componentes que lo usan: `PrivilegeManagement`,
  `TaskPrivilegeManager`, `RewardTracker` y `ChildView`.
- **Condición:** el *contrato* no cambia. Mismos nombres de función, mismos
  parámetros, misma forma de respuesta.
- En el backend sí hay trabajo nuevo: una carpeta `privilege/` como `task/`.

*Entrevista:* "I isolated data access behind a service layer, so migrating a
domain from Firestore to my Java API meant rewriting one adapter, with zero
changes to the UI components."

---

## 3. El backend Java: tres capas

### El viaje de una petición

```
customTaskService.ts ──HTTP──▶ TaskController ──▶ TaskService ──▶ TaskRepository ──▶ MongoDB
   (frontend)                  "la ventanilla"    "las reglas"    "el almacén"
                                        └──────── todos manejan ────────┘
                                                Task (el dominio)
```

Analogía del **restaurante**: el camarero (Controller) toma el pedido, la cocina
(Service) decide cómo se hace, la despensa (Repository) guarda los ingredientes.
El camarero no cocina y la cocina no atiende mesas.

### Las capas (`backend/src/main/java/es/cookyourweb/points/task/`)

**1. `TaskController`: la ventanilla HTTP.** Traduce de HTTP a Java y vuelta. Sin lógica.

```java
@RequestMapping("/api/tasks")                 // línea 22
@PostMapping                                   // línea 45
public Task crear(@Valid @RequestBody Task nueva) {
    return service.crear(nueva);
}
```

`@Valid` rechaza datos mal formados **antes** de llegar a la lógica.

**2. `TaskService`: las reglas de negocio.**

```java
public Task crear(Task nueva) {
    Instant ahora = Instant.now(clock);                  // la hora la pone el servidor
    return repository.save(nueva.creada(null, ahora));   // línea 44
}
public void borrar(String id) {
    if (!repository.existsById(id)) throw new TaskNotFoundException(id);
    ...
}
```

**3. `TaskRepository`: el acceso a Mongo.** Una interfaz **sin código**:

```java
public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByFamilyId(String familyId);   // Spring escribe la consulta por el NOMBRE
}
```

**4. `Task`: el dominio.** Un `record` **inmutable**: no se modifica, se crea
una versión nueva (`creada(...)`, `actualizadaDesde(...)`). Nadie la cambia por
accidente a mitad del camino.

### Lo que lo rodea

- `web/ManejadorDeErrores`: convierte `TaskNotFoundException` en un **404** limpio.
- `config/ClockConfig`: el reloj **se inyecta**; en los tests se pasa una hora fija.
- `config/CorsConfig`: solo acepta llamadas desde el puerto 5173 (el frontend).

### Cómo encaja con el frontend

| Frontend | Backend | Idea |
|---|---|---|
| componente | Controller | quien habla con el "exterior" |
| `src/services/` | Service + Repository | quien sabe de datos |
| — | `Task` (record) | el contrato de lo que viaja |

**Organizado por feature** (`task/`), no por tipo (`controllers/`, `services/`):
*Screaming Architecture*, la carpeta grita de qué va la app. Migrar privilegios =
crear `privilege/` con los mismos 4 ficheros.

**Lo que falta:** no hay **Spring Security**. Hoy cualquiera que conozca la URL
puede crear o borrar tareas. Va antes de publicar la API.

---

## 4. Hacia dónde vamos: AWS

```
React ──▶ CloudFront + S3          (la web, servida desde la CDN)
  │
  ├──▶ API Gateway ──▶ Lambda (API Java en Docker, desde ECR) ──▶ Mongo Atlas
  │      (comprueba el token de Firebase)
  │
  └──▶ Panel Angular ──▶ KPIs en JSON
                             ▲
Firestore ──(cada noche)──▶ Lambda ──▶ S3 ──▶ Glue + Athena (SQL)
            weeklyTasks       IDs seudonimizados    4 vistas de KPIs
```

- La API Java va dentro de un contenedor Docker y **Lambda la ejecuta solo
  cuando alguien llama**: céntimos al mes, no 30 €.
- Mongo pasa a **Atlas**: el mismo Mongo, gestionado y gratis.
- La **capa de datos** es lo que justifica AWS: el histórico semanal se guarda y
  nadie lo lee ([AWS-JUSTIFICACION.md](./AWS-JUSTIFICACION.md)). Cada noche se
  copia a S3 sin nombres de menores y se consulta con SQL. La analítica **nunca
  toca la base de la app**.

---

## 5. Conceptos sueltos (se van sumando)

**Síncrono o asíncrono.** ¿Lo que viene después necesita el resultado?
- **Síncrono** si el resultado decide lo que pasa (validar, bloquear, inyectar datos).
- **Asíncrono** si es un efecto lateral (anotar, copiar, avisar).
- Al pasar a asíncrono pierdes: poder bloquear, ver los fallos y el orden (carreras).
- Regla corta: **si es un guardia, síncrono; si es un escriba, asíncrono.**
