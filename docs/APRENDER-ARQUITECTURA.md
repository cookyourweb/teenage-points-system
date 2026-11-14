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

**Condición de carrera.** Dos procesos corren a la vez y el resultado depende de cuál llega primero.
- Ejemplo real (bug conocido, 14-nov): `createUserWithEmailAndPassword` inicia sesión en el acto
  (`Signup.tsx:72`), la app salta al panel y `Dashboard.tsx:72` busca `usuarios/{uid}` **antes**
  de que el alta lo cree (`Signup.tsx:87`) → "No se encontró el documento del usuario"; un instante
  después recarga bien.
- Con red rápida a veces no se ve; con red lenta, siempre. Por eso "a mí me funciona" no prueba nada.
- Arreglo bueno (sesión 2): el panel pregunta "¿quién soy?" (`/api/me`) y distingue "creándose" de
  "sin familia". Un `setTimeout` taparía el síntoma, no la causa.

**Reglas de seguridad: denegar por defecto (fail-closed).** La última regla de `firestore.rules`
es `allow read, write: if false` para todo. Una colección nueva queda **cerrada** hasta que alguien
decide quién la toca. Lo contrario (abrir por defecto) deja agujeros por olvido.

**El nombre de la colección se compara letra por letra.** La regla decía `privilegios` y el código
usaba `privileges`: para Firestore son dos colecciones distintas, así que `privileges` caía en el
"denegar por defecto" y la pantalla no funcionaba.

**Firestore no filtra por vos.** Si pedís "todos los privilegios", no te devuelve "solo los tuyos":
**rechaza la consulta entera**. La consulta tiene que probar de entrada que solo pide lo permitido
(`where("familyId", "==", miFamilia)`).

**Libro de registro (append-only).** `privilegeHistory` se puede crear pero nunca modificar ni
borrar: un canje pasó y queda escrito. Si hay un error, se anota un movimiento nuevo que lo corrige.
Como un extracto del banco.

**Probar reglas con el emulador.** `npm run test:rules` levanta un Firestore falso en local y
comprueba cada regla (permite / deniega) sin tocar producción. Corre también en CI en cada push.

**JWT (el token de Firebase).** Un texto en tres partes: cabecera, datos (`sub` = el `uid`, `iss`, `aud`,
`exp`) y firma. Cualquiera puede **leerlo**; solo Google puede **firmarlo**. El servidor no pregunta a
Firebase en cada petición: comprueba la firma con las claves públicas de Google (el **JWKS**).

**Qué valida la API y por qué** (`backend/.../config/TokenFirebase.java`):
- **Firma RS256** con el JWKS de Google → nadie puede fabricar un token.
- **`iss` y `aud` = nuestro proyecto** → Google firma con las mismas claves los tokens de TODOS los
  proyectos de Firebase; sin esto, un token de la app de otro valdría aquí.
- **`exp`** → un token robado caduca en 1 hora.
- **`alg=none`** es un ataque clásico: un token "sin firma" que algunas librerías aceptaban. Aquí se rechaza.

**Resource server.** La API no tiene login ni sesión: solo recibe un token en la cabecera
`Authorization: Bearer ...` y decide. Sin token → **401** ("¿quién sos?"). Con token pero sin derecho → **403**.

**Un bug que solo se ve con el servidor de verdad.** Con `denyAll()` al final de la cadena, Spring Security
también bloqueaba la página interna de errores (`/error`): un JSON mal formado salía como 403 en vez de
400. Los tests con MockMvc (servidor simulado) no lo vieron; un test que arranca el servidor real sí.

**Sesión en un solo sitio (`AuthProvider`).** Antes había cuatro formas de preguntar "¿hay sesión?". Ahora
una, con estados explícitos (`cargando`, `anonimo`, `autenticado`) y el perfil **observado en vivo**
(`onSnapshot`): el panel ya no lee el usuario una vez, reacciona cuando el dato aparece. Así se cerró la
carrera del alta.
