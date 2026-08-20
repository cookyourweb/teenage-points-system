# Cómo está montado esto

Un sistema de puntos para familias: los padres definen tareas y privilegios, y
los hijos marcan lo que van haciendo.

Todas las cifras de este documento están medidas sobre el código, no estimadas.

---

## El resumen en una tabla

| Capa | Con qué | Dónde vive |
|---|---|---|
| Interfaz | React 18 + TypeScript 5.7, Vite 5 | `src/` |
| Estilos | Tailwind 3.4 sobre una capa de tokens propia | `src/styles/tokens.css` |
| Design system | 8 piezas cerradas, documentadas en Storybook 10 | `src/components/ui/` |
| Pruebas | Vitest 2 + Testing Library — **290 tests** | `src/__tests__/` |
| Backend | Spring Boot 4.1 sobre Java 17 | `backend/` |
| Datos | **Firestore y MongoDB a la vez** — ver abajo | |
| Sesión | Firebase Authentication | |

---

## Lo primero que hay que entender: hay DOS bases de datos

No es un despiste, es **una migración a medias y deliberada**. El proyecto nació
sobre Firebase y está pasando a un backend propio en Java, dominio a dominio.

| Dominio | Dónde vive hoy | Estado |
|---|---|---|
| **Tareas personalizadas** | MongoDB, vía la API de Java | migrado |
| Usuarios y sesión | Firestore | por migrar |
| Familias e hijos | Firestore | por migrar |
| Puntos de la semana | Firestore (`weeklyTasks`) | por migrar |
| Privilegios | Firestore | por migrar |
| FAQs | Firestore (`categorias`) | por migrar |

**Consecuencia práctica y que hay que saber antes de tocar nada:** para que la
aplicación funcione entera hacen falta **tres piezas levantadas**, no una. Está
explicado en [LEVANTAR-EN-LOCAL.md](./LEVANTAR-EN-LOCAL.md).

Si solo se arranca el frontend, todo se ve pero **crear tareas no guarda**: el
formulario envía y no pasa nada. Es el síntoma más confuso del proyecto.

---

## La interfaz

**React 18 con TypeScript**, empaquetado con **Vite**. Rutas con
`react-router-dom` 7.

Lo que la sostiene no son las librerías, es la disciplina de abajo.

### La capa de tokens, en tres niveles

```
Nivel 1  PRIMITIVO    --tps-brand-600: #2563eb                  "qué color es"
Nivel 2  SEMÁNTICO    --tps-action: var(--tps-brand-600)        "para qué sirve"
Nivel 3  COMPONENTE   --tps-btn-primary-bg: var(--tps-action)   "quién lo usa"
```

La regla: **un componente nunca nombra un color, nombra un rol.**

La consecuencia que lo paga todo: **el modo oscuro es redefinir el nivel 2**. No
se reescribe ni un componente. Veinte declaraciones bajo `:root.dark`
sustituyen a lo que antes eran 521 clases `dark:` escritas a mano.

Por eso son custom properties de CSS y no variables de Sass: **las de Sass se
resuelven en compilación y desaparecen**, así que cuando el usuario pulsa el
interruptor ya no existen.

### El design system

Ocho piezas en `src/components/ui/`, y **ninguna acepta `className`**:

`Button` · `Field` · `Checkbox` · `Card` · `Modal` · `Tabs` · `Accordion` · `ThemeToggle`

```ts
Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'>
```

Esa línea convierte el sistema de convención en regla: **no es algo que
recordar en la revisión, es que no compila**.

Y en `tailwind.config.js` se **sustituye** `theme.colors` en vez de extenderlo,
así que `bg-blue-500` y `text-gray-400` no existen. No es una norma que se
vigila: es una clase que no está.

**Pero cerrar sin dar alternativa es lo que hace que la gente se salte el
sistema.** Por eso cada uso legítimo tiene su prop: `layout` en `Button`, `icon`
y `padding` en `Card`, `labelHidden` en `Field`. Salieron de medir qué se pasaba
de verdad, no de imaginarlo.

### Accesibilidad

No es una capa encima: **está dentro de los componentes**, que es lo único que
escala.

- `Field` obliga a poner etiqueta **en el tipo**, y cablea `aria-invalid` y
  `aria-describedby` solo. Quien lo usa no puede olvidarse porque ni los
  escribe.
- `Modal` trae trampa de foco, cierre con Escape y devolución del foco.
- `Tabs` implementa el patrón de WAI-ARIA con tabindex móvil.
- El contraste **se mide en los tests**: 21 estados por dos modos.

Los hallazgos y su estado están en
[AUDITORIA-ACCESIBILIDAD.md](./AUDITORIA-ACCESIBILIDAD.md).

---

## El backend

**Spring Boot 4.1 sobre Java 17**, con Maven. Diez clases, `backend/`.

| Pieza | Para qué |
|---|---|
| `spring-boot-starter-webmvc` | la API REST |
| `spring-boot-starter-data-mongodb` | persistencia |
| `spring-boot-starter-validation` | validación de entrada |
| `spring-boot-starter-actuator` | `/actuator/health` |

Hoy expone un solo dominio, `/api/tasks`, con GET, POST, PUT y DELETE.

Dos decisiones que están en el código y conviene no deshacer sin querer:

- **`Task` es un record inmutable**, así que la actualización es un `PUT` con la
  tarea entera y no un `PATCH` por campos. No hay forma de dejarla a medias.
- **Los errores dicen qué hacer.** Mandar un tipo inválido devuelve
  `tipo de tarea desconocido: 'diaria'. Validos: diarias, extra`, no un 400
  pelado.

---

## Las pruebas

**290 tests** con Vitest y Testing Library. No son solo de comportamiento: hay
tres clases distintas, y las dos últimas son las que evitan que el sistema se
deshaga.

| Tipo | Qué vigila |
|---|---|
| Comportamiento | que los componentes hagan lo suyo, sobre todo **con teclado** |
| **Contraste** | 21 pares de color por dos modos, calculando WCAG sobre los hex reales |
| **Guardas de arquitectura** | que no vuelvan a entrar `<input>` crudos, ni colores de paleta en `ui/`, ni un `<Button>` de solo icono sin nombre |

Las guardas existen porque **los tipos no lo pueden todo**: un icono es un
`ReactNode` perfectamente válido dentro de `children`, así que TypeScript no
puede impedir un botón sin nombre accesible. Un test que recorre `src/` sí.

**Ojo con el typecheck.** `npx tsc --noEmit` a secas **no comprueba nada** en
este repo: el `tsconfig.json` de la raíz es `{ "files": [], "references": [...] }`
y compila cero ficheros. Hay que usar `npm run typecheck`, que es `tsc -b`.

---

## Storybook

`npm run storybook`, en el 6006. Es la documentación viva del sistema.

- **Fundamentos** — la paleta y el porqué de cada regla
- **UI** — las ocho piezas
- **Producto** — las que ya saben de tareas y de puntos

Once stories llevan función `play`: **tests que se pueden mirar**, con pausa y
rebobinado. Empieza por `UI/Tabs > Navegacion`, donde se ve lo que hace el
teclado y no sale en una captura.

Se publica solo al empujar a `main`, y el workflow comprueba tipos y pasa los
tests **antes** de publicar.

---

## Lo que falta, y está escrito

| Documento | Qué cuenta |
|---|---|
| [LEVANTAR-EN-LOCAL.md](./LEVANTAR-EN-LOCAL.md) | las tres piezas y sus trampas |
| [MODELO-DE-ROLES.md](./MODELO-DE-ROLES.md) | por qué el rol actual no da para lo que hace falta |
| [PENDIENTES-ADMIN.md](./PENDIENTES-ADMIN.md) | el agujero de propiedad entre familias |
| [DESIGN-SYSTEM-PROPUESTA.md](./DESIGN-SYSTEM-PROPUESTA.md) | el diagnóstico del que salió todo |
| [AUDITORIA-ACCESIBILIDAD.md](./AUDITORIA-ACCESIBILIDAD.md) | los 54 hallazgos y su estado |
| [MIGRACION-A-JAVA.md](./MIGRACION-A-JAVA.md) | el plan de salida de Firebase |

Lo más urgente de todo eso: **nadie comprueba de qué familia eres**. Cambiando
el identificador de la URL se entra en los puntos de otra familia, y no solo a
mirar. Está en `PENDIENTES-ADMIN.md`, punto 3-bis.
