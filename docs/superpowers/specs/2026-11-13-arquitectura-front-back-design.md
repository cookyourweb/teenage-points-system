# Arquitectura de frontend y backend

> Diseño del 13-nov-2026. Completa la visión
> ([2026-11-13-vision-producto-design.md](./2026-11-13-vision-producto-design.md))
> y la arquitectura de la IA
> ([2026-11-13-arquitectura-ia-design.md](./2026-11-13-arquitectura-ia-design.md)).
> Revisado ese mismo día por un arquitecto de backend y uno de frontend; esta
> versión ya incluye sus hallazgos. Marcas: **(dueña)**, **(propuesta)** =
> pendiente de que ella lo confirme, **(decisión técnica)** = la tomó quien
> escribe y se puede revisar, ✅ comprobado en el código, 🔶 supuesto.
>
> **Este documento es la única fuente del orden de construcción (§8).** La
> visión y la arquitectura de la IA remiten aquí.

---

## 1. Principios

1. **Dominios nuevos, directamente en Java/Mongo.** No se crea nada nuevo en
   Firestore.
2. **La autorización vive en el servidor.** El token de Firebase dice **quién
   eres** (`uid`). A qué familias perteneces y con qué papel lo dice
   `Membresia`, consultada en cada petición. Nada de eso viaja en el cuerpo de la
   petición.
3. **Las reglas de producto se garantizan en la base de datos**, no solo en el
   código. Por ejemplo, "el nivel nunca baja" es la condición de la propia
   escritura (§4).
4. **El frontend no conoce el proveedor.** `src/services/` sigue siendo la única
   puerta a los datos.
5. **Organización por feature** en los dos lados, como `backend/.../task/`.

---

## 2. Agujeros que existen hoy (encontrados en la revisión)

Van primero en el orden (§8, slice S0), porque algunos son graves.

| # | Qué | Dónde |
|---|---|---|
| A1 | **Cualquier cuenta nueva puede crearse como `admin`** o con el `familyId` de otra familia: la regla de alta de `usuarios` no limita los campos. Eso da escritura sobre el contenido del método y lectura de otras familias | ✅ `firestore.rules:60` |
| A2 | **El contenido del método se lee sin sesión** desde Internet. `categorias` mezcla FAQs públicas a propósito y contenido del método | ✅ `firestore.rules:106-107` |
| A3 | **No se sabe qué reglas están desplegadas.** El propio fichero dice que "mientras no se despliegue, esto es un documento". El código usa colecciones que las reglas no nombran (`privileges`, `privilegeHistory`, `childPoints`), así que o no están desplegadas o media app está rota | ✅ `firestore.rules:20-22` |
| A4 | **La API de tareas no tiene autenticación.** `GET/PUT/DELETE /api/tasks/{id}` no comprueban familia (cualquiera con un id puede leer, cambiar o borrar), y `createdBy` llega en el cuerpo | ✅ `TaskController.java:34-53`, `Task.java:39` |
| A5 | **El alta crea la familia en dos sitios.** `Signup.tsx` y `useAuth.ts` llaman los dos a `addFamily`: hoy pueden quedar familias duplicadas | ✅ `Signup.tsx:78-93`, `useAuth.ts:20-45` |
| A6 | **Cuatro fuentes de sesión**: `useAuth` montado en 3 componentes más `useAuthState` en `App.tsx` | ✅ `TaskManagement.tsx:49`, `PrivilegeManagement.tsx:46`, `RewardTracker.tsx:76`, `App.tsx:15` |
| A7 | Componentes y hooks que importan Firestore fuera de `src/services/`, contra `AGENTS.md` | ✅ `InviteMember.tsx:5`, `useUserRole.ts:4`, `useMiFamilia.ts:1` |
| A8 | Botones y enlaces rotos: invitar (escribe en una colección denegada), cerrar sesión (navega a `/signin`, que no existe) y `rewardLink` (apunta a `/family/...`, que no existe) | ✅ `InviteMember.tsx:26`, `useAuth.ts:60`, `AddEditChild.tsx:88` |

---

## 3. Mapa de dominios

```
          ┌────────────┐     ┌──────────────────────┐
          │ identidad  │◄────│ familia              │  Familia, Hijo, Membresia, Invitacion
          │ (uid)      │     └─────┬────────────────┘
          └────────────┘           │
     ┌──────────────┬──────────────┼──────────────┬─────────────┐
┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────┐ ┌────▼─────┐
│ nivel   │◄──│ acuerdo   │─►│ task +    │  │ privilegio │ │ perfil   │ privado, por uid
│         │   │           │  │ puntos    │  │ (por fam.) │ │          │
└────▲────┘   └─────▲─────┘  └───────────┘  └────────────┘ └──────────┘
     │ lee          │ borradores
┌────┴────┐   ┌─────┴─────┐      ┌───────────┐
│ coach   │   │ ia        │─────►│ metodo    │ puerto (ver §7)
└─────────┘   └───────────┘      └───────────┘
```

| Feature (Java) | Responsabilidad e invariantes |
|---|---|
| `identidad/` | El `uid` verificado por Spring Security. `esAdmin` global |
| `familia/` | `Familia`; **`Hijo(id)`**, que existe **antes** de tener cuenta, y por eso los puntos cuelgan de `hijoId` y no de `uid`; `Membresia(uid, familyId, papel, etiqueta, estado)` con índice único `(uid, familyId)`; `Invitacion`. Un adulto puede estar en varias familias. Invariantes: nunca se queda una familia sin adultos; hay un límite de invitaciones pendientes |
| `tipo/` (dentro de `familia/`) | El **resultado** del test por adulto y por hijo, y el tipo elegido. **Las respuestas no se guardan** (RGPD) |
| `nivel/` | Un documento por hijo con el nivel actual + una colección de auditoría `cambiosDeNivel`. Ver §4 |
| `acuerdo/` | Estados `borrador → propuesto → aceptado → revisado`. Lo propone un adulto o el adolescente |
| `task/` | Ya existe. `Task.java` no cambia su forma; se añade la propiedad (§4) |
| `puntos/` | **Libro de movimientos** al que solo se añade. Ver §4 |
| `privilegio/` | Recompensas **por familia**; el canje es un movimiento de `puntos/` |
| `perfil/` | Perfil privado del adulto, cifrado, por `uid`. Ver §5 |
| `coach/` | `Grupo(coach, familias)`, `Sesion` (enlace Zoom/Meet, recursos, texto para la IA). Proyecto 2 |
| `ia/` | Ver el documento de la IA |

**Papeles:** `esAdmin` (global) más un **papel por familia**: `adulto` o
`adolescente`, con una **etiqueta libre** sin lógica ("madre", "abuela"). La
coach tiene su papel en `coach/`.

**Una cuenta, varias vistas (decisión técnica):** si la misma persona es adulto,
admin o coach, es **una sola cuenta** y cambia de vista dentro de la app.

---

## 4. Backend

### Autenticación (decisión técnica)

- **Spring Security como *resource server*** con
  `spring-boot-starter-oauth2-resource-server`, verificando el JWT de Firebase
  contra sus claves públicas (JWKS). **No** se usa Firebase Admin SDK para esto:
  pesa, alarga el arranque y exige una credencial de Google dentro de Lambda.
- Validar **`iss`** (`https://securetoken.google.com/{proyecto}`) y **`aud`**
  (el id del proyecto): sin `aud` se aceptarían tokens de otro proyecto de
  Firebase. 🔶 Verificar la URL exacta del JWKS en la documentación de Firebase.
- Sin sesión en servidor y sin CSRF (el token va en una cabecera, no en una cookie).
  `CorsConfig` permite la cabecera `Authorization`.
- **Arranque en frío:** las claves se cargan al arrancar, no en la primera
  petición. Además: `lazy-initialization`, `-XX:TieredStopAtLevel=1`, AppCDS y
  1769 MB de memoria (1 vCPU). Una imagen nativa sería el gran salto, pero no
  ahora.
- **Revocación:** un token dura hasta 1 hora aunque se quite a alguien de la
  familia. Es aceptable porque la membresía se consulta en cada petición.

### Propiedad en `task/`

- Las cinco rutas comprueban que el usuario es miembro de la familia de la tarea.
- **404, no 403,** cuando alguien pide una tarea de otra familia por su id: así
  no se puede adivinar qué ids existen.
- `createdBy` sale del token, nunca del cuerpo.

### Invitaciones (decisión técnica salvo lo marcado)

- **Token de 256 bits** con `SecureRandom`. En la base solo se guarda su **hash
  SHA-256**: si se filtra la base, no hay invitaciones vivas.
- **Aceptación atómica:** un `findOneAndUpdate` sobre la invitación pendiente y
  no caducada, más la creación de la `Membresia`, en una transacción
  (Atlas M0 lo permite). Un doble clic no crea dos membresías.
- **Solo se acepta por `POST`:** los antivirus del correo hacen `GET` y
  gastarían el token.
- **Un solo uso, caducidad corta y revocable;** el adulto que invita ve quién
  entró.
- **Sin email en la primera versión (propuesta):** el adulto **comparte el enlace
  por WhatsApp** (`navigator.share` o copiar). Cero infraestructura y es el modelo
  mental de la dueña. El email llega después (SES necesita aprobación manual para
  salir de su modo de pruebas).
- **Código corto para el adolescente:** solo con caducidad de minutos y 5 intentos
  como máximo (el contador va en Mongo, porque Lambda no comparte memoria). El QR
  lleva el token largo.

### Nivel y puntos: sin *event sourcing* (decisión técnica)

El *event sourcing* completo (reconstruir el estado repitiendo eventos) es
excesivo para este tamaño. Basta con:

- **`nivel/`:** un documento por hijo. La **única** escritura posible es
  `updateOne({_id, nivel: {$lt: nuevo}}, {$set: {nivel: nuevo}})` más la fila de
  auditoría, en una transacción. Si no coincide nada, **409**. Así "el nivel
  nunca baja" lo garantiza la consulta misma.
- **`puntos/`:** un **libro de movimientos** al que solo se añade: `TareaCumplida`,
  `Canje` y `Correccion`. Las correcciones llevan autor, son **visibles para el
  adolescente** y nunca borran nada. El total se calcula agrupando. Cada fila
  guarda la **versión de la política de puntos**, para poder dibujar la curva
  "los puntos bajan mientras el nivel sube". Una clave de idempotencia evita los
  dobles clics.
- La analítica nocturna lee este libro.

### Atlas M0 🔶 (cifras a verificar)

- 512 MB, sin copias de seguridad continuas y con pausa por inactividad. Hace
  falta una exportación propia.
- Lambda no tiene IP fija, así que la lista de IPs permitidas queda abierta
  (`0.0.0.0/0`). Se compensa con un usuario de base de datos con el mínimo
  privilegio, TLS y una contraseña fuerte, y se declara como riesgo.
- `MongoClient` estático con un pool pequeño (3 a 5) y tiempos de espera cortos:
  Lambda congela el proceso y las conexiones caducan.
- **Tests:** las transacciones necesitan un Mongo real (Testcontainers). Se
  separan: unitarios sin Mongo (`./mvnw test`, como ahora) e integración con
  `./mvnw verify`.

### Despliegue (decisión técnica)

- **Lambda Function URL** en lugar de API Gateway: es gratis para siempre (API
  Gateway lo es solo 12 meses) y no corta a los 29 segundos.
- **Concurrencia reservada baja** (por ejemplo, 5): protege el gasto y las
  conexiones de Atlas.
- La cuenta de AWS está en el **plan gratuito** (100 US$ de créditos hasta el
  12-may-2027).

---

## 5. Perfil privado del adulto: cifrado (decisión técnica)

- **Todo el perfil como un solo bloque cifrado**, con AES-256-GCM de Java. IV
  aleatorio por registro. **Los datos asociados (AAD) son el `uid` y la versión**:
  así no se puede copiar el cifrado de una persona a otra.
- **Después de la demo (§10):** una clave por usuario derivada (HKDF de la clave maestra y el `uid`): no hay
  que guardar claves por persona, y borrar el perfil es borrar el documento.
- **La clave maestra va en SSM Parameter Store** (SecureString estándar, gratis),
  nunca en una variable de entorno. Se carga la primera vez que hace falta y se
  guarda en memoria.
- **Rotación:** parámetros versionados (`v1`, `v2`), se cifra con la actual y se
  descifra con la que indique el registro.
- **Si se pierde la clave, se pierde el dato.** Hace falta una copia de la clave
  fuera de AWS y una exportación de la base.
- **Lo que protege y lo que no:** protege si se filtra la base; no protege si
  alguien toma el control de la Lambda.

**Pendiente (dueña):** ¿el perfil puede llegar a Claude? Ver §9.

---

## 6. Frontend

### Sesión y alta (decisión técnica)

- **Un solo `AuthProvider`** con estados explícitos: `cargando`, `anónimo`,
  `sin familia`, `con familia`. Sustituye las cuatro fuentes de sesión (A6).
- **El alta no crea nada sola.** Dos caminos explícitos: `/crear-familia` (el
  primer adulto) y `/unirse/:token` (un invitado). Se quita la creación
  automática de `useAuth.ts` **y** de `Signup.tsx` (A5).
- **El token de la invitación sobrevive al registro:** se guarda en la URL de
  vuelta (`?next=`) o en `sessionStorage` (con try/catch). Si la persona abre el
  enlace con **otra cuenta** abierta, la app se lo dice antes de aceptar.
- **Menor de 14:** un estado intermedio `pendiente de confirmación`, en el que el
  chico ve una pantalla de espera hasta que un adulto confirme.

### Peticiones (decisión técnica)

- **Una sola función `apiFetch`** en `src/services/http.ts`: pide el token a
  Firebase en cada llamada (Firebase lo guarda y lo renueva solo; no se guarda a
  mano) y reintenta una vez con un token nuevo si recibe un 401.
- **Errores con tipo** (`ErrorHttp` con su código) para distinguir 401 (volver a
  entrar), 403 o 404 (sin acceso) y 409 (conflicto). Hoy se pierden en un texto.
- El contrato de los servicios **cambia**: `familyId` deja de ir en la URL de
  consulta y lo comprueba el servidor (A4).

### Estado y caché (decisión técnica)

- **TanStack Query** para los datos del servidor: evita leer lo mismo en cada
  pantalla, refresca lo relacionado después de un cambio (aceptar un acuerdo
  refresca el nivel y las tareas) y unifica los estados de carga y error. Los
  servicios siguen siendo la frontera; las claves de la caché viven en hooks por
  feature.
- **Al cerrar sesión o cambiar de familia se vacía la caché.** En un móvil
  compartido no puede quedar nada del usuario anterior.

### Rutas por papel y varias familias (decisión técnica)

- **La familia activa va en la URL** (`/f/:familyId/...`): se puede recargar y
  compartir un enlace. El selector de familia solo aparece si hay más de una.
- **Un solo `RutaPorPapel`** sustituye a `RutaSoloAdmin` y `RutaDeMiFamilia`. Es
  comodidad, no seguridad: la verdad la da el servidor.
- **Un `AppShell` por papel:** el adulto tiene navegación inferior en el móvil y
  lateral en el ordenador; el adolescente, una sola pantalla de inicio (su zona).

| Papel | Qué ve | Qué no ve nunca |
|---|---|---|
| Adulto | Familia, ficha de cada hijo, tipo, perfil propio, conflicto, acuerdos | El chat del adolescente; el perfil de otro adulto |
| Adolescente | Su nivel, cuánto le falta, sus tareas y acuerdos; su chat si está activado | Su "color"; los perfiles; las conversaciones de los adultos |
| Coach | Sus grupos, sesiones y el avance de nivel | Conversaciones, perfiles, detalle de la casa |

### Móvil y ordenador (dueña)

- Una sola app web **adaptable, pensada primero para el móvil**. Pantallas
  completas con `dvh`, no con `vh` (la barra de Safari recorta). Zonas táctiles
  de 44 px como mínimo, resueltas **dentro** de los componentes de `ui/`.
- **La pantalla de pausa del conflicto funciona sin red:** va en el paquete
  principal, no en uno que se cargue aparte. El *service worker* para que abra
  sin red también después de recargar queda **para después** (§10).
- **Sin notificaciones push:** el anti-objetivo de enganchar lo descarta.

### Accesibilidad para alguien que está en pleno conflicto

Texto grande, una sola acción por pantalla, sin temporizadores, respetar
`prefers-reduced-motion`, foco inicial en el título, `aria-live="polite"` para
los pasos (`role="alert"` solo para el mensaje de crisis), un botón de salir
siempre visible, y los teléfonos de ayuda como enlace `tel:` y también como texto.
Los errores de red se muestran con un texto amable fijo, nunca "Failed to fetch".

### Tests (decisión técnica)

- **MSW** para simular la API (401, 403, 409, invitaciones) sin escribir los
  *mocks* de `fetch` a mano. Sirve también en Storybook.
- **`vitest-axe`** en las pantallas nuevas (pausa, alta, invitación).
- **`arquitectura.test.ts` se amplía** para que `fetch` solo se use en
  `services/http.ts` y Firebase solo en `services/`, `firebase.ts` y el
  `AuthProvider`. Como hoy ya hay excepciones (A7), lleva una **lista de
  excepciones que solo puede bajar**, para no romper la suite de golpe.

### Lo que se retira

La ruta `/child-view/:familyId/:childId`, `ShareChildLink.tsx`, `rewardLink`, la
economía de puntos en `localStorage` (`usePointsManagement.ts`, la migración de
`RewardTracker.tsx`, las notificaciones de `ChildView.tsx`) y
`FamilyPointsOverview.tsx` (el podio entre hermanos). Como los datos actuales son
solo de prueba de la familia de la dueña, no hace falta migrar el `localStorage`.

---

## 7. El contenido del método (pendiente, dueña)

Hoy vive en `categorias` junto a las FAQs públicas. Hay dos caminos:

| Opción | A favor | En contra |
|---|---|---|
| **A. Separarlo en Firestore** (otra colección privada) y que el backend la lea con Admin SDK | La dueña sigue editándolo desde la consola de Firebase | Credencial de Google dentro de Lambda, latencia entre nubes y arranque más lento |
| **B. Copiarlo una vez a una colección privada de Mongo** con un script (fuera del repo, por derechos) | Sin Admin SDK ni credencial de Google; todo en Java | Pierde la edición desde la consola de Firebase; hace falta otra forma de editarlo |

Mientras se decide, el slice S0 cierra la lectura pública separando el método de
las FAQs.

---

## 8. Orden de construcción (fuente única)

> Reescrito tras la **evaluación de las decisiones técnicas** del 13-nov
> (seguridad, infraestructura y complejidad, §10). La dueña aceptó el camino
> corto hasta la demo (dueña, 13-nov).

### Camino a la demo: 6 sesiones de 45-60 minutos

**La demo:** un adulto entra con su cuenta, hace el test del tipo de su hijo,
recibe sugerencias de tareas de la IA y las acepta con un clic. Todo en local, con
la familia de la dueña, **sin recortar la seguridad**.

| Sesión | Qué | Demo |
|---|---|---|
| **1. Reglas (S0)** | Cerrar A1 (cualquiera se hace admin) y A2 (método sin sesión), con tests de `@firebase/rules-unit-testing`. Si cabe, el alta duplicada (A5). Comprobar qué reglas están desplegadas (A3) | Un test intenta crearse admin y falla |
| **2. Auth (S1)** | `/api/me` con Spring Security (y tests con tokens falsos, caducados, de otro proyecto y `alg=none`), `apiFetch`, `AuthProvider` de 3 estados (`cargando`, `anónimo`, `autenticado`) | Sin token, 401; con token, devuelve el `uid` |
| **3. Propiedad (S3)** | `Membresia` creada por script para la familia de la dueña; `requireMember` en las cinco rutas de `task/` con 404; `createdBy` del token; 1 test de integración con Testcontainers | Una segunda cuenta no ve ni toca las tareas de la primera |
| **4. Tipo** | `TipoService` + `ContenidoMetodoPort` con **contenido ficticio**; pantalla de preguntas y sugerencia; el adulto elige | El test sugiere un tipo con contenido de ejemplo |
| **5. IA** | `ModeloPort` (+ `ModeloFalso` y `ClaudeModelo`), una función pura que compone el prompt, salida JSON validada, `Propuesta`, caché por (tipo, nivel, semana), **tope global diario atómico** y tope de gasto en la consola de Anthropic | `POST /api/ia/sugerencias` devuelve propuestas |
| **6. Aceptar** | UI de propuestas con TanStack Query: aceptar, editar y crear con el `POST` de tareas que ya existe. Grabar la demo | El vídeo de la demo |

**AWS (S2), en paralelo y sin bloquear:** cuando AWS verifique la cuenta, una
sesión extra para subir `/api/me` a Lambda y **medir el arranque en frío**, primero
sin trucos y después con SnapStart (§10).

### Después de la demo

| Slice | Qué |
|---|---|
| **S4** Invitación entre adultos | Token en el fragmento de la URL, hash, un solo uso, `POST`, y **el adulto que invitó confirma** a quien entra. El invitado **no ve los puntos hasta S5** (no se escribe `usuarios.familyId` desde el cliente) |
| **S5** Familia, puntos y privilegios en Java | `Hijo`, libro de movimientos, `nivel/` con la consulta que impide bajar, privilegios por familia. La analítica de AWS pasa a leer de aquí |
| **S6** Cuenta del adolescente | Invitación con QR (token largo); consentimiento según la edad; su zona; se retira `/child-view` |
| Perfil privado | AES-256-GCM con la clave maestra en SSM y AAD = `uid` + versión. **Hasta que exista, ese dato no se guarda** |
| Conflicto | Con el detector de riesgo, `SustitutorDeNombres` y mensajes fijos; **apagado hasta la revisión profesional** |
| Chat del adolescente, coach, RAG | En ese orden |

### Decidido: después (no se construye hasta que haga falta)

Service worker para la pausa sin red (la pausa va en el paquete principal),
familia en la URL y selector de varias familias, `AppShell` por papel, MSW (entra
con S4), clave por persona con HKDF y rotación, códigos cortos del adolescente,
`PresupuestoDeTokens` completo, `NotasDelAdulto`, auditoría completa.

---

## 9. Pendiente de decidir (dueña)

1. **¿El perfil privado puede llegar a Claude?** Si sí, hace falta un
   consentimiento explícito de ese adulto, que pueda apagar. Si no, la IA no lo
   lee y el momento del conflicto pierde contexto.
2. **¿Cómo entra un adolescente sin email** (muchos menores de 14 no tienen)?
   Opciones: un adulto le crea la cuenta, o entra de forma anónima con el código y
   después vincula un email.
3. **Reglas de los puntos:** ¿se reinician cada semana? ¿puede un canje dejar el
   saldo en negativo?
4. **¿Quién puede quitar a un adulto de la familia,** y qué pasa si uno intenta
   echar al otro? Hace falta una regla escrita aunque "la app no arbitre".
5. **Contenido del método:** opción A o B de §7.

**Dato que tiene que mirar la dueña** (no es una pregunta): qué reglas están
desplegadas hoy en la consola de Firebase. De eso depende el alcance real de S0.

---

## 10. Evaluación de las decisiones técnicas (13-nov)

Tres agentes evaluaron las decisiones por separado: seguridad, infraestructura y
coste, y complejidad. **Estos ajustes mandan sobre lo que digan las secciones
anteriores.**

### Se mantiene (coinciden los tres)

Spring Security con el JWT de Firebase; token solo con el `uid` y `Membresia` en
el servidor; libro de movimientos y nivel con consulta condicional (sin *event
sourcing*); Testcontainers para 2 o 3 tests de integración; Lambda Function URL;
SSM para las claves; TanStack Query (desde la primera pantalla nueva, sin migrar
lo viejo de golpe); `vitest-axe`.

### Ajustes

- **Autenticación:** el decodificador usa el JWKS de Firebase **solo con RS256**,
  y valida `iss`, `aud` y que `sub` no esté vacío. El código recibe también
  `sign_in_provider` y `email_verified`. Una cuenta **anónima** no tiene ningún
  privilegio salvo canjear una invitación válida.
- **404 entre familias, 403 por papel dentro de la misma familia.** Una sola
  función `requireMember(uid, familyId)` para todos los controladores. Un test
  recorre todas las rutas con una segunda cuenta.
- **Invitaciones:** el token va en el **fragmento** de la URL (`/unirse#t=...`),
  que no llega a los registros del servidor ni a la cabecera `Referer`, y se manda
  en el cuerpo del `POST`. `Referrer-Policy: no-referrer`. **La membresía queda
  pendiente hasta que la confirma el adulto que invitó.** Caducidad de 48 a 72
  horas. **Sin transacción:** basta el `findOneAndUpdate` atómico más el índice
  único de `Membresia`. `?next=` solo admite rutas relativas.
- **Código corto del adolescente** (cuando llegue): 8 caracteres base32 guardados
  como hash, 10 minutos, 5 intentos con `$inc` atómico, más un límite global.
- **Cifrado del perfil:** AES-256-GCM con la clave maestra en SSM y AAD = `uid` +
  versión de la clave. HKDF por persona y rotación, **después** (§8). La política
  IAM de la Lambda solo puede leer ese parámetro.
- **Concurrencia reservada:** no es la defensa contra el abuso. Con 5, cualquiera
  la satura y los usuarios reciben 429. El control real es un límite de
  peticiones en la app (por `uid` e IP, en Mongo) más AWS Budgets. **Concurrencia
  reservada = 0 sirve como interruptor de apagado.** 🔶 En una cuenta nueva puede
  que ni siquiera deje reservar: comprobarlo con `aws lambda get-account-settings`.
- **IA, para empezar solo 4 piezas** (`ModeloPort`, `Propuesta`,
  `ContenidoMetodoPort`, `TipoService`) y una función pura que compone el prompt.
  El resto entra con el conflicto o el chat (§8).
- **Gasto de la IA:** el tope por familia no basta, porque cualquiera puede crear
  familias. Hace falta un **tope global diario** con contador atómico, límite de
  altas de familias y `email_verified`. La **clave de Anthropic** va en SSM, en un
  *workspace* propio con tope de gasto en su consola.
- **XSS:** la salida de la IA se muestra como **texto**, nunca con
  `dangerouslySetInnerHTML`. CSP estricta. No se persiste la caché de TanStack.
- **Atlas:** 🔶 probar la autenticación **AWS IAM** de Atlas (`MONGODB-AWS`) con el
  rol de la Lambda, para no tener contraseña. Si no, contraseña de 32 caracteres o
  más en SSM y un usuario `readWrite` sobre una sola base. Alertas de Atlas
  activadas.

### Cambios de infraestructura

- **Arranque en frío:** según la evaluación de infraestructura, AWS anunció
  **SnapStart para imágenes de contenedor** en septiembre de 2026 (🔶 confirmarlo
  antes de S2). Si es así, se mide primero sin trucos, después con SnapStart
  (publicando versiones con alias) y se quitan las mitigaciones que sobren.
  También hay que elegir el adaptador entre Spring y Lambda: **Lambda Web
  Adapter** es el más simple (la app sigue siendo un Spring normal en el 8080).
- **CloudFront delante de todo:** la web (S3 privado) y `/api/*` (Function URL
  con OAC) en el **mismo dominio**. Elimina CORS, permite un dominio propio y nadie
  llama a la Lambda directamente. Trampa: las páginas de error de CloudFront para la
  SPA son globales y convertirían los 404 de la API en HTML; se resuelve con una
  CloudFront Function solo en la web.
- **Región:** 🔶 no está confirmado que Atlas tenga el plan gratuito en Estocolmo.
  **Se elige al crear el clúster**, antes de nada más: si no está, Lambda y S3 se
  mueven a la región de Atlas (Irlanda o Frankfurt), no al revés.
- **Barandillas antes del primer despliegue:** retención de CloudWatch de 14 días
  (por defecto es infinita), AWS Budgets con avisos, ciclo de vida de ECR (últimas
  5 a 10 imágenes), Terraform con estado en S3, GitHub Actions con OIDC (sin
  claves), gitleaks, Dependabot y MFA en AWS, Firebase, Atlas y Anthropic.
- **Glue y Athena:** tablas por DDL (los *crawlers* cobran por hora), Parquet
  particionado y un límite de bytes por consulta en el *workgroup*.
