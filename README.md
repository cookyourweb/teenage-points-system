# Sistema de Puntos

Aplicación web para familias con hijos adolescentes: los padres acuerdan tareas
y privilegios, los hijos ven su progreso, y el sistema mide lo que de verdad
está pasando en casa.

Está pensado como herramienta de apoyo para programas de acompañamiento
familiar: los que trabajan acuerdos concretos entre padres e hijos y necesitan
ver si se cumplen. La aplicación traduce ese trabajo a algo medible: qué se
acuerda, qué se cumple y cómo evoluciona semana a semana.

**Design system publicado:**
[cookyourweb.github.io/teenage-points-system](https://cookyourweb.github.io/teenage-points-system/)

---

## Qué resuelve

El problema no es que un adolescente no ordene su cuarto. Es que **nadie
recuerda lo que se acordó**, y la conversación acaba siendo la misma discusión
cada semana.

La aplicación convierte el acuerdo en algo visible:

- Los padres definen tareas y cuántos puntos vale cada una
- Los hijos las marcan según las hacen, desde su propio enlace
- Al llegar a cierto umbral se desbloquean privilegios
- Y queda registro de la semana, para hablar de datos y no de percepciones

---

## Tecnología

### Interfaz

| | |
|---|---|
| **React 18** + **TypeScript 5.7** | componentes tipados de punta a punta |
| **Vite 5** | empaquetado y servidor de desarrollo |
| **React Router 7** | rutas |
| **Tailwind 3.4** | sobre una capa de tokens propia, no suelto |
| **Storybook 10** | documentación viva del design system |
| **Vitest 2** + **Testing Library** | 296 tests |

### Backend

| | |
|---|---|
| **Java 17** + **Spring Boot 4.1** | API REST |
| **Spring Data MongoDB** | persistencia |
| **Bean Validation** | validación de entrada |
| **JUnit 5** + **Mockito** | pruebas de dominio |

### Datos

| | |
|---|---|
| **MongoDB** | dominios ya migrados |
| **Firebase** (Auth y Firestore) | sesión y lo que queda por migrar |

---

## Arquitectura

### Una migración incremental, no un big bang

El proyecto nació sobre Firestore y está pasando a un backend propio en Java.
**Los dos conviven**, y se migra dominio a dominio sin parar la aplicación.

```
      componentes React
              │
      src/services/*.ts        ← la única capa que sabe de dónde vienen los datos
              │
      ┌───────┴────────┐
  Firestore      API Spring Boot
 (lo que queda)         │
                     MongoDB
```

Que esto salga barato no es casualidad: **los componentes nunca llamaron a
Firestore directamente**. Llaman a `fetchTasks()`, `addCustomTask()`. Toda la
dependencia del proveedor está encerrada en seis ficheros de `src/services/`.

El puerto ya estaba construido. Migrar consiste en escribir otro adaptador.

### Design system con contratos cerrados

Ocho componentes propios, y **ninguno acepta `className`**:

```ts
Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'>
```

Esa línea convierte el sistema de convención en regla: **no es algo que
recordar en la revisión, es que no compila**. Y en la configuración de Tailwind
se *sustituye* `theme.colors` en vez de extenderlo, así que `bg-blue-500` ni
siquiera existe.

El color se organiza en **tres niveles**:

```
PRIMITIVO    --tps-brand-600: #2563eb                  "qué color es"
SEMÁNTICO    --tps-action: var(--tps-brand-600)        "para qué sirve"
COMPONENTE   --tps-btn-primary-bg: var(--tps-action)   "quién lo usa"
```

Un componente nunca nombra un color: nombra un rol. La consecuencia es que **el
modo oscuro son veinte declaraciones**, no una clase `dark:` en cada elemento.

### Permisos en dos capas

Los datos de una familia no los ve otra. Y eso se comprueba **dos veces, en dos
sitios distintos**, porque una sola no basta:

| Capa | Qué hace | Se puede saltar |
|---|---|---|
| Guarda de ruta en React | evita llegar por accidente y explica por qué | sí |
| **Reglas de Firestore** | lo impide de verdad, en el servidor de Google | no |

La guarda del navegador es comodidad. Quien quiera se la salta con las
herramientas de desarrollo, o llamando a la API de Firestore sin pasar por la
aplicación. **Lo que protege son las reglas**, y por eso están en
[`firestore.rules`](firestore.rules), versionadas y revisables, y no en un
panel web.

Son dos preguntas distintas y por eso hay dos guardas, no una con un `if`
dentro:

```
RutaSoloAdmin      ¿QUIÉN ERES?     → se resuelve con el rol
RutaDeMiFamilia    ¿ESTO ES TUYO?   → se resuelve comparando
```

Las dos **deniegan por defecto**: sin rol, sin familia o si falla la lectura,
no se entra. Un error al comprobar permisos no puede acabar en permiso
concedido.

### Accesibilidad dentro del componente

No es una revisión al final: está en la pieza, que es lo único que escala.

- `Field` exige la etiqueta **en el tipo**, y cablea `aria-invalid` y
  `aria-describedby` solo
- `Modal` trae trampa de foco, cierre con Escape y devolución del foco
- `Tabs` implementa el patrón WAI-ARIA completo, con navegación por flechas
- **El contraste se mide en los tests**: 21 pares de color por dos modos

---

## Pruebas

**296 tests**, de tres clases distintas:

| Tipo | Qué vigila |
|---|---|
| Comportamiento | que los componentes funcionen, sobre todo **con teclado** |
| Contraste | ratios WCAG calculados sobre los colores reales, en claro y oscuro |
| Guardas de arquitectura | que no vuelvan a entrar controles crudos ni colores fuera del sistema |

Las guardas existen porque **los tipos no lo pueden todo**: un icono es un
`ReactNode` válido dentro de `children`, así que TypeScript no puede impedir un
botón sin nombre accesible. Un test que recorre el código fuente, sí.

```bash
npm run typecheck   # tsc -b
npx vitest run      # 296 tests
npm run storybook   # el design system, en el 6006
```

---

## Cómo se levanta

Son **tres piezas**: MongoDB, el backend de Java y el frontend. Con menos, la
aplicación se ve pero no guarda.

Está explicado paso a paso, con sus trampas, en
**[docs/LEVANTAR-EN-LOCAL.md](docs/LEVANTAR-EN-LOCAL.md)**.

---

## La API

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/tasks?familyId=` | Tareas de una familia. `&soloActivas=true` para filtrar |
| `GET` | `/api/tasks/{id}` | Una tarea |
| `POST` | `/api/tasks` | Crear. Devuelve `201` |
| `PUT` | `/api/tasks/{id}` | Actualizar |
| `DELETE` | `/api/tasks/{id}` | Borrar. Devuelve `204` |

Tres decisiones del backend que están en el código:

**`Task` es un `record` inmutable.** Una tarea no se muta a trozos: se
reemplaza entera con un `PUT`. Así es imposible dejarla a medias.

**El `Clock` se inyecta** en lugar de llamar a `Instant.now()` dentro del
servicio. Sin eso, ningún test puede afirmar nada sobre `createdAt`.

**`actualizar()` ignora `familyId` y `createdBy`** aunque vengan en la
petición. Una tarea no cambia de familia. Sin esa regla, cualquiera con el id
de una tarea podría moverla a la suya.

---

## Documentación

| | |
|---|---|
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | cómo está montado, con las cifras medidas |
| [LEVANTAR-EN-LOCAL.md](docs/LEVANTAR-EN-LOCAL.md) | las tres piezas y sus trampas |
| [MIGRACION-A-JAVA.md](docs/MIGRACION-A-JAVA.md) | el plan de salida de Firebase |
| [DESIGN-SYSTEM-PROPUESTA.md](docs/DESIGN-SYSTEM-PROPUESTA.md) | el diagnóstico del que salió el sistema |
| [AUDITORIA-ACCESIBILIDAD.md](docs/AUDITORIA-ACCESIBILIDAD.md) | 54 hallazgos WCAG 2.2 y su estado |
| [MODELO-DE-ROLES.md](docs/MODELO-DE-ROLES.md) | el modelo de permisos y por qué hay que cambiarlo |
| [PENDIENTES-ADMIN.md](docs/PENDIENTES-ADMIN.md) | pendientes del rol de administrador |
| [TODO-UI.md](docs/TODO-UI.md) | plan de mejoras de interfaz |

---

## Estado

En desarrollo activo. Lo siguiente:

- Autenticación en el backend de Java, que hoy está abierto
- Migrar los dominios de privilegios, familias y recompensas
- Separar el rol global del papel dentro de cada familia, para que una misma
  persona pueda ser madre en la suya e invitada en otra
- Desplegar la aplicación

---

Desarrollado por **[WunjoCreations](https://wunjocreations.com)**
