# Propuesta de Design System

**Proyecto**: teenage-points-system
**Stack**: React 18 + TypeScript + Vite + TailwindCSS 3.4.15 + React Router 7
**Fecha**: 19/08/2026
**Alcance**: `src/` completo (6.517 líneas de TSX en 24 componentes)

---

## 0. Resumen ejecutivo

El design system **ya existe a medias**. Hay una carpeta `src/components/ui/` con `Button`, `Card`, `Input`, `Modal` y esos componentes se importan en 9 ficheros. Y aun así el código tiene **162 tokens de color Tailwind distintos**, 55 valores de espaciado y 9 tamaños de texto.

La pregunta de partida era: si `ui/Button` existe y se usa en 9 ficheros, ¿por qué siguen apareciendo 163 colores?

La respuesta, medida sobre el código, no es "falta un design system". Es esto:

| Hallazgo | Medida | Fichero |
|---|---|---|
| La API de variantes de `Button` **no se usa nunca** | `variant=` aparece **0 veces** en todo `src/` | `ui/Button.tsx:26-33` |
| `size=` y `loading=` tampoco | **0 usos** de cada uno | `ui/Button.tsx:36-41` |
| `className` se concatena **al final** y pisa la variante | 14 llamadas a `<Button>` traen color propio | `ui/Button.tsx:47` |
| Botones crudos conviviendo con el componente | **55 `<button>` crudos** vs **51 `<Button>`** | 16 ficheros |
| `Input` es **código muerto** | 0 importaciones fuera de sí mismo, **32 `<input>` crudos** | `ui/Input.tsx` |
| Modo oscuro **inalcanzable** | **525 clases `dark:`**, `darkMode: 'class'`, ningún sitio pone la clase `dark` | `tailwind.config.js:6` |
| Tokens de color que **nunca se pintan** | **54 de los 162** solo aparecen dentro de `dark:` | todo `src/` |
| `theme.css` es un volcado de Tailwind v4 en un proyecto v3 | 368 líneas, **0 importaciones** | `src/theme.css` |
| Fichero duplicado byte a byte | mismo MD5 `99034f57…` | `ui/PrivilegeRedemptionModal_temp.tsx` |
| Contrato de tipos completo **sin ninguna implementación** | 220 líneas, 0 importaciones | `types/uiTypes.ts` |

Traducción: **el sistema no falló por falta de componentes, falló porque el componente que existe deja la puerta abierta y nadie tiene motivo para cerrarla.** `<Button className="bg-purple-500">` es más rápido de escribir que abrir `Button.tsx`, añadir una variante y pensar en el nombre. Y funciona. Ese es todo el mecanismo de la deriva.

La propuesta que sigue no es reescribir la UI. Es **cerrar la puerta y estrangular lo viejo por pantallas**, empezando por las dos de adolescentes, que son las que peor están y las que más importan para la motivación.

---

## 1. Diagnóstico

### 1.1 La causa raíz: `className` gana siempre y nadie usa `variant`

`src/components/ui/Button.tsx` define seis variantes tipadas:

```ts
// ui/Button.tsx:5-10
variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
size?: 'sm' | 'md' | 'lg';
loading?: boolean;
```

Y en la línea 47 hace esto:

```ts
// ui/Button.tsx:47
const finalClassName = `${baseClasses} ${sizeClasses[size]} ${disabledClasses} ${className}`;
```

`className` va **el último**. Como no hay `tailwind-merge`, las dos clases conviven en el atributo (`bg-blue-500 bg-gray-500`) y decide el orden del CSS generado, no el del atributo. Comprobado en el bundle real `dist/assets/index-BMzuwz-5.css`:

```
.bg-blue-500   -> offset 26977
.bg-gray-500   -> offset 27707   (gana: va después)
.bg-green-500  -> offset 28076   (gana)
.bg-purple-500 -> offset 28909   (gana)
.bg-yellow-500 -> offset 29641   (gana)
```

Tailwind emite las utilidades **en orden alfabético del nombre de color**. Todos los overrides que hay en el repo (`gray`, `green`, `purple`, `yellow`) caen alfabéticamente después de `blue`, así que **funcionan por casualidad**. Si mañana alguien escribe `<Button className="bg-amber-500">`, `amber` va antes que `blue` y el botón saldrá azul. El equipo no tiene forma de saberlo hasta que lo ve.

El resultado: hay **14 llamadas a `<Button>` que traen su propio color** y ninguna que use `variant`.

```tsx
// dashboard/PrivilegeManagement.tsx:334
<Button onClick={handleAddPrivilege} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600">

// dashboard/TaskManagement.tsx:460
<Button onClick={handleAddTask} className="mt-3 bg-green-500 hover:bg-green-600">

// dashboard/TaskManagement.tsx:497
<Button onClick={handleAddTask} className="mt-3 bg-yellow-500 hover:bg-yellow-600">

// ui/taskForm.tsx:359
<Button type="button" onClick={onCancel} className="flex-1 bg-gray-500 hover:bg-gray-600">
```

Cuatro maneras distintas de decir "acción secundaria" en cuatro sitios. Con `variant="secondary"` ya definido en la línea 28 del componente. Nadie lo usó porque nadie leyó el componente: escribir `className` es más barato que leer.

### 1.2 El bug real que esto ya ha producido

`dashboard/AddEditChild.tsx:182`:

```tsx
<Button onClick={onCancel} className="bg-gray-300">Cancelar</Button>
```

Ese botón se resuelve así:

- fondo: `bg-gray-300` gana a `bg-blue-500` (gray va después en el CSS)
- texto: `text-white` de la variante primary sigue vigente, porque el override no lo tocó
- hover: **no hay override de hover**, así que se aplica `hover:bg-blue-600` de la variante

Es decir: **botón gris claro con texto blanco que se vuelve azul al pasar el ratón.**

Contraste de blanco `#FFFFFF` sobre `gray-300` `#D1D5DB`: **1,47:1**. WCAG AA exige 4,5:1. No es una preferencia estética, es texto ilegible en el botón de cancelar del formulario de alta de hijos.

Ese bug es la demostración de que el problema no es "el design system no existe", sino que **el componente permite estados que el diseñador nunca aprobó**.

### 1.3 Botones crudos: 55 frente a 51 del componente

| Fichero | `<button>` crudos | `<Button>` |
|---|---:|---:|
| `dashboard/RewardTracker.tsx` | 25 | 0 |
| `dashboard/Dashboard.tsx` | 6 | 11 |
| `dashboard/ChildView.tsx` | 5 | 0 |
| `dashboard/TaskManagement.tsx` | 3 | 7 |
| `dashboard/PrivilegeManagement.tsx` | 3 | 4 |
| `dashboard/FaqAdmin.tsx` | 0 | 11 |
| `components/ShareChildLink.tsx` | 0 | 7 |
| resto (App, auth, TaskCard, TaskTable, PrivilegeCard, …) | 13 | 0 |

Fíjate en el patrón: **las dos pantallas de adolescentes, `RewardTracker` (25 crudos) y `ChildView` (5 crudos), no importan `Button` en absoluto.** Solo importan `Card`. Son justo las pantallas donde la motivación depende del acabado visual.

Hay un cómplice silencioso. `src/globals.css:29-35`:

```css
button {
  @apply bg-primary-500 text-white dark:bg-primary-600 py-2 px-4 rounded transition-colors;
}
button:hover {
  @apply bg-primary-600 dark:bg-primary-700;
}
```

Cualquier `<button>` crudo **ya sale azul y con padding**. Queda "suficientemente bien". Nadie nota que falta el componente. Esa regla global es la anestesia que impide sentir el dolor que te haría refactorizar.

### 1.4 `Input` es código muerto y nadie se enteró

`ui/Input.tsx` (65 líneas) **no se importa en ningún fichero**. Mientras tanto hay **32 `<input>` crudos** repartidos así:

```
RewardTracker.tsx      11
FaqAdmin.tsx            7
taskForm.tsx            3
TaskManagement.tsx      3
PrivilegeManagement.tsx 3
AddEditChild.tsx        3
auth/Signup.tsx         3
...
```

Y cada uno reinventa el mismo bloque de clases. Compara:

```tsx
// ui/taskForm.tsx:198 (dentro de la propia carpeta ui/)
className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ...`}

// ui/Input.tsx:48 (el componente que nadie usa)
className={`w-full p-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ... focus:ring-primary-500`}

// dashboard/AddEditChild.tsx:121
className="mt-1 block w-full p-3 rounded-md border-gray-300 ... focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
```

Tres inputs: `p-3` / `p-2` / `p-3`, `rounded-lg` / `rounded-md` / `rounded-md`, `ring-2` / `ring-1` / (por defecto), `ring-blue-500` / `ring-primary-500` / `ring-primary-500`. Y `taskForm.tsx` vive **dentro de `ui/`**, o sea que ni el propio design system usa su propio input.

Esto ya no es deriva. Es que `Input` nació mal (API con `value`/`onChange` obligatorios y sin `...rest`, sin soporte para `select` ni `textarea`) y todo el mundo lo esquivó en silencio.

### 1.5 Dos sistemas de color paralelos que no se hablan

`tailwind.config.js` define una rampa `primary` completa (50 a 900, que es exactamente el `blue` de Tailwind) y un `secondary`. Pero:

- `primary-*` se usa en **5 sitios** de TSX: `CompleteProfile.tsx:49`, `AddEditChild.tsx:121,134,165`, `ui/Input.tsx:51`
- `blue-*` se usa en **184 ocurrencias**
- `secondary` (`#4f46e5`) **no se usa nunca**

Y el propio `ui/Button.tsx:27` escribe `bg-blue-500` en vez de `bg-primary-500`. El token de marca existe en la config y el componente de marca lo ignora.

Reparto de familias de color en TSX:

```
gray     727
blue     184
green    140
red       94
purple    83
yellow    78
orange    36
pink       7
cyan       5
indigo     2
```

Diez familias. `cyan` sale del `variant="info"` que nadie usa, `indigo` de dos sitios sueltos.

### 1.6 El color se usa como decoración, no como semántica

Es la razón de fondo de que haya tantos tokens. Mira `ChildView.tsx:432-455` y su gemelo en `RewardTracker.tsx:814-830`:

```tsx
<button className="w-full p-3 bg-blue-500   ...">🌅 Hoy</button>
<button className="w-full p-3 bg-green-500  ...">🌤️ Mañana</button>
<button className="w-full p-3 bg-purple-500 ...">🎈 Este fin de semana</button>
<button className="w-full p-3 bg-orange-500 ...">📅 Elegir fecha</button>
<button className="w-full p-3 bg-gray-500   ...">❌ Cancelar</button>
```

Cinco colores para cinco opciones que **son la misma acción** con distinto parámetro de fecha. Un adolescente lee ahí que "mañana" es más seguro que "este fin de semana" porque uno es verde y otro morado. No lo es. El color está mintiendo.

Un design system no arregla esto solo con tokens. Lo arregla **quitándole al desarrollador la posibilidad de elegir color**, y dándole en su lugar un `variant` que describa la intención (`primary`, `neutral`, `danger`), no el pigmento.

Ese mismo bloque, además, **está duplicado dentro de `RewardTracker.tsx`**: líneas 795-870 y 955-1030 son la misma tarjeta de privilegio renderizada dos veces (una para privilegios personalizados, otra para los de `rewardConfig`). Copiar y pegar es también cómo se duplican los colores.

### 1.7 Modo oscuro: 525 clases que nunca se pintan

`tailwind.config.js:6` dice `darkMode: 'class'`. Eso significa que las variantes `dark:` solo se activan si algún ancestro lleva la clase `dark`.

Búsqueda en todo el repo de código que ponga esa clase (`classList`, `documentElement`, `'dark'` fuera de `dark:`): **cero resultados**. `index.html` tampoco la lleva.

Hay **525 clases `dark:`** escritas. Ninguna se pinta jamás.

Y **54 de los 162 tokens de color distintos aparecen exclusivamente dentro de `dark:`**. Es decir, **un tercio del inventario de color del proyecto es CSS inalcanzable**. La cifra real de tokens que un usuario puede llegar a ver es 89, no 163.

Esto abre una decisión que hay que tomar **antes** de tocar los tokens, porque cambia el trabajo por un factor de dos:

- **Opción A, activar dark**: añadir el toggle y persistencia. Coste bajo en código (20 líneas), coste alto en verificación: hay que revisar 525 clases que nunca nadie ha mirado renderizadas, y varias son sospechosas ya a ojo (`PrivilegeCard.tsx:27` pone `dark:bg-black`, cuando el resto del sistema usa `dark:bg-gray-800`).
- **Opción B, borrar dark**: `sd 'dark:[a-z0-9:/\[\]-]+ ?' ''` sobre los TSX. Elimina 525 clases y 54 tokens de golpe, deja el diff enorme pero mecánico, y el sistema queda honesto.
- **Opción C, tokenizar primero y que el dark salga gratis**: si el color pasa a variables CSS (sección 2), el modo oscuro se resuelve **redefiniendo 20 variables en `:root.dark`**, no repitiendo 525 clases.

**Recomendación: C.** Es la única que convierte el problema en activo en lugar de en deuda. Se implementa en la fase 1 y hasta entonces las `dark:` viejas siguen ahí sin molestar.

### 1.8 Inventario: qué se queda, qué se endurece, qué se borra

| Fichero | Estado | Veredicto |
|---|---|---|
| `ui/Button.tsx` | usado 51 veces, API ignorada | **Endurecer.** Es la pieza clave |
| `ui/Card.tsx` | usado ~78 veces (Card + subcomponentes) | **Endurecer.** Es lo que mejor ha funcionado |
| `ui/Modal.tsx` | usado en 5 ficheros | **Endurecer** (a11y: sin `role="dialog"`, sin Esc, sin focus trap) |
| `ui/Input.tsx` | **0 importaciones**, 32 inputs crudos fuera | **Reescribir** como `Field`. Su API actual es el motivo de su muerte |
| `ui/taskForm.tsx` | usado por `TaskManagement` | **Mover** a `components/dashboard/`. Es de dominio, no de UI. 387 líneas de formulario de tareas no son un primitivo |
| `ui/PrivilegeRedemptionModal.tsx` | usado por `PrivilegeCard` | **Mover** a dominio. Mismo motivo |
| `ui/PrivilegeRedemptionModal_temp.tsx` | **MD5 idéntico al anterior** | **Borrar.** Copia literal |
| `src/theme.css` | 368 líneas, **0 importaciones** | **Borrar.** Es un volcado de `@layer theme` de **Tailwind v4** (colores en `oklch()`, `--spacing`, `--radius-*`) en un proyecto que corre **Tailwind 3.4.15**. No es una capa de tokens aprovechable: es el output de otra versión del compilador. Lo útil de él (la escala de radios, la de sombras) se replica a mano en la config nueva, que son 20 líneas |
| `types/uiTypes.ts` | 220 líneas, **0 importaciones** | **Aprovechar parcialmente.** Contiene el contrato de `Badge`, `Alert`, `Progress`, `Spinner`, `Tabs`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Avatar`, `Tooltip`… todos **sin implementación**. Alguien diseñó el sistema entero en tipos y nunca lo construyó. Sirve como lista de deseos, no como contrato: la mayoría de esas piezas no cumplen la regla de tres (ver 4.1) |
| `dashboard/TaskCard.tsx` | **no se importa en ninguna pantalla**, solo desde su story | **Decidir.** Hoy solo existe para Storybook. O se usa en `ChildView`, o se borra |
| `dashboard/TaskTable.tsx` | usado, 47 líneas | Absorber en `Table` cuando llegue el momento. Baja prioridad |
| `dashboard/PrivilegeCard.tsx` | 50 líneas, `dark:bg-black` suelto | **Reescribir** sobre los tokens. Es el candidato natural a absorber los bloques duplicados de `RewardTracker` 795-870 y 955-1030 |

### 1.9 Accesibilidad: lo que ya está roto

| Problema | Medida | Dónde |
|---|---|---|
| Texto blanco sobre `gray-300` | **1,47:1** (AA pide 4,5) | `AddEditChild.tsx:182` |
| Variante `warning` = blanco sobre `yellow-500` | **1,92:1** | `ui/Button.tsx:31` (no usada, pero es una trampa armada) |
| `text-gray-400` sobre fondo claro | **2,54:1** | `Dashboard.tsx:337,429,452,590,605`, `TaskManagement.tsx:371` |
| Botones de icono de 24x24 px | AA pide 44x44 | `p-1` en `RewardTracker.tsx:691,885,892`, `TaskManagement.tsx:741,748`, `PrivilegeManagement.tsx:463,470` |
| Botones de solo icono sin `aria-label` | 7 botones editar/borrar sin nombre accesible | mismos ficheros |
| `Modal` sin `role="dialog"`, sin `aria-modal`, sin trampa de foco, sin cierre con Esc | | `ui/Modal.tsx` |

Nota: `@storybook/addon-a11y` **ya está instalado** (`package.json`). Está apuntando a estos fallos ahora mismo y nadie ha mirado el panel. Cada componente nuevo del sistema entra con su story, y ese addon es el control de calidad gratis.

---

## 2. Tokens en tres niveles

La regla que ordena todo: **un componente nunca nombra un color. Nombra un rol.**

```
Nivel 1  PRIMITIVO    --tps-blue-500: #3b82f6      "qué color es"
Nivel 2  SEMÁNTICO    --tps-action: var(--tps-blue-600)   "para qué sirve"
Nivel 3  COMPONENTE   --tps-btn-primary-bg: var(--tps-action)   "quién lo usa"
```

Un componente solo puede tocar el nivel 3. Una pantalla solo puede tocar el nivel 2. El nivel 1 no lo toca nadie salvo el fichero de tokens. Así, cambiar la marca es editar seis líneas, y el modo oscuro o el tono adolescente es **redefinir el nivel 2**, no reescribir componentes.

### 2.1 Nivel 1: primitivos

De 162 tokens a **31 primitivos de color**. Se conservan los hex de Tailwind donde ya se usaban, para que la migración sea visualmente invisible salvo donde queríamos cambiarlo.

`src/styles/tokens.css` (fichero nuevo, importado desde `globals.css`):

```css
:root {
  /* ---------- NIVEL 1: PRIMITIVOS ---------- */

  /* Neutros (base gray de Tailwind: 727 usos, es el esqueleto) */
  --tps-neutral-0:   #ffffff;
  --tps-neutral-50:  #f9fafb;
  --tps-neutral-100: #f3f4f6;
  --tps-neutral-200: #e5e7eb;
  --tps-neutral-300: #d1d5db;
  --tps-neutral-500: #6b7280;
  --tps-neutral-600: #4b5563;
  --tps-neutral-700: #374151;
  --tps-neutral-800: #1f2937;
  --tps-neutral-900: #111827;

  /* Marca. Azul: 184 usos, ya es la identidad de facto */
  --tps-brand-50:  #eff6ff;
  --tps-brand-100: #dbeafe;
  --tps-brand-500: #3b82f6;
  --tps-brand-600: #2563eb;
  --tps-brand-700: #1d4ed8;
  --tps-brand-900: #1e3a8a;

  /* Acento. Morado: 83 usos, es la energía del lado adolescente */
  --tps-accent-50:  #faf5ff;
  --tps-accent-500: #a855f7;
  --tps-accent-600: #9333ea;
  --tps-accent-700: #7e22ce;

  /* Positivo. Verde: 140 usos (tarea hecha, privilegio disponible) */
  --tps-positive-50:  #f0fdf4;
  --tps-positive-500: #22c55e;
  --tps-positive-600: #16a34a;
  --tps-positive-700: #15803d;

  /* Atención. AMBER, no yellow. yellow-500 con texto blanco da 1,92:1
     y ya está escrito en Button.tsx:31. amber-600 con blanco da 4,6:1 */
  --tps-caution-50:  #fffbeb;
  --tps-caution-500: #f59e0b;
  --tps-caution-600: #d97706;
  --tps-caution-700: #b45309;

  /* Negativo. Rojo: 94 usos */
  --tps-negative-50:  #fef2f2;
  --tps-negative-500: #ef4444;
  --tps-negative-600: #dc2626;
  --tps-negative-700: #b91c1c;
}
```

Las cuatro familias que desaparecen y a dónde van:

| Familia | Usos | Sustituto | Motivo |
|---|---:|---|---|
| `yellow` | 78 | `caution` (amber) | `yellow-500` + blanco = 1,92:1. Amber es el mismo mensaje y pasa AA |
| `orange` | 36 | `caution` | Era un tercer nivel de urgencia que el producto no tiene |
| `pink` | 7 | `accent` | Solo aparece en gradientes decorativos de `ChildView` y `RewardTracker` |
| `cyan` | 5 | `brand` | Venía del `variant="info"` que nunca se usó |
| `indigo` | 2 | `brand` | Dos sitios sueltos, sin intención |

### 2.2 Nivel 2: semánticos

Aquí es donde padres y adolescentes se separan **sin duplicar ni un primitivo**.

```css
:root {
  /* ---------- NIVEL 2: SEMÁNTICOS (por defecto = tono PADRES) ---------- */

  /* Superficies */
  --tps-bg-page:     var(--tps-neutral-50);
  --tps-bg-surface:  var(--tps-neutral-0);
  --tps-bg-sunken:   var(--tps-neutral-100);
  --tps-bg-overlay:  rgb(0 0 0 / 0.5);

  /* Bordes */
  --tps-border:        var(--tps-neutral-200);
  --tps-border-strong: var(--tps-neutral-300);

  /* Texto. Ojo: --tps-text-muted es neutral-500 (4,83:1 sobre blanco).
     NUNCA neutral-400, que da 2,54:1 y es el fallo de Dashboard.tsx:337 */
  --tps-text:         var(--tps-neutral-900);
  --tps-text-muted:   var(--tps-neutral-500);
  --tps-text-inverse: var(--tps-neutral-0);

  /* Acción principal */
  --tps-action:       var(--tps-brand-600);
  --tps-action-hover: var(--tps-brand-700);
  --tps-action-fg:    var(--tps-neutral-0);

  /* Acción secundaria (mata los 4 grises distintos de "Cancelar") */
  --tps-neutral-action:       var(--tps-neutral-100);
  --tps-neutral-action-hover: var(--tps-neutral-200);
  --tps-neutral-action-fg:    var(--tps-neutral-800);

  /* Estados */
  --tps-positive:    var(--tps-positive-600);
  --tps-positive-bg: var(--tps-positive-50);
  --tps-caution:     var(--tps-caution-600);
  --tps-caution-bg:  var(--tps-caution-50);
  --tps-negative:    var(--tps-negative-600);
  --tps-negative-bg: var(--tps-negative-50);

  /* Foco. Un solo anillo en toda la app */
  --tps-focus-ring: var(--tps-brand-500);

  /* Deshabilitado */
  --tps-disabled-bg: var(--tps-neutral-200);
  --tps-disabled-fg: var(--tps-neutral-500);  /* 5,13:1 sobre neutral-200, AA OK */

  /* Ritmo visual: los padres quieren densidad */
  --tps-radius:       0.5rem;   /* rounded-lg, 102 usos, es el consenso */
  --tps-radius-pill:  9999px;
  --tps-density:      1;
  --tps-shadow:       0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --tps-shadow-raised:0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
```

**El tono adolescente**: misma marca, otro tono. Se activa con un atributo en la raíz de la ruta, no con clases sueltas por componente.

```css
/* Se aplica en /child-view/:familyId/:childId y /reward-tracker/... */
[data-audience="teen"] {
  /* La marca es la misma. Lo que cambia es quién manda:
     en el lado adolescente el acento sube a acción principal. */
  --tps-action:       var(--tps-accent-600);
  --tps-action-hover: var(--tps-accent-700);

  /* Fondo cálido en vez de gris administrativo */
  --tps-bg-page: linear-gradient(160deg, var(--tps-brand-50), var(--tps-accent-50));

  /* Más aire y más redondeo: es móvil y son sesiones de 10 segundos */
  --tps-radius:  0.75rem;
  --tps-density: 1.15;   /* multiplica el padding de los componentes */

  /* El progreso es LO que vienen a ver: se le da su propio rol */
  --tps-progress-track: var(--tps-neutral-200);
  --tps-progress-fill:  linear-gradient(90deg,
                          var(--tps-caution-500),
                          var(--tps-accent-500));
}
```

Con esto, el gradiente `from-blue-500 to-purple-600` de `ChildView.tsx:189` y el `from-yellow-400 to-orange-500` de `ChildView.tsx:493` dejan de ser decisiones de un componente y pasan a ser **el tono de una audiencia**, definido en un sitio.

### 2.3 Nivel 3: de componente

```css
:root {
  /* ---------- NIVEL 3: COMPONENTE ---------- */
  --tps-btn-primary-bg:       var(--tps-action);
  --tps-btn-primary-bg-hover: var(--tps-action-hover);
  --tps-btn-primary-fg:       var(--tps-action-fg);

  --tps-btn-neutral-bg:       var(--tps-neutral-action);
  --tps-btn-neutral-bg-hover: var(--tps-neutral-action-hover);
  --tps-btn-neutral-fg:       var(--tps-neutral-action-fg);

  --tps-btn-danger-bg:        var(--tps-negative);
  --tps-btn-danger-bg-hover:  var(--tps-negative-700);
  --tps-btn-danger-fg:        var(--tps-text-inverse);

  --tps-card-bg:     var(--tps-bg-surface);
  --tps-card-border: var(--tps-border);
  --tps-card-shadow: var(--tps-shadow);

  --tps-field-bg:           var(--tps-bg-surface);
  --tps-field-border:       var(--tps-border-strong);
  --tps-field-border-focus: var(--tps-focus-ring);
  --tps-field-border-error: var(--tps-negative);
}
```

Parece redundante y es deliberado. Es la capa que te deja decir "los botones primarios de esta app son un punto más oscuros" sin tocar el resto del sistema de acciones.

### 2.4 Modo oscuro: 20 líneas en vez de 525 clases

```css
:root.dark {
  --tps-bg-page:     var(--tps-neutral-900);
  --tps-bg-surface:  var(--tps-neutral-800);
  --tps-bg-sunken:   var(--tps-neutral-900);
  --tps-border:        var(--tps-neutral-700);
  --tps-border-strong: var(--tps-neutral-600);
  --tps-text:        var(--tps-neutral-50);
  --tps-text-muted:  var(--tps-neutral-300);   /* sube de 500 a 300: contraste */
  --tps-action:       var(--tps-brand-500);
  --tps-action-hover: var(--tps-brand-600);
  --tps-neutral-action:       var(--tps-neutral-700);
  --tps-neutral-action-hover: var(--tps-neutral-600);
  --tps-neutral-action-fg:    var(--tps-neutral-100);
  --tps-positive-bg: rgb(34 197 94 / 0.15);
  --tps-caution-bg:  rgb(245 158 11 / 0.15);
  --tps-negative-bg: rgb(239 68 68 / 0.15);
  --tps-disabled-bg: var(--tps-neutral-700);
  --tps-disabled-fg: var(--tps-neutral-400);
  --tps-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.5);
}

[data-audience="teen"].dark,
.dark [data-audience="teen"] {
  --tps-bg-page: linear-gradient(160deg, var(--tps-neutral-900), var(--tps-accent-700));
}
```

**Ese es el argumento completo a favor de tokenizar.** 20 declaraciones sustituyen a las 525 clases `dark:` que hoy no se pintan y que nadie ha revisado nunca.

### 2.5 Enganche a `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    // OJO: 'colors' (sustituye), no 'extend.colors' (añade).
    // Sustituir es lo que hace IMPOSIBLE escribir bg-purple-500 por accidente:
    // la clase deja de existir y el build falla en revisión, no en producción.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',

      surface: {
        DEFAULT: 'var(--tps-bg-surface)',
        page:    'var(--tps-bg-page)',
        sunken:  'var(--tps-bg-sunken)',
      },
      content: {
        DEFAULT: 'var(--tps-text)',
        muted:   'var(--tps-text-muted)',
        inverse: 'var(--tps-text-inverse)',
      },
      line: {
        DEFAULT: 'var(--tps-border)',
        strong:  'var(--tps-border-strong)',
      },
      action: {
        DEFAULT: 'var(--tps-action)',
        hover:   'var(--tps-action-hover)',
        fg:      'var(--tps-action-fg)',
      },
      positive: { DEFAULT: 'var(--tps-positive)', bg: 'var(--tps-positive-bg)' },
      caution:  { DEFAULT: 'var(--tps-caution)',  bg: 'var(--tps-caution-bg)'  },
      negative: { DEFAULT: 'var(--tps-negative)', bg: 'var(--tps-negative-bg)' },
    },

    borderRadius: {
      none: '0',
      DEFAULT: 'var(--tps-radius)',
      pill: 'var(--tps-radius-pill)',
      full: '9999px',
    },

    boxShadow: {
      none: 'none',
      DEFAULT: 'var(--tps-shadow)',
      raised:  'var(--tps-shadow-raised)',
    },

    // Escala de espaciado cerrada (sección 3)
    spacing: {
      0: '0',
      px: '1px',
      1: '0.25rem',   /* 4  */
      2: '0.5rem',    /* 8  */
      3: '0.75rem',   /* 12 */
      4: '1rem',      /* 16 */
      6: '1.5rem',    /* 24 */
      8: '2rem',      /* 32 */
      12: '3rem',     /* 48 */
      16: '4rem',     /* 64 */
    },

    fontSize: {
      xs:   ['0.75rem',  { lineHeight: '1rem' }],
      sm:   ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem',     { lineHeight: '1.5rem' }],
      lg:   ['1.125rem', { lineHeight: '1.75rem' }],
      xl:   ['1.5rem',   { lineHeight: '2rem' }],
      display: ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
      hero:    ['3.75rem', { lineHeight: '1',      fontWeight: '700' }],
    },

    extend: {
      ringColor:   { DEFAULT: 'var(--tps-focus-ring)' },
      ringOffsetColor: { DEFAULT: 'var(--tps-bg-surface)' },
    },
  },
  plugins: [],
}
```

Aquí está el mecanismo real de contención, y conviene entenderlo bien: **sustituir `theme.colors` en vez de extenderlo elimina `bg-purple-500`, `bg-yellow-500`, `text-gray-400` del universo de clases posibles.** Ya no es una convención que alguien recuerda en la revisión. Es que la clase no existe y el elemento sale sin fondo. La deriva pasa de "hay que vigilarla" a "no compila bien".

Coste honesto: **es un cambio que rompe todo el TSX existente el día que se activa**. Por eso va en la fase 4 del plan, no en la 1. Hasta entonces se convive con `extend`.

---

## 3. Escalas de espaciado y tipografía

### 3.1 Espaciado: de 55 valores a 8

Hoy hay 55 combinaciones distintas de `p-*`, `m-*`, `gap-*`, `space-*`. Las más usadas son `mb-4` (63), `p-3` (54), `gap-2` (54), `p-4` (44), `mb-2` (42), `mt-1` (41). El ruido está en la cola larga: `py-1.5`, `mb-px`, `space-x-8`, `px-1`, `mt-3`, `pt-3`, `mx-4`.

Escala cerrada, base 4 px:

| Token | px | Regla de uso: **cuándo se usa este y no otro** |
|---|---:|---|
| `1` | 4 | Separación dentro de un átomo. Icono y su texto. Chip y su punto |
| `2` | 8 | Separación entre elementos hermanos que forman una sola unidad. `gap` de una fila de botones. Padding vertical de un chip |
| `3` | 12 | Padding interno de un control interactivo: botón, campo, celda de tabla. **Es el único padding de control** |
| `4` | 16 | Padding interno de un contenedor (Card). Separación entre bloques dentro de una Card |
| `6` | 24 | Separación entre Cards. Padding de Card en tono adolescente |
| `8` | 32 | Separación entre secciones de una pantalla |
| `12` | 48 | Márgenes de página en escritorio. Padding vertical de estados vacíos |
| `16` | 64 | Solo cabeceras hero y estados vacíos a pantalla completa |

Mapeo de migración (búsqueda y reemplazo mecánico):

```
p-1  -> p-1      py-1   -> py-1     py-1.5 -> py-2     px-1 -> px-1
p-2  -> p-2      mt-3   -> mt-2     pt-3   -> pt-2     mx-4 -> mx-4
p-3  -> p-3      mb-3   -> mb-4     ml-1   -> ml-1     mb-px -> mb-1
p-4  -> p-4      gap-1  -> gap-1    space-x-8 -> gap-8
p-6  -> p-6      py-3   -> py-3
py-12 -> py-12   px-8   -> px-8
```

Solo se mueven 8 valores. **La escala no cambia el diseño, cierra el conjunto.** Lo que impide que vuelva a crecer es la sustitución de `theme.spacing` (sección 2.5): `mt-3` deja de existir.

Sobre `--tps-density`: los componentes leen el padding así, para que el tono adolescente respire más sin duplicar componentes:

```css
.tps-card { padding: calc(1rem * var(--tps-density)); }
```

### 3.2 Tipografía: de 9 tamaños a 7, en dos escalas

Uso actual: `text-sm` (119), `text-xs` (48), `text-lg` (37), `text-xl` (31), `text-2xl` (27), `text-6xl` (8), `text-3xl` (7), `text-4xl` (6), `text-base` (1).

Lo revelador: **`text-base` se usa 1 vez y `text-sm` 119.** El cuerpo de texto real de la app es 14 px. Eso está bien para el panel de padres y es demasiado pequeño para el móvil de un adolescente. De ahí que haya dos escalas y no una.

| Token | Padres | Adolescentes | Para qué |
|---|---|---|---|
| `xs` | 12 / 16 | 12 / 16 | Metadatos, contadores de caracteres, marcas de tiempo. Nunca información necesaria |
| `sm` | 14 / 20 | 14 / 20 | Etiquetas de formulario, texto secundario, celdas de tabla |
| `base` | 14 / 20 | **16 / 24** | Cuerpo. **El único token que difiere entre audiencias** |
| `lg` | 18 / 28 | 18 / 28 | Título de Card, `CardTitle` |
| `xl` | 24 / 32 | 24 / 32 | Título de sección |
| `display` | 36 / 40 | 36 / 40 | Título de pantalla |
| `hero` | 60 / 1 | 60 / 1 | **Solo el marcador de puntos.** `ChildView.tsx:191` |

`text-3xl` y `text-4xl` (13 usos entre ambos) colapsan en `display`. `text-2xl` colapsa en `xl`.

Pesos: **tres, no más.** `400` cuerpo, `500` etiquetas y botones, `700` títulos y el marcador. Se prohíbe `font-semibold` (600): hoy convive con `font-bold` sin criterio (`ChildView.tsx:393` usa `font-semibold`, la línea 191 usa `font-bold`, para jerarquías equivalentes).

Un apunte que va más allá de la escala: `globals.css:10` declara `font-family: Switzer, system-ui, sans-serif` y **Switzer no se carga en ningún sitio** (no hay `@font-face`, no hay link a fuentes). La app entera está renderizando en `system-ui` desde el primer día. O se carga Switzer con `font-display: swap`, o se quita del stack y se deja de mentir.

---

## 4. El set mínimo de componentes

### 4.1 Regla de tres

Un patrón se extrae a componente cuando aparece **tres veces o más**. Ni antes (abstracción prematura) ni después (ya se ha bifurcado). Aplicada al código real:

| # | Componente | Ocurrencias hoy | Estado | Rentabilidad |
|---|---|---:|---|---|
| 1 | `Button` | 106 (55 crudos + 51) | **existe, endurecer** | Altísima |
| 2 | `Field` (input/select/textarea) | 32 inputs + selects + textareas | **existe muerto, reescribir** | Altísima |
| 3 | `Card` | ~78 | **existe, endurecer** | Alta |
| 4 | `IconButton` | 7, todas rompen a11y | **no existe, extraer** | Alta (arregla 7 bugs) |
| 5 | `ProgressBar` | 3 | **no existe, extraer** | Alta (es el corazón del lado adolescente) |
| 6 | `Badge` | ~6 | **no existe, extraer** | Media |
| 7 | `EmptyState` | 5 | **no existe, extraer** | Media |
| 8 | `Modal` | 5 | **existe, endurecer a11y** | Media |
| 9 | `StatTile` | 4 | **no existe, extraer** | Media |
| 10 | `PrivilegeCard` | 2 copias literales | **existe, reescribir** | Media |

**Explícitamente fuera** (no cumplen la regla de tres, aunque `uiTypes.ts` los tenga tipados): `Tabs` (1 uso, en `Dashboard`), `Tooltip` (0), `Avatar` (0), `Switch` (0), `Alert` (0, se usa `react-toastify`), `Dropdown` (0), `Radio` (0), `Spinner` como componente público (vive dentro de `Button` y `Field`). Construirlos ahora es inventar trabajo. `types/uiTypes.ts` es un catálogo de deseos, no un contrato pendiente.

### 4.2 `Button`: endurecer

El cambio de fondo es **quitar `className` del contrato público** y sustituirlo por dos props cerradas.

```ts
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Intención de la acción. NUNCA un color. */
export type ButtonVariant =
  | 'primary'    // la acción que quieres que haga
  | 'neutral'    // cancelar, cerrar, volver
  | 'danger'     // borrar, revocar
  | 'ghost';     // acción terciaria dentro de una lista

export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Union CERRADA de utilidades de layout permitidas.
 * Es lo único que un consumidor puede aportar al aspecto del botón.
 * Motivo: el 100% de los className legítimos del repo hoy son de esta forma
 * (flex-1, w-full, mt-*). El resto eran colores, y eso es justo lo que se cierra.
 */
export type ButtonLayout = 'auto' | 'full' | 'grow';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  layout?: ButtonLayout;
  loading?: boolean;
  /** Obligatorio si children no es texto legible. Ver IconButton. */
  'aria-label'?: string;
}
```

`Omit<..., 'className' | 'style'>` es la línea que cierra la puerta. TypeScript rechaza `<Button className="bg-purple-500">` en tiempo de compilación, con mensaje claro.

Variantes tokenizadas, sin un solo color literal:

```ts
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-action text-action-fg hover:bg-action-hover',
  neutral: 'bg-surface-sunken text-content hover:bg-line',
  danger:  'bg-negative text-content-inverse hover:brightness-90',
  ghost:   'bg-transparent text-action hover:bg-surface-sunken',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-sm',   // min-h-11 = 44px, objetivo táctil AA
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-6 text-lg',
};

const LAYOUT: Record<ButtonLayout, string> = {
  auto: '',
  full: 'w-full',
  grow: 'flex-1',
};
```

Las seis variantes viejas se reducen a cuatro. `success`, `warning` e `info` se eliminan: un botón no es un estado, es una acción. Un botón verde de "guardar" comunica lo mismo que uno azul y añade un color al sistema. `warning` además era una trampa de contraste (1,92:1).

Migración de los 14 overrides actuales:

| Hoy | Mañana |
|---|---|
| `className="bg-gray-500 hover:bg-gray-600"` (x4) | `variant="neutral"` |
| `className="bg-gray-300"` | `variant="neutral"` (y de paso arregla el 1,47:1) |
| `className="bg-purple-500 hover:bg-purple-600"` (x2) | `variant="primary"` |
| `className="bg-green-500 hover:bg-green-600"` | `variant="primary"` |
| `className="bg-yellow-500 hover:bg-yellow-600"` | `variant="primary"` |
| `className="flex-1"` (x3) | `layout="grow"` |
| `className="flex items-center gap-2"` (x3) | nada: el gap ya está en el base |
| `className="mt-3"` / `"mt-2"` (x3) | espaciado del padre, no del botón |

### 4.3 `Field`: reescribir (era `Input`)

Un solo componente para `input`, `select` y `textarea`, porque los 32 inputs crudos, los selects de `taskForm` y los textareas comparten exactamente la misma estructura: etiqueta, control, error, texto de ayuda.

```ts
// src/components/ui/Field.tsx
export type FieldControl = 'input' | 'select' | 'textarea';

interface FieldBase {
  /** Obligatorio. Sin label no hay nombre accesible. */
  label: string;
  name: string;
  /** Oculta el label visualmente pero lo deja para el lector de pantalla. */
  labelHidden?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

export type FieldProps =
  | (FieldBase & { as?: 'input' }
      & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'name'>)
  | (FieldBase & { as: 'textarea'; rows?: number }
      & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'style' | 'name'>)
  | (FieldBase & { as: 'select'; options: ReadonlyArray<{ value: string; label: string }> }
      & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'style' | 'name'>);
```

Tres decisiones deliberadas y por qué:

1. **`label` obligatorio, no opcional.** El `Input` viejo lo tenía opcional (`label?: string`) y por eso los 32 inputs crudos no tienen ninguno. Si el tipo obliga, el problema desaparece de raíz.
2. **`...rest` a través de la unión discriminada.** El `Input` viejo definía `value` y `onChange` a mano y no pasaba el resto de props. Por eso nadie podía usarlo con `maxLength`, `min`, `max` o `type="date"`, que es exactamente lo que necesitaban `taskForm` y `RewardTracker`. Murió por eso.
3. **Cablea `aria-describedby` y `aria-invalid` solo.** El consumidor no puede olvidarse porque ni siquiera lo escribe.

```tsx
// Antes: ui/taskForm.tsx:194-210, 22 líneas de clases repetidas
// Después:
<Field
  label="Nombre de la tarea"
  name="nombre"
  required
  value={formData.nombre}
  onChange={(e) => updateField('nombre', e.target.value)}
  maxLength={50}
  error={errors.nombre}
  hint={`${formData.nombre.length}/50 caracteres`}
/>
```

### 4.4 `Card`: endurecer

Ya funciona bien (78 usos, es la pieza sana del sistema). El problema es que `Card.tsx:11` permite `className` libre y por eso `ChildView.tsx:189` mete un gradiente entero por ahí.

```ts
export type CardTone = 'plain' | 'brand' | 'positive' | 'caution' | 'negative';
export type CardPad  = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;      // por defecto 'plain'
  pad?: CardPad;        // por defecto 'md'
  interactive?: boolean;// añade hover y foco. Si es true, exige onClick o href
  as?: 'div' | 'section' | 'article' | 'li';
}
```

`tone="brand"` es lo que sustituye a `className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"`, y en tono adolescente ese `brand` ya sale morado sin que la Card se entere.

`CardHeader`, `CardTitle`, `CardContent` se quedan como están, sin `className`. `CardTitle` acepta `icon?: IconDefinition` porque el 100% de los usos actuales meten un `FontAwesomeIcon` con `className="flex items-center gap-2"`.

### 4.5 `IconButton`: extraer

Los 7 botones de editar y borrar del repo comparten forma y comparten los mismos dos bugs: 24 px de zona táctil y ningún nombre accesible.

```ts
export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'children'> {
  icon: IconDefinition;
  /** OBLIGATORIO. Es el único texto que oye un lector de pantalla. */
  label: string;
  tone?: 'neutral' | 'action' | 'danger';
  size?: 'md' | 'lg';   // md = 44px, lg = 48px. No hay tamaño más pequeño
}
```

No hay talla por debajo de 44 px. No es una recomendación, es que la prop no existe. Los siete bugs de zona táctil se cierran de golpe con la sustitución mecánica.

### 4.6 `ProgressBar`: extraer

Aparece tres veces con tres implementaciones distintas: `ChildView.tsx:490-497` (gradiente amarillo a naranja), `taskForm.tsx:265-277` (cuatro colores según umbral) y el bloque de progreso de `RewardTracker`.

Es **la pieza más importante de la app** para el adolescente. Responde a "cuánto me falta", que es literalmente lo único que viene a mirar en 10 segundos.

```ts
export interface ProgressBarProps {
  value: number;
  max: number;
  /** Etiqueta accesible. Ej: "Progreso hacia Ir al cine" */
  label: string;
  /** Muestra "45 / 100 puntos" bajo la barra */
  showValue?: boolean;
  tone?: 'action' | 'positive' | 'caution';
  size?: 'sm' | 'md' | 'lg';
}
```

Dentro: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`. Hoy ninguna de las tres barras es perceptible para un lector de pantalla: son `<div>` con un `width` en línea.

En tono adolescente el relleno usa `--tps-progress-fill` (el gradiente) y en tono padres usa un color plano. Misma marca, distinto tono, un solo componente.

### 4.7 `Badge`, `EmptyState`, `StatTile`

```ts
export interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'caution' | 'negative' | 'action';
  size?: 'sm' | 'md';
}
```
Sustituye los chips de "Activa / Inactiva" (`taskForm.tsx:334-344`) y "Diaria / Extra".

```ts
export interface EmptyStateProps {
  icon: IconDefinition;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```
Cinco copias hoy: `Dashboard.tsx:335-346`, `Dashboard.tsx:427-440`, `Dashboard.tsx:450-463`, `TaskManagement.tsx:369-378`, `ChildView.tsx:410-415`. Las tres de `Dashboard` son idénticas salvo el icono y el texto. De paso muere el `text-gray-400` que fallaba el contraste, porque `EmptyState` usa `text-content-muted`.

```ts
export interface StatTileProps {
  label: string;
  value: string | number;
  icon?: IconDefinition;
  hint?: string;
  emphasis?: 'normal' | 'hero';   // 'hero' = el marcador de ChildView
}
```

### 4.8 `Modal`: endurecer a11y

El componente existe y se usa en 5 sitios. Le falta lo obligatorio: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, cierre con `Escape`, trampa de foco y devolución del foco al elemento que lo abrió al cerrar.

```ts
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Obligatorio: es el aria-labelledby del diálogo */
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Por defecto true. false para flujos destructivos */
  closeOnBackdrop?: boolean;
}
```

`title` pasa a obligatorio. Hoy cada consumidor pinta su propio `<h2>` dentro (`PrivilegeRedemptionModal.tsx:28`, `taskForm.tsx:180`) y el diálogo no tiene nombre accesible.

Nota aparte: `ChildView.tsx:422-460` **no usa `Modal`**, construye un modal a mano con `fixed inset-0 bg-black bg-opacity-50`. Eso hay que sustituirlo, no replicarlo.

---

## 5. Cómo evitar que se vuelva a escapar

Aquí está la parte que de verdad decide si esto dura seis meses o dos semanas. Porque **el design system anterior de este repo ya existía y ya falló**. Repetirlo sin cambiar el mecanismo es esperar otro resultado del mismo experimento.

### 5.1 El diagnóstico honesto

La deriva no vino de que faltasen componentes. Vino de que:

1. `Button` acepta `className` y lo pone al final (`Button.tsx:47`), así que el override no solo se permite: **gana**.
2. `globals.css:29` hace que un `<button>` crudo salga presentable, así que no usar el componente no duele.
3. `Input` tenía una API que no cubría los casos reales, así que 32 veces fue más rápido escribir el `<input>` a mano.
4. Nada en el pipeline avisa. `eslint.config.js` no tiene ninguna regla al respecto.

Cuatro causas, cuatro cierres. Ninguna es "más disciplina".

### 5.2 Las opciones, con su coste real

**Opción A: `tailwind-merge` + `cva`**

```tsx
<Button className="bg-purple-500">  // funciona, y el merge lo resuelve bien
```

- Ventaja: cero fricción, el equipo no cambia de hábitos, resuelve el problema de orden de CSS.
- **Coste real: no arregla nada de lo que importa.** Hace que el override funcione *mejor*. Sigue habiendo 163 colores, solo que ahora aplicados de forma determinista. Es la opción que se elige cuando se confunde "bug de especificidad" con "problema de diseño". Aquí el problema no era la especificidad.
- Peso: +12 kB (cva 1,3 kB + tailwind-merge 10,7 kB).

**Opción B: prohibir `className` a secas (`Omit<..., 'className'>`)**

- Ventaja: cierra la puerta de verdad y en tiempo de compilación. Cero dependencias, cero bytes.
- Coste real: se lleva por delante los `className` **legítimos**. En este repo son `flex-1` (3 usos), `w-full`, `mt-3`. Si no das alternativa, el equipo hace `<div className="flex-1"><Button/></div>` y has movido el problema, no lo has resuelto.
- **Es correcta solo si viene acompañada de props de layout.**

**Opción C: `className` prohibido + props de layout cerradas** (`layout: 'auto' | 'full' | 'grow'`)

- Ventaja: cierra el color y deja pasar el layout. Cero dependencias. El error aparece en el editor, no en producción.
- Coste real: cada vez que aparece una necesidad de layout nueva hay que añadir un valor a la unión y eso obliga a pensar si es legítima. **Esa fricción es la característica, no el defecto.** Añadir `layout="grow"` al tipo cuesta 30 segundos y deja rastro en el git blame; escribir `className="flex-1 bg-purple-500"` cuesta 5 y no deja rastro de nada.
- Riesgo: si la unión se queda corta, el equipo se frustra y busca la salida (`<div>` envolvente). Se mitiga arrancando con los tres valores que cubren el 100% de los usos actuales del repo.

**Opción D: `theme.colors` sustituido, no extendido** (sección 2.5)

- Ventaja: **la más fuerte de todas.** `bg-purple-500` deja de generar CSS. No es que esté mal visto: es que no existe. Y funciona igual en `className` de componentes propios, en `<div>` sueltos, en cualquier sitio. Es la única opción que cubre también los 55 botones crudos.
- Coste real: **es un cambio que rompe todo el TSX el día que se activa.** No se puede hacer antes de haber migrado las pantallas. Va al final del plan, no al principio.

**Opción E: reglas de ESLint**

```js
// eslint.config.js
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // Prohíbe utilidades de color en cualquier className
        selector: "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|ring|from|to|via)-(slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]/]",
        message: 'Color literal prohibido. Usa un token semántico (bg-action, text-content-muted) o una variant del componente.',
      },
      {
        // Prohíbe <button> crudo
        selector: "JSXOpeningElement[name.name='button']",
        message: 'Usa <Button> o <IconButton> de ui/. Si no encaja, añade una variant antes de escribir un button crudo.',
      },
    ],
  },
}
```

- Ventaja: cubre lo que el sistema de tipos no ve, incluidos los `<button>` y `<input>` crudos. Barato.
- Coste real: **hay 55 botones crudos y 32 inputs crudos hoy.** Activar esto de golpe deja el repo con 87 errores y el equipo aprende a poner `// eslint-disable-next-line`. Se activa como `warn` durante la migración y se sube a `error` cuando el contador llega a cero.

### 5.3 Recomendación

**C + D + E, en ese orden y por fases.** Ni A ni B solas.

| Mecanismo | Cuándo | Qué cierra | Coste |
|---|---|---|---|
| **C**: `Omit<'className'>` + `layout` | Fase 2, componente a componente | El color dentro de componentes del sistema | 0 deps |
| **E**: ESLint en `warn` | Fase 2, a la vez | Botones e inputs crudos, colores en `<div>` | 0 deps |
| **E**: ESLint a `error` | Fase 5, cuando el contador sea 0 | Regresiones | 0 deps |
| **D**: `theme.colors` sustituido | Fase 5, lo último | Todo lo demás, para siempre | 0 deps, diff grande |

Y un mecanismo más, que no es código:

**F: Storybook como puerta de entrada.** Ya está instalado con `@storybook/addon-a11y` y hay una story funcionando en `TaskCard.stories.tsx` que sirve de patrón. La norma: **ningún componente entra en `ui/` sin su `.stories.tsx` con una story por variante y el panel de a11y limpio.** Es donde se ve, en 5 segundos y sin arrancar la app, que `variant="neutral"` existe. La razón real de que nadie usara `variant` es que nadie sabía que estaba ahí. Storybook resuelve eso mejor que cualquier documento.

Falta el paso de conectar Storybook con los tokens, que hoy no está: `.storybook/preview.tsx` **no importa `globals.css`**, así que las stories se renderizan sin Tailwind. Hay que añadirlo, y de paso el conmutador de audiencia:

```tsx
// .storybook/preview.tsx
import '../src/globals.css';
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },   // el fallo de contraste rompe el CI, no avisa
  },
  globalTypes: {
    audience: {
      description: 'Tono de audiencia',
      defaultValue: 'parent',
      toolbar: {
        items: [
          { value: 'parent', title: 'Padres' },
          { value: 'teen',   title: 'Adolescentes' },
        ],
      },
    },
  },
  decorators: [
    (Story, ctx) => (
      <div data-audience={ctx.globals.audience} className="bg-surface-page p-6">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

Con eso, cada componente se ve en los dos tonos con un clic. Es la prueba visual de que "misma marca, distinto tono" funciona.

---

## 6. Plan por fases

Estrangulamiento, no reescritura. En ningún momento hay una rama larga abierta ni la app deja de funcionar. Cada fase es mergeable sola.

### Fase 0: limpieza sin riesgo

Cero cambios visuales. Es tirar lo que ya está muerto para que el resto se vea.

1. Borrar `src/components/ui/PrivilegeRedemptionModal_temp.tsx` (MD5 idéntico al bueno, 0 importaciones).
2. Borrar `src/theme.css` (volcado de Tailwind v4 en proyecto v3, 0 importaciones). Antes, copiar a mano la escala de radios y sombras a la config nueva, que son 20 líneas.
3. Mover `ui/taskForm.tsx` y `ui/PrivilegeRedemptionModal.tsx` a `components/dashboard/`. No son primitivos de UI, son formularios de dominio. `ui/` debe quedar solo con piezas que no sepan nada de tareas ni privilegios.
4. Decidir sobre `TaskCard.tsx`: hoy solo lo usa su propia story, ninguna pantalla lo importa. O entra en `ChildView` o se borra.
5. Renombrar `taskForm.tsx` a `TaskForm.tsx` (el resto del repo usa PascalCase; en macOS el filesystem no distingue mayúsculas y esto muerde en CI de Linux).

**Verificación**: `npm run build` verde, `npm run test` verde (4 suites), la app se ve exactamente igual.

### Fase 1: tokens sin tocar un solo componente

Se añade la capa de tokens y **se deja todo el TSX viejo tal cual**. Las clases `bg-blue-500` siguen existiendo porque se usa `extend`, no sustitución.

1. Crear `src/styles/tokens.css` con los tres niveles (sección 2).
2. Importarlo desde `globals.css` antes de las directivas de Tailwind.
3. En `tailwind.config.js`, **`extend.colors`** con los tokens semánticos (`surface`, `content`, `action`, `positive`, `caution`, `negative`). Conviven con `blue-500` y compañía.
4. Añadir el conmutador de modo oscuro (20 líneas de hook + botón en la cabecera del `Dashboard`), que ahora funciona por variables y no por las 525 clases `dark:`.
5. Añadir `data-audience="teen"` en las rutas de `/child-view` y `/reward-tracker` desde `App.tsx`.
6. Conectar Storybook: importar `globals.css` en `preview.tsx`, añadir el toolbar de audiencia, poner `a11y: { test: 'error' }`.

**Convivencia**: cero riesgo. Nada visual cambia. Lo que se gana es que a partir de aquí existe `bg-action` y se puede empezar a usar.

**Verificación**: build verde, captura antes y después de cada ruta idénticas.

### Fase 2: endurecer los tres componentes que ya se usan

Se reescriben `Button`, `Card` y `Modal` contra los tokens, con `className` fuera del contrato.

Orden: `Button` primero (mayor superficie), luego `Card`, luego `Modal`.

Para cada uno:
1. Reescribir con la API de la sección 4, `Omit<'className' | 'style'>`.
2. Escribir la `.stories.tsx` con una story por variante y por tamaño, en los dos tonos.
3. Arreglar las llamadas que rompen. Son **14 para `Button`** y están todas listadas en la tabla de 4.2. TypeScript las señala una a una.
4. Activar la regla de ESLint de color literal en modo `warn`.

**Convivencia**: los 55 botones crudos siguen ahí y siguen funcionando. `globals.css:29` todavía los pinta. No se tocan en esta fase.

**Verificación**: el panel de a11y de Storybook limpio en las tres piezas. El bug de contraste de `AddEditChild.tsx:182` desaparece solo, porque `variant="neutral"` no puede producir blanco sobre gris claro.

### Fase 3: las pantallas de adolescentes primero

Son las peores (30 botones crudos entre las dos, ninguna importa `Button`) y las que más rinden: es donde el acabado se traduce directamente en motivación.

1. Crear `Field`, `IconButton`, `ProgressBar`, `Badge`, `EmptyState` con sus stories.
2. Migrar `ChildView.tsx` (528 líneas, 5 botones crudos, 38 clases `dark:`). Incluye sustituir el modal a mano de las líneas 422-460 por `Modal`.
3. Migrar `RewardTracker.tsx` (1.116 líneas, 25 botones crudos, 11 inputs crudos). Aquí hay trabajo extra que paga por sí solo: **los bloques 795-870 y 955-1030 son la misma tarjeta duplicada.** Extraer `PrivilegeCard` de verdad y usarla en los dos sitios se lleva por delante unas 150 líneas y la mitad de la variación de color del fichero.
4. En ambas, sustituir los cinco botones de fecha de colores distintos (`ChildView.tsx:432-455`) por una lista de opciones con `variant="neutral"` y la opción recomendada en `variant="primary"`. El color deja de mentir.

**Convivencia**: el lado de padres no se ha tocado. Si algo sale mal, afecta a dos rutas.

**Verificación**: recorrido manual en móvil real, no en el emulador. Zona táctil de 44 px comprobada. `npm run test` verde.

### Fase 4: el lado de padres

1. `Dashboard.tsx` (658 líneas, 6 botones crudos, 3 `EmptyState` idénticos).
2. `TaskManagement.tsx` (782 líneas) y `PrivilegeManagement.tsx` (729 líneas). Son casi gemelos: mismo CRUD, misma estructura. Al migrarlos se verá cuánto se puede compartir, pero **no se abstrae nada hasta tener los dos migrados delante**. La regla de tres también aplica a las pantallas.
3. `FaqAdmin.tsx`, `AddEditChild.tsx`, `TaskForm.tsx`, `ShareChildLink.tsx`.
4. `auth/Signin.tsx` y `auth/Signup.tsx` (5 inputs crudos entre ambos).

**Convivencia**: adolescentes ya migrado y estable. Aquí se puede ir fichero a fichero, un PR por fichero.

### Fase 5: cerrar la puerta

Solo cuando el contador de botones e inputs crudos esté a cero.

1. Borrar la regla `button { @apply bg-primary-500 ... }` de `globals.css:29-35`. A partir de aquí, un `<button>` crudo sale sin estilo y **se ve**.
2. En `tailwind.config.js`, cambiar `extend.colors` por **`theme.colors` sustituido** (sección 2.5). Desaparecen `bg-purple-500`, `text-gray-400`, `bg-yellow-500` y los otros 160.
3. Subir las reglas de ESLint de `warn` a `error`.
4. Barrido de las `dark:` que queden: ya no hacen falta, el modo oscuro va por variables.
5. Borrar `types/uiTypes.ts` o reducirlo a lo que se haya implementado de verdad. Un fichero de 220 líneas de tipos sin implementación es una promesa que confunde a quien llegue nuevo.

**Verificación final**: `rg -c '<button' src/**/*.tsx` devuelve solo `ui/Button.tsx`, `ui/IconButton.tsx` y `ui/Modal.tsx`. `rg -o 'bg-(blue|purple|green|yellow|gray)-[0-9]+' src` devuelve cero.

### Resumen del plan

| Fase | Qué | Riesgo | Rompe la app si falla |
|---|---|---|---|
| 0 | Borrar muerto, mover dominio fuera de `ui/` | Nulo | No |
| 1 | Tokens + dark por variables + Storybook conectado | Nulo | No |
| 2 | Endurecer Button, Card, Modal | Bajo | 14 sitios, todos señalados por TS |
| 3 | Adolescentes: ChildView + RewardTracker | Medio | 2 rutas |
| 4 | Padres: Dashboard y gestión | Medio | 1 fichero por PR |
| 5 | Cerrar: sustituir colores, ESLint a error | Alto pero mecánico | Todo, y por eso va al final |

### Cómo se mide que ha funcionado

| Métrica | Hoy | Objetivo |
|---|---:|---:|
| Tokens de color distintos en TSX | 162 | 0 literales, todo semántico |
| Familias de color | 10 | 5 |
| Valores de espaciado distintos | 55 | 8 |
| Tamaños de texto | 9 | 7 |
| `<button>` crudos | 55 | 0 |
| `<input>` crudos | 32 | 0 |
| Clases `dark:` | 525 | 0 |
| Componentes con story y a11y en verde | 1 de 7 | 10 de 10 |
| Fallos de contraste AA conocidos | 6 patrones | 0 |
| Botones interactivos por debajo de 44 px | 7 | 0 |

---

## Apéndice: la frase que resume el diagnóstico

El design system de este repo no falló por falta de componentes. Falló porque `Button.tsx:47` pone `className` al final, y porque `globals.css:29` hace que no usar `Button` tampoco duela.

Un componente que acepta `className` libre no es un componente: es una sugerencia con más pasos.
