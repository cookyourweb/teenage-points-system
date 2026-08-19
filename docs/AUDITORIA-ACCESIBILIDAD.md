# Auditoría de accesibilidad: WCAG 2.2 nivel AA

**Producto**: Sistema de Puntos para Adolescentes
**Ámbito auditado**: `src/components/**`, `src/hooks/usePointsManagement.ts`, `src/globals.css`, `src/App.tsx`, `index.html`, `tailwind.config.js`
**Estándar**: WCAG 2.2 nivel AA
**Fecha**: 19 de agosto de 2026
**Auditor**: AccessibilityAuditor

---

## 1. Método y límites de esta auditoría

**Lo que he hecho**: revisión estática y exhaustiva del código fuente. He leído los 24 componentes de `src/components/`, el hook de puntos, la configuración de Tailwind, `globals.css` e `index.html`. Los ratios de contraste están calculados con la fórmula de luminancia relativa de WCAG sobre los hex reales de la paleta por defecto de Tailwind v3.4.15, que es la versión instalada (`package.json`, dependencia `tailwindcss: ^3.4.15`).

**Lo que NO he hecho, y por tanto no afirmo**:

- No he ejecutado la aplicación. No he probado con VoiceOver, NVDA ni JAWS.
- No he verificado en navegador el orden de tabulación real ni el comportamiento del foco.
- No he medido píxeles renderizados. Donde doy un tamaño de objetivo táctil es un cálculo a partir de las clases, no una medición.
- No he probado zoom al 200 % ni al 400 %, ni modo de contraste forzado, ni `prefers-reduced-motion` activo.

Cada hallazgo cuya confirmación exige ejecutar la app va marcado como **PENDIENTE DE VERIFICACIÓN**. No hay ninguno inferido sin base en el código.

### 1.1. Tres correcciones a las premisas de partida

Antes de los hallazgos, tres cosas que el código dice y que conviene saber, porque cambian dónde hay que invertir el esfuerzo.

**a) `text-gray-400` aparece 104 veces, pero solo 15 en modo claro.** Las otras 89 son `dark:text-gray-400`, la variante de modo oscuro. La lista completa de las 15 reales está en el hallazgo B2 y B3. Sigue siendo un problema, pero es un problema de 15 sitios, no de 104.

**b) El modo oscuro no se puede activar hoy.** `tailwind.config.js:7` declara `darkMode: 'class'`, y no hay una sola línea en `src/` que añada la clase `dark` al elemento raíz (verificado por búsqueda de `classList`, `documentElement`, `localStorage` y `prefers-color-scheme` en todo el proyecto: cero resultados). Consecuencia: **todas las variantes `dark:` del proyecto son código muerto**. Esto tiene dos lecturas. La buena: no hay que auditar el modo oscuro todavía. La mala: cuando alguien active esa clase, se publicarán de golpe cientos de pares de color que jamás han pasado por una comprobación de contraste.

**c) `src/theme.css` no lo importa nadie.** `src/main.tsx:4` importa únicamente `./globals.css`. Los 163 tokens que contiene `theme.css` son la paleta de Tailwind v4 en formato oklch, en un proyecto que usa Tailwind v3. Es un fichero huérfano. La fuente real de los colores es la paleta por defecto de Tailwind v3 más las escalas `primary` y `secondary` de `tailwind.config.js:10-27`.

### 1.2. La radiografía en cuatro números

| Métrica | Valor | Lectura |
|---|---|---|
| Atributos `aria-*` en todo `src/` | **2** | `Modal.tsx:36` y `AdolescenteType.tsx:29`. Nada más. |
| Atributos `role=` en todo `src/` | **0** | Ni un diálogo, ni una pestaña, ni una alerta. |
| `useRef`, `.focus()`, manejo de `Escape` | **0** | No existe gestión de foco en el proyecto. |
| `<label>` con `htmlFor` frente a controles de formulario | **10 de 47** | 42 `<input>`, 3 `<textarea>`, 2 `<select>`. |

Y el reparto de responsabilidad entre lo compartido y lo suelto:

| Elemento | A través del componente compartido | Suelto en la pantalla |
|---|---|---|
| Botones | 51 `<Button>` | **55 `<button>` crudos** |
| Campos de formulario | 0 `<Input>` | **47 controles crudos** |
| Diálogos | 8 usos de `<Modal>` | **3 modales ad hoc** |

`ui/Input.tsx` no lo importa **ningún** fichero del proyecto. Es código muerto. Volveré sobre esto en la sección 5, porque es el dato que decide toda la estrategia.

---

## 2. Resumen

**Total de hallazgos: 54**

| Severidad | Nº | Qué significa aquí |
|---|---|---|
| Crítico | 12 | Impide completar la tarea. Barrera total. |
| Alto | 19 | Barrera seria, exige rodeos o adivinar. |
| Medio | 16 | Dificulta, pero hay alternativa. |
| Bajo | 7 | Fricción, mala práctica, deuda. |

**Conformidad WCAG 2.2 AA: NO CONFORMA.**
**Compatibilidad con tecnología de apoyo: FALLA.**

Los tres titulares:

1. **La vista del hijo (`/child-view`) no se puede usar con teclado.** Marcar una tarea es un `<div onClick>`. No recibe foco, no responde a Enter ni a Espacio, no tiene rol ni estado. Un adolescente que navega con teclado, o con conmutador, o con control por voz, no puede marcar una sola tarea.
2. **El marcador de puntos es mudo.** No hay un solo `aria-live` en el proyecto. En una aplicación cuyo núcleo es "mira cómo sube tu marcador", el número cambia de 40 a 55 y un usuario de lector de pantalla no se entera. Los toasts anuncian el nombre de la tarea, pero nunca el total.
3. **El componente `Button` compartido tiene 5 de sus 6 variantes por debajo del contraste mínimo.** La variante por defecto, `primary`, da 3.68:1 sobre 4.5:1 exigidos. La variante `warning` da 1.92:1. Y hay un dato que remata el diagnóstico: la prop `variant` **no se usa ni una sola vez** en todo el proyecto, porque todo el mundo pisa el color con `className`.

### Aciertos que hay que conservar

- `Dashboard.tsx:529, 559, 617` es la única pantalla con `<header>`, `<nav>` y `<main>` de verdad. Ese patrón es el correcto, replicadlo.
- `AdolescenteType.tsx:29` es el único `aria-label` bien puesto del proyecto: describe el destino del enlace incluyendo el nombre del hijo.
- `Signin.tsx:114, 130` y `Signup.tsx:129, 145, 161` asocian etiqueta y campo con `htmlFor` correctamente. Son 5 de las 10 asociaciones bien hechas del proyecto.
- `Button.tsx:19` fija `type = "button"` por defecto. Eso evita el clásico envío accidental del formulario al pulsar "Cancelar" en `taskForm.tsx:356` y `TaskManagement.tsx:654`.
- Los iconos de FontAwesome llevan `aria-hidden="true"` por defecto (verificado: `node_modules/@fortawesome/fontawesome-svg-core/index.mjs` contiene el atributo). Los iconos decorativos están, sin quererlo, bien tratados. El precio es que los botones que solo contienen un icono se quedan sin nombre accesible, que es el hallazgo C3.
- `react-toastify` sí anuncia. Verificado en `node_modules/react-toastify/dist/index.mjs`: el contenedor renderiza `<section aria-live="polite" aria-atomic="false" aria-relevant="additions text">` y cada toast lleva `role: "alert"` por defecto. Es el único canal de anuncio que funciona hoy en la aplicación.
- Storybook 10 con `@storybook/addon-a11y` ya está instalado (`.storybook/main.ts:9`). La infraestructura para no reincidir existe, solo hay una historia escrita (`TaskCard.stories.tsx`).

---

## 3. Ratios de contraste calculados

Calculados sobre los hex de Tailwind v3.4. Umbrales AA: **4.5:1** texto normal (1.4.3), **3:1** texto grande (≥ 24 px, o ≥ 18.66 px en negrita), **3:1** componentes de interfaz y gráficos informativos (1.4.11).

| Combinación | Ratio | Texto normal | Texto grande | No textual |
|---|---:|---|---|---|
| `text-gray-400` sobre blanco | **2.54** | FALLA | FALLA | FALLA |
| `text-gray-400` sobre `gray-100` | **2.31** | FALLA | FALLA | FALLA |
| `text-yellow-500` sobre blanco | **1.92** | FALLA | FALLA | FALLA |
| `text-green-500` sobre blanco | **2.28** | FALLA | FALLA | FALLA |
| `text-orange-500` sobre blanco | **2.80** | FALLA | FALLA | FALLA |
| `text-yellow-600` sobre blanco | **2.94** | FALLA | FALLA | FALLA |
| `text-green-600` sobre blanco | **3.30** | FALLA | pasa | pasa |
| `text-orange-600` sobre blanco | **3.56** | FALLA | pasa | pasa |
| `text-blue-500` sobre blanco | **3.68** | FALLA | pasa | pasa |
| `text-red-500` sobre blanco | **3.76** | FALLA | pasa | pasa |
| `text-gray-500` sobre blanco | **4.83** | pasa | pasa | pasa |
| `text-gray-600` sobre blanco | **7.56** | pasa | pasa | pasa |
| blanco sobre `bg-yellow-500` | **1.92** | FALLA | FALLA | FALLA |
| blanco sobre `bg-green-500` | **2.28** | FALLA | FALLA | FALLA |
| blanco sobre `bg-cyan-500` | **2.43** | FALLA | FALLA | FALLA |
| blanco sobre `bg-blue-500` | **3.68** | FALLA | pasa | pasa |
| blanco sobre `bg-red-500` | **3.76** | FALLA | pasa | pasa |
| blanco sobre `bg-gray-500` | **4.83** | pasa | pasa | pasa |
| blanco sobre `bg-blue-600` | **5.17** | pasa | pasa | pasa |
| blanco sobre `bg-purple-600` | **5.38** | pasa | pasa | pasa |
| blanco sobre `bg-indigo-600` | **6.29** | pasa | pasa | pasa |
| `text-gray-500` sobre `bg-blue-500` | **1.31** | FALLA | FALLA | FALLA |
| `text-green-800` sobre `bg-green-100` | 6.49 | pasa | pasa | pasa |
| `text-yellow-800` sobre `bg-yellow-100` | 6.38 | pasa | pasa | pasa |
| `text-red-800` sobre `bg-red-100` | 6.80 | pasa | pasa | pasa |
| `text-blue-800` sobre `bg-blue-100` | 7.15 | pasa | pasa | pasa |

**El patrón es limpio y sirve como regla de equipo**: en la paleta de Tailwind, el escalón **600 es el mínimo utilizable sobre blanco para texto normal**, y aun así `green-600`, `orange-600` y `yellow-600` se quedan cortos. Para fondos claros de la misma familia (`-50`, `-100`), el escalón **800** siempre pasa con holgura. Todas las badges del proyecto que usan pares `-100` / `-800` están bien: son de los pocos colores correctos que hay.

**El `text-gray-400` sobre blanco es, efectivamente, el peor caso de los que aparecen en modo claro: 2.54:1.** Falla incluso el umbral relajado de 3:1 de elementos no textuales. Pero el dato que más sorprende es que `text-yellow-500`, que el proyecto usa como icono indicador de estado en cinco sitios, da **1.92:1**, aún peor.

---

## 4. Tabla de hallazgos

Nomenclatura de la columna "Arreglo": qué hay que hacer, en una frase.

### A. Base de la página

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| A1 | **Crítico** | 3.1.1 Idioma de la página (A) | `index.html:2` | `<html lang="en">` en una app cuya interfaz está íntegramente en español. El lector de pantalla pronuncia el castellano con fonética inglesa y resulta ininteligible. | Cambiar a `lang="es"`. |
| A2 | Alto | 2.4.2 Página titulada (A) | `index.html:7` | `<title>Vite + React + TS</title>`, y ninguna de las 6 rutas de `App.tsx:50-109` lo modifica. Todas las pantallas se anuncian igual. | Título base descriptivo y actualizarlo por ruta. |
| A3 | Alto | 2.4.3 Orden del foco (A) | `App.tsx:49-111` | Al navegar entre rutas (por ejemplo `Dashboard.tsx:394` hacia `/reward-tracker`), React Router sustituye el árbol pero el foco queda huérfano y no se anuncia la nueva pantalla. | Mover el foco al `<h1>` de destino y anunciar el cambio en una región viva. |
| A4 | Medio | 2.4.1 Evitar bloques (A) | Todas las vistas | No hay enlace de salto al contenido en ninguna pantalla. En `RewardTracker` hay que tabular por toda la tabla de 7 columnas para llegar a los privilegios. | Añadir un enlace de salto visible al foco antes del `<header>`. |
| A5 | Medio | 1.3.1 Información y relaciones (A) | `ChildView.tsx:163`, `RewardTracker.tsx:437`, `Faqs.tsx:23`, `FaqAdmin.tsx`, `AddFaq.tsx:24` | Sin `<main>`, `<header>` ni `<nav>`. Todo son `<div>`. La navegación por regiones del lector de pantalla no sirve de nada. | Envolver el contenido principal en `<main>`, replicando el patrón correcto de `Dashboard.tsx:529, 559, 617`. |

### B. Contraste

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| B1 | **Crítico** | 1.4.3 Contraste mínimo (AA) | `Button.tsx:26-33` | 5 de las 6 variantes fallan con texto blanco: `primary` 3.68, `success` 2.28, `danger` 3.76, `warning` **1.92**, `info` 2.43. Solo `secondary` (4.83) pasa. Afecta a los 51 `<Button>` del proyecto. | Subir toda la escala al 600 o 700 en el propio componente. |
| B2 | Alto | 1.4.3 Contraste mínimo (AA) | `RewardTracker.tsx:1085` | `text-sm text-gray-400` sobre blanco: **2.54:1**. Es texto de párrafo, no decorativo. | Usar `text-gray-600` (7.56:1). |
| B3 | Alto | 1.4.11 Contraste no textual (AA) | `ChildView.tsx:249`, `ChildView.tsx:363`, `RewardTracker.tsx:538`, `RewardTracker.tsx:572`, `TaskManagement.tsx:773`, `FamilyPointsOverview.tsx:194` | Iconos `text-gray-400` (2.54:1 sobre blanco, 2.31:1 sobre `gray-100`) que son el **único** indicador de "tarea sin completar". Doble fallo: contraste y color como única señal (1.4.1). | Subir a `text-gray-600` y añadir texto o icono distinto, no solo cambio de color. |
| B4 | Alto | 1.4.3 Contraste mínimo (AA) | `TaskManagement.tsx:422, 425`, `PrivilegeManagement.tsx:274`, `taskForm.tsx:332` | `text-yellow-600` sobre blanco: **2.94:1**. En `PrivilegeManagement.tsx:274` es una función de dificultad, o sea, información. | Sustituir por `text-yellow-800` (6.38:1 sobre `yellow-100`) o `text-amber-700`. |
| B5 | Alto | 1.4.3 Contraste mínimo (AA) | `TaskManagement.tsx:709, 728`, `ChildView.tsx:394`, `taskForm.tsx:331`, `PrivilegeManagement.tsx:273` | `text-green-600` sobre blanco: **3.30:1**. Es el color de los puntos que otorga cada tarea, texto de 14 px. | `text-green-700` o superior. |
| B6 | Medio | 1.4.3 Contraste mínimo (AA) | `PrivilegeManagement.tsx:275`, `TaskManagement.tsx:767` | `text-orange-600` 3.56:1 y `text-orange-500` 2.80:1 sobre blanco. | `text-orange-700` como mínimo. |
| B7 | Alto | 1.4.11 Contraste no textual (AA) | `ChildView.tsx:361`, `TaskManagement.tsx:420`, `FamilyPointsOverview.tsx:94, 111, 216` | `text-yellow-500` sobre blanco: **1.92:1**. En `ChildView.tsx:361` es el icono que distingue "día parcialmente completado" de "día completo". Es información, no adorno. | Escalón 700 y no depender solo del color. |
| B8 | Alto | 1.4.3 Contraste mínimo (AA) | `ChildView.tsx:194, 197`, `RewardTracker.tsx:598` | Texto blanco sobre degradado `blue-500` a `purple-600`. En el extremo azul: **3.68:1**. `ChildView.tsx:194` es `text-xl` (20 px sin negrita), que no llega al umbral de texto grande y exige 4.5:1. Encima lleva `opacity-90` y `opacity-75`, que bajan el ratio efectivo todavía más. | Arrancar el degradado en `blue-600` (5.17:1) y quitar los `opacity`. |
| B9 | Alto | 1.4.3 Contraste mínimo (AA) | `globals.css:29-35` | Una regla de tipo `button { @apply bg-primary-500 text-white ... }` da fondo azul a **todo** `<button>`. Las utilidades de clase ganan por especificidad, así que solo afecta a los botones sin clase `bg-*`: las pestañas de `Dashboard.tsx:560-611` (con `text-gray-500` encima: **1.31:1**) y el botón de cerrar de `Modal.tsx:33-41`. **PENDIENTE DE VERIFICACIÓN en navegador.** | Borrar la regla global. Los estilos de botón viven en `ui/Button`, no en una hoja global. |
| B10 | Bajo | 1.4.3 (exento) | `Dashboard.tsx:590, 605` | Pestañas deshabilitadas en `text-gray-400`. WCAG exime los componentes inactivos del criterio de contraste, así que **no es un incumplimiento**, pero son indistinguibles del fondo. | Añadir un icono de candado con texto además del color atenuado. |

### C. Teclado y semántica

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| C1 | **Crítico** | 2.1.1 Teclado (A) + 4.1.2 Nombre, función, valor (A) | `ChildView.tsx:236-244` y `ChildView.tsx:282-287` | `<div onClick>` para marcar y desmarcar tareas. Sin `tabIndex`, sin `role`, sin manejador de teclado. **Es la única acción de la vista del hijo y no existe para el teclado.** | Convertir en `<button type="button" aria-pressed={task.completada}>`. |
| C2 | **Crítico** | 2.1.1 Teclado (A) + 4.1.2 (A) | `FamilyPointsOverview.tsx:148-151` | `<div onClick>` que navega a `/reward-tracker`. Es la ruta principal desde el resumen familiar hacia el detalle de cada hijo. | Convertir en `<Link>` o `<button>`. |
| C3 | **Crítico** | 4.1.2 Nombre, función, valor (A) | `RewardTracker.tsx:524-541` y `RewardTracker.tsx:558-575` | Los botones de marcar tarea contienen solo un `<FontAwesomeIcon>`, que lleva `aria-hidden="true"`. **Nombre accesible vacío.** Con 7 días por tarea, un lector de pantalla lee decenas de "botón, botón, botón" sin saber a qué día ni a qué tarea corresponde. Tampoco hay `aria-pressed`. | `aria-label={\`${tarea.nombre}, ${dia}\`}` y `aria-pressed={completada}`. |
| C4 | Alto | 4.1.2 (A) + 1.1.1 (A) | `TaskTable.tsx:28-37` | El contenido del botón es el emoji `✅` o `⬜`. El nombre accesible es "marca de verificación" o "cuadrado blanco". | Nombre accesible textual y `aria-pressed`. |
| C5 | **Crítico** | 4.1.2 (A) | `ShareChildLink.tsx:106-111, 122-127, 164-169` | Tres `<Button>` con solo icono, **sin `title` y sin `aria-label`**. Nombre accesible vacío por completo. Son los botones de copiar enlace y de previsualizar. | Añadir `aria-label`. |
| C6 | Alto | 4.1.2 (A) | `TaskManagement.tsx:352-358`, `PrivilegeManagement.tsx:326-332` | Botón de refrescar solo con icono, sin nombre accesible. | Añadir `aria-label="Actualizar datos"`. |
| C7 | Medio | 4.1.2 (A) + 1.1.1 (A) | `AddEditChild.tsx:159-168` | Botón cuyo contenido es `❓`. Se anuncia como "signo de interrogación". Además contamina el nombre accesible de la casilla de verificación que lo envuelve (`AddEditChild.tsx:149`). | `aria-label={\`Qué significa ${pregunta.titulo}\`}` y sacar el botón fuera del `<label>`. |
| C8 | Medio | 4.1.2 (A) + 3.3.2 (A) | `Dashboard.tsx:541-551`, `Dashboard.tsx:647-653`, `RewardTracker.tsx:478-486, 689-706, 883-896`, `TaskManagement.tsx:739-752`, `PrivilegeManagement.tsx:461-474` | Botones de solo icono cuyo único nombre accesible viene del atributo `title`. `title` sí computa como nombre accesible de último recurso, así que **el lector de pantalla los lee**, pero es el eslabón más débil de la cadena y no se muestra a usuarios táctiles ni de teclado. En `Dashboard.tsx:550` el texto se oculta con `hidden sm:inline`, o sea `display:none`, que lo saca del árbol de accesibilidad: en móvil solo queda el `title`. | Sustituir `title` por `aria-label`, o `title` más texto en `sr-only`. |
| C9 | Alto | 4.1.2 (A) + 1.3.1 (A) | `Dashboard.tsx:559-611` | Cuatro botones que funcionan como pestañas, sin `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` ni `aria-controls`. El estado activo se comunica solo con color de borde y de texto. No hay navegación por flechas. | Aplicar el patrón Tabs de WAI-ARIA APG, o convertirlo en navegación con rutas reales. |
| C10 | Alto | 1.3.1 Información y relaciones (A) | `RewardTracker.tsx:502-591` | Tabla de 8 columnas por N filas: los `<th>` de `RewardTracker.tsx:505-510` no tienen `scope`, no hay `<caption>`, y la primera celda de cada fila (`RewardTracker.tsx:516-521`, el nombre de la tarea) es `<td>` en vez de `<th scope="row">`. Al navegar por celdas, el lector no puede decir "Lunes, Hacer la cama". | `scope="col"` en la cabecera, `<th scope="row">` en la primera celda de cada fila y un `<caption>`. |
| C11 | Medio | 1.3.1 (A) | `TaskTable.tsx:14-21` | Mismo defecto: `<th>` sin `scope`, sin `<caption>`. | Igual que C10. |
| C12 | Medio | 1.3.1 (A) | `ChildView.tsx:171`, `212`, `231`, `275`; `RewardTracker.tsx:452`, `493`, `596`, `611`, `631`, `772` | Saltos de nivel de encabezado. En `ChildView` va de `h2` (el `CardTitle` de `Card.tsx:37`) directo a `h4`, sin `h3`. En `RewardTracker` hay `h4` colgando de `h2`. El índice de encabezados sale roto. | Que `CardTitle` acepte una prop `as` para elegir nivel, y ordenar la jerarquía por pantalla. |
| C13 | Bajo | 1.3.1 (A) | `Faqs.tsx:31`, `AddFaq.tsx:35`, `FaqAdmin.tsx:204` | La jerarquía de contenido se marca con `<p className="card-title">` y `<strong>` en lugar de encabezados reales. En una página de FAQs, que es contenido puro, esto deja al usuario sin forma de navegar. Nota aparte: `AddFaq.tsx` es una copia literal de `Faqs.tsx` (mismo componente, mismo nombre de función `Faqs`). Código duplicado. | Usar `<h3>` y `<h4>` reales. |

### D. Diálogos modales

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| D1 | **Crítico** | 4.1.2 (A) + 2.4.3 Orden del foco (A) + 1.3.1 (A) | `Modal.tsx:27-47` | El componente compartido no tiene `role="dialog"`, ni `aria-modal="true"`, ni `aria-labelledby`. No atrapa el foco: al abrirse, el foco sigue en el disparador y con Tab se recorre todo el contenido de detrás, que sigue en el árbol de accesibilidad. Al cerrarse, el foco no vuelve al botón que lo abrió. Afecta a los 8 usos: `Dashboard.tsx:623, 634, 640`, `TaskManagement.tsx:531`, `PrivilegeManagement.tsx:520`, `ShareChildLink.tsx:74`, `AddEditChild.tsx:188`, `PrivilegeRedemptionModal.tsx:28`. | Reescribir `Modal` con diálogo accesible completo. Ver sección 6. |
| D2 | **Crítico** | 4.1.2 (A) + 2.4.3 (A) | `ChildView.tsx:423-458`, `RewardTracker.tsx:808-868`, `RewardTracker.tsx:968-1028` | Tres modales escritos a mano que ni siquiera pasan por `ui/Modal`. Mismos defectos que D1 y, además, ni siquiera se benefician de arreglar `ui/Modal`. Los dos de `RewardTracker` son código duplicado entre sí. | Migrarlos a `ui/Modal` una vez arreglado. |
| D3 | Alto | 2.1.1 Teclado (A) | `Modal.tsx:21-31` | El cierre por clic en el fondo (`handleBackdropClick`) no tiene equivalente de teclado. No se cierra con Escape. Combinado con la ausencia de trampa de foco, un usuario de teclado puede quedarse sin salida evidente. | Manejador de `keydown` para Escape. |
| D4 | Bajo | (usabilidad, no criterio) | `Modal.tsx:11-17` | El efecto pone `document.body.style.overflow = 'auto'` al cerrar en vez de restaurar el valor previo, y no hay función de limpieza. Con modales anidados (`AddEditChild.tsx:188` abre un `Modal` dentro de otro `Modal`), al cerrar el interior se desbloquea el scroll del exterior. | Guardar el valor previo y restaurarlo en la limpieza del efecto. |

### E. Formularios

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| E1 | **Crítico** | 1.3.1 (A) + 3.3.2 Etiquetas o instrucciones (A) + 4.1.2 (A) | `Input.tsx:35-39`, `taskForm.tsx:163, 189, 218, 269`, `TaskManagement.tsx:540, 564, 591, 615`, `PrivilegeManagement.tsx:529, 553, 609`, `InviteMember.tsx:48`, `RewardTracker.tsx:835, 995`, `FaqAdmin.tsx:153, 161, 177, 186, 217, 225, 251` | **22 `<label>` sin `htmlFor`** cuyo `<input>` no tiene `id`. Visualmente parecen etiquetas, programáticamente no lo son. Al enfocar el campo, el lector de pantalla anuncia "campo de edición" sin decir de qué. Nota: `ui/Input.tsx:35` comete el mismo error **en el componente compartido**. | Generar el `id` dentro del componente con `useId()` y enlazarlo. |
| E2 | **Crítico** | 3.3.2 Etiquetas o instrucciones (A) + 1.3.1 (A) | `RewardTracker.tsx:633-653` (3 campos), `RewardTracker.tsx:715-749` (3), `RewardTracker.tsx:905-923` (3), `CompleteProfile.tsx:38-44` (1), `ShareChildLink.tsx:100-105, 158-163` (2) | **12 campos sin ninguna etiqueta**, solo `placeholder`. El `placeholder` no es una etiqueta: desaparece al escribir, tiene contraste insuficiente por diseño y muchos lectores no lo anuncian. Peor aún, `RewardTracker.tsx:905-916` tiene dos campos sin `placeholder` **ni** etiqueta: solo un `defaultValue`. | `<label>` asociada en todos ellos. |
| E3 | **Crítico** | 3.3.1 Identificación de errores (A) + 4.1.3 Mensajes de estado (AA) | `Input.tsx:59-61`, `taskForm.tsx:180, 206, 240, 286`, `TaskManagement.tsx:555, 579, 606, 630`, `PrivilegeManagement.tsx:544, 573, 624`, `Signin.tsx:145-156`, `Signup.tsx:177-183`, `InviteMember.tsx:56`, `CompleteProfile.tsx:45` | Ningún mensaje de error tiene `role="alert"`, ningún campo tiene `aria-invalid`, ninguno tiene `aria-describedby` apuntando al error. El usuario pulsa "Crear tarea", el envío no ocurre, y **no hay ninguna indicación de por qué**. El error solo existe visualmente, como un `<p>` rojo suelto. | `aria-invalid`, `aria-describedby` y `role="alert"` desde el componente. |
| E4 | Alto | 3.3.1 (A) + 3.3.3 Sugerencias ante errores (AA) | `AddEditChild.tsx:67, 73, 78, 104` | Validación con `window.alert()`. Interrumpe el flujo, no asocia el error a ningún campo, y al cerrarse no devuelve el foco al campo que falla. | Sustituir por errores en línea asociados al campo. |
| E5 | Medio | 3.3.2 (A) | `taskForm.tsx:164, 190, 219`, `TaskManagement.tsx:541, 565, 592`, `PrivilegeManagement.tsx:530, 554` | El asterisco `*` es la única marca de campo obligatorio. Ningún campo lleva `required` ni `aria-required`. | `required` en el campo y explicación textual del asterisco. |
| E6 | Bajo | 1.1.1 (A) | `Input.tsx:37` | El `*` de obligatorio se anuncia como "asterisco". | `<span className="sr-only">obligatorio</span>` junto al asterisco visual. |

### F. Estado dinámico

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| F1 | **Crítico** | 4.1.3 Mensajes de estado (AA) | `ChildView.tsx:191-194`, `ChildView.tsx:334, 351`, `RewardTracker.tsx:456, 585, 597`, `FamilyPointsOverview.tsx:138, 170` | **El marcador de puntos cambia en silencio.** `ChildView.tsx:191-194` es un número de `text-6xl` que es literalmente el corazón de la aplicación: el hijo marca una tarea, el número sube, y para un usuario de lector de pantalla no ha pasado nada. Cero `aria-live` en todo el proyecto. En una app cuya propuesta de valor es "ver tu progreso", esto no es un detalle de accesibilidad, es que la funcionalidad no se entrega. | `aria-live="polite"` y `aria-atomic="true"` en el contenedor del total. |
| F2 | Alto | 4.1.3 (AA) | `usePointsManagement.ts:296-299`, `RewardTracker.tsx:215-218` | Los toasts sí se anuncian (verificado: `role="alert"` por defecto en react-toastify), pero el mensaje es "Tarea completada: Hacer la cama". **Nunca dice el nuevo total.** El dato que el usuario quiere no está en el único canal que funciona. | Incluir el total en el mensaje: `` `Completada: ${nombre}. Total: ${nuevoTotal} puntos` ``. |
| F3 | Medio | 2.2.1 Tiempo ajustable (A) | `usePointsManagement.ts:298`, `RewardTracker.tsx:217`, `usePointsManagement.ts:236, 323` | `autoClose: 2000` y `autoClose: 1500`. Dos segundos para que un lector de pantalla termine de anunciar y el usuario procese. Insuficiente. | Subir a 5000 como mínimo, o hacerlo configurable. |
| F4 | Medio | 4.1.3 (AA) | `ChildView.tsx:139-148`, `Dashboard.tsx:475-484`, `RewardTracker.tsx:422-434`, `TaskManagement.tsx:312-329`, `App.tsx:15-24` | Pantallas de carga con un spinner y un `<p>`, sin región viva. Aparecen sin anunciarse y desaparecen sin anunciarse. Igual en `Button.tsx:56-77`, donde `loading` muestra un spinner sin texto. | `role="status"` en el contenedor de carga. |
| F5 | Medio | 4.1.3 (AA) | `ShareChildLink.tsx:220-225` | "¡Enlace copiado al portapapeles!" aparece sin región viva. Es la única confirmación de que la acción funcionó. | `role="status"`. |
| F6 | Medio | 4.1.3 (AA) | `ChildView.tsx:177-182` | El indicador "Actualizando datos..." (`isUpdatedByOther`) aparece y desaparece en silencio. | `role="status"`. |
| F7 | Medio | 4.1.3 (AA) + 2.4.3 (A) | `Dashboard.tsx:213-472, 618` | Al cambiar de pestaña, `renderTabContent()` sustituye todo el contenido. El foco se queda en el botón y nada anuncia que la pantalla ha cambiado. | Resuelto al aplicar el patrón Tabs de C9. |

### G. Iconos e imágenes

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| G1 | Alto | 1.1.1 Contenido no textual (A) | `ChildView.tsx:170, 232, 266, 276, 310, 389, 413, 426, 514`, `Dashboard.tsx:358, 538, 595, 610`, `RewardTracker.tsx:611, 711, 811, 901, 1040, 1055, 1058, 1061, 1081`, `App.tsx:30, 93`, `ShareChildLink.tsx:185`, `TaskManagement.tsx:243` | Decenas de emojis decorativos en `<div>` y `<span>` sin `aria-hidden="true"`. El lector de pantalla los lee todos con su nombre Unicode: "trofeo", "portapapeles", "chispas", "busto en silueta", "corona". `RewardTracker.tsx:1055-1061` mete tres emojis seguidos en tres líneas de texto de un historial. La lectura se vuelve ruido. | `aria-hidden="true"` en todos los emojis decorativos. |
| G2 | Medio | 4.1.2 (A) + 2.5.3 Etiqueta en el nombre (A) | `ChildView.tsx:436, 442, 448, 454`, `RewardTracker.tsx:804, 818, 824, 830, 964` | Emojis dentro del texto de botones: el nombre accesible acaba siendo "amanecer Hoy" o "candado cerrado No disponible". Además rompe 2.5.3 para usuarios de control por voz: si el nombre visible es "Hoy" y el accesible es "🌅 Hoy", decir "pulsa Hoy" puede fallar. | Envolver el emoji en `<span aria-hidden="true">`. |
| G3 | Bajo | 1.1.1 (A) | `ShareChildLink.tsx:135-139` | `alt="QR Code para {nombre}"` describe el objeto pero no su función ni el destino. Además, la imagen se carga desde `api.qrserver.com` sin alternativa si el servicio falla. | Alt funcional: `Código QR que abre la vista de puntos de {nombre}`. |

### H. Movimiento y foco visible

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| H1 | Medio | 2.2.2 Pausar, detener, ocultar (A) | `App.tsx:19`, `Dashboard.tsx:479`, `ChildView.tsx:143, 179, 404`, `RewardTracker.tsx:426, 474, 484, 1096`, `Button.tsx:58`, `taskForm.tsx:372`, `TaskManagement.tsx:323, 341, 357`, `PrivilegeManagement.tsx:315, 331`, `Signin.tsx:165`, `Signup.tsx:192` | **Cero `prefers-reduced-motion` en todo el proyecto.** 18 usos de `animate-spin` y uno de `animate-pulse` (`RewardTracker.tsx:1096`, que gira de forma indefinida como indicador de sincronización). 2.2.2 aplica al movimiento automático no esencial que dura más de 5 segundos: no puedo verificar sin ejecutar si algún spinner supera ese umbral, pero el `animate-pulse` del indicador de conexión está siempre activo mientras `syncing` sea verdadero. Aparte, `transform hover:scale-105` (`RewardTracker.tsx:798, 958`) y `transition-all duration-500` (`ChildView.tsx:493`) son movimiento que molesta a usuarios con sensibilidad vestibular. **2.3.3 Animación desde interacciones es nivel AAA, no obligatorio en AA**, pero cuesta cuatro líneas. | Regla global `@media (prefers-reduced-motion: reduce)` en `globals.css`. |
| H2 | Bajo | (buena práctica) | `globals.css:14` | `transition: background-color 0.3s, color 0.3s` en `body`, sin respetar la preferencia de movimiento reducido. | Incluida en la regla global de H1. |
| H3 | Medio | 1.4.11 (AA) + 2.4.7 Foco visible (AA) | `Button.tsx:23`, `Input.tsx:48` | `focus:outline-none` sustituido por `focus:ring-*`. El anillo de Tailwind se implementa con `box-shadow`, y **`box-shadow` no se renderiza en el modo de contraste forzado de Windows**. En ese modo, los 51 `<Button>` del proyecto se quedan sin ningún indicador de foco. Además usa `:focus` en vez de `:focus-visible`. | Añadir `@media (forced-colors: active) { outline: 2px solid; }` o usar `focus-visible:outline` real de 2 px. |
| H4 | Medio | 2.4.11 Foco no oscurecido, mínimo (AA, nuevo en 2.2) | `Dashboard.tsx:646-654` | Botón de acción flotante en `fixed bottom-6 right-6` que puede tapar el elemento enfocado al tabular en pantallas pequeñas. **PENDIENTE DE VERIFICACIÓN: no lo puedo determinar leyendo el código, hace falta probar en navegador a 320 px de ancho.** | Si se confirma, añadir `scroll-padding-bottom` al contenedor. |

### I. Tamaño del objetivo

| ID | Sev. | Criterio WCAG | Fichero:línea | Problema | Arreglo |
|---|---|---|---|---|---|
| I1 | Alto | 2.5.8 Tamaño del objetivo, mínimo (AA, nuevo en 2.2) | `RewardTracker.tsx:689-706, 883-896`, `TaskManagement.tsx:739-752`, `PrivilegeManagement.tsx:461-474` | Botones de editar y borrar con `className="p-1"` e icono `size="sm"`. Cálculo a partir de las clases: 4 px de relleno por lado más un icono de 14 px son unos **22 x 22 px**, por debajo de los 24 x 24 CSS px que exige el criterio. Y son las acciones destructivas. **PENDIENTE DE VERIFICACIÓN: es un cálculo, no una medición en navegador.** | `min-h-6 min-w-6` como mínimo, `min-h-11 min-w-11` como recomendación. |
| I2 | Bajo | 2.5.8 (AA) | `ShareChildLink.tsx:68` | `text-xs px-2 py-1`: unos 24 px de alto justos. Al límite. **PENDIENTE DE VERIFICACIÓN.** | Igual que I1. |

---

## 5. Los cinco arreglos con mejor relación impacto/esfuerzo

Ordenados por impacto dividido entre esfuerzo, no por severidad.

### 5.1. Idioma y título de la página (A1, A2)

Dos líneas. Dos criterios de nivel A. Toda la aplicación.

**Antes** (`index.html:2, 7`):

```html
<html lang="en">
  <head>
    <title>Vite + React + TS</title>
```

**Después**:

```html
<html lang="es">
  <head>
    <title>Sistema de Puntos para Adolescentes</title>
```

Sin esto, un lector de pantalla configurado en español lee toda la interfaz con motor de voz inglés. "Puntos esta semana" suena a ruido. Es el arreglo más barato del documento y el que más cambia la experiencia real.

### 5.2. Recolorear las variantes de `ui/Button` (B1)

Seis líneas, un fichero, y se corrige el contraste de los 51 `<Button>` de golpe.

**Antes** (`Button.tsx:26-33`):

```tsx
const variantClasses = {
  primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500 ...",
  secondary: "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500 ...",
  success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 ...",
  danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 ...",
  warning: "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 ...",
  info: "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-500 ..."
};
```

Ratios con texto blanco: 3.68, 4.83, **2.28**, 3.76, **1.92**, **2.43**. Solo `secondary` pasa.

**Después**:

```tsx
// Ratios con texto blanco, calculados sobre la paleta de Tailwind v3:
// blue-600 5.17 | gray-600 7.56 | green-700 5.02 | red-600 4.83 | amber-700 5.02 | cyan-700 5.36
const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-700 ...",
  secondary: "bg-gray-600 hover:bg-gray-700 text-white focus-visible:ring-gray-700 ...",
  success: "bg-green-700 hover:bg-green-800 text-white focus-visible:ring-green-800 ...",
  danger: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-700 ...",
  warning: "bg-amber-700 hover:bg-amber-800 text-white focus-visible:ring-amber-800 ...",
  info: "bg-cyan-700 hover:bg-cyan-800 text-white focus-visible:ring-cyan-800 ..."
};
```

**Aviso**: este arreglo solo surte efecto si además se cierra la vía de escape. Hoy la prop `variant` **no se usa ni una vez** en todo el proyecto (búsqueda de `variant=` en `src/`: cero resultados). Todos los llamantes pisan el color con `className`, y lo hacen mal: `Dashboard.tsx:252` pasa `className="... bg-green-500 hover:bg-green-600"` a un botón cuya variante por defecto ya trae `bg-blue-500`. Ambas clases acaban en el atributo, y en CSS gana la que Tailwind emite más tarde en la hoja, no la que va después en el atributo. Como Tailwind emite `bg-green-*` antes que `bg-blue-*`, **es probable que ese botón se esté renderizando azul y nadie se haya dado cuenta**. Mismo patrón en `AddEditChild.tsx:182`, `TaskManagement.tsx:460, 497`, `PrivilegeManagement.tsx:334, 356`, `ShareChildLink.tsx:68, 108, 117, 124, 166, 174`, `taskForm.tsx:359`. **PENDIENTE DE VERIFICACIÓN en navegador**, pero el mecanismo del cascade es el que es.

### 5.3. Dar nombre y estado a los botones de la tabla de puntos (C3, C10)

Seis líneas en `RewardTracker`, la pantalla que usan los padres a diario.

**Antes** (`RewardTracker.tsx:505-510` y `524-541`):

```tsx
<th className="p-3 border bg-gray-100 dark:bg-gray-700 text-left">Tareas</th>
{diasSemana.map(dia => (
  <th key={dia} className="p-3 border bg-gray-100 dark:bg-gray-700 text-center">
    {dia}
  </th>
))}
...
<button
  onClick={() => toggleTarea(dia, 'diarias', tarea.id)}
  disabled={syncing}
  className={`p-3 rounded-full ...`}
>
  <FontAwesomeIcon icon={faCheckSquare} className={`w-6 h-6 ...`} />
</button>
```

El nombre accesible del botón es **cadena vacía**, porque `FontAwesomeIcon` renderiza el SVG con `aria-hidden="true"`. Un lector de pantalla recorre 7 días por cada tarea diciendo "botón" sin más.

**Después**:

```tsx
<caption className="sr-only">
  Tareas de la semana. Cada celda indica si la tarea está completada ese día.
</caption>
...
<th scope="col" className="p-3 border bg-gray-100 dark:bg-gray-700 text-left">Tareas</th>
{diasSemana.map(dia => (
  <th key={dia} scope="col" className="p-3 border bg-gray-100 dark:bg-gray-700 text-center">
    {dia}
  </th>
))}
...
{/* y la primera celda de cada fila deja de ser <td>: */}
<th scope="row" className="p-3 border text-left font-normal">
  <div className="font-medium">{tarea.nombre}</div>
  <div className="text-sm text-gray-600">({tarea.puntos} pts)</div>
</th>
...
<button
  onClick={() => toggleTarea(dia, 'diarias', tarea.id)}
  disabled={syncing}
  aria-pressed={completada}
  aria-label={`${tarea.nombre}, ${dia}`}
  className={`p-3 rounded-full ...`}
>
  <FontAwesomeIcon icon={faCheckSquare} className={`w-6 h-6 ...`} />
</button>
```

Con esto el lector anuncia "Hacer la cama, Lunes, botón alternante, presionado". Antes decía "botón".

### 5.4. Convertir los `<div onClick>` en botones (C1, C2)

Es la única acción de la vista del hijo. Hoy, con teclado, no se puede hacer.

**Antes** (`ChildView.tsx:236-244`):

```tsx
<div
  key={task.id}
  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
    task.completada
      ? 'bg-green-50 border-green-200 ...'
      : 'bg-gray-50 border-gray-200 ... hover:border-blue-300'
  }`}
  onClick={() => toggleTask(todayCapitalized, 'diarias', task.id)}
>
```

**Después**:

```tsx
<button
  type="button"
  key={task.id}
  aria-pressed={task.completada}
  onClick={() => toggleTask(todayCapitalized, 'diarias', task.id)}
  className={`w-full text-left flex items-center justify-between p-4 rounded-lg border-2 transition-all
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
    task.completada
      ? 'bg-green-50 border-green-200 ...'
      : 'bg-gray-50 border-gray-200 ... hover:border-blue-300'
  }`}
>
```

Cuatro cosas gratis al cambiar el elemento: el foco, Enter, Espacio y el rol. El `cursor-pointer` sobra porque `<button>` ya lo trae. Mismo cambio en `ChildView.tsx:282-287` y en `FamilyPointsOverview.tsx:148-151`, este último a `<Link>` porque navega.

**Ojo con el cascade**: al quitar el `bg-*` del elemento en algún caso, la regla global de `globals.css:29-35` le pondría fondo azul. Se arregla borrando esa regla, que es el hallazgo B9.

### 5.5. Anunciar el marcador de puntos (F1, F2)

Dos atributos y una interpolación. Es el propósito de la aplicación.

**Antes** (`ChildView.tsx:190-194`):

```tsx
<CardContent className="text-center py-8">
  <div className="text-6xl font-bold mb-2">
    {weeklyTotal}
  </div>
  <p className="text-xl opacity-90">Puntos esta semana</p>
```

**Después**:

```tsx
<CardContent className="text-center py-8">
  <p
    aria-live="polite"
    aria-atomic="true"
    className="text-6xl font-bold mb-2"
  >
    <span className="sr-only">Llevas </span>
    {weeklyTotal}
    <span className="sr-only"> puntos esta semana</span>
  </p>
  <p className="text-xl" aria-hidden="true">Puntos esta semana</p>
```

`aria-atomic="true"` hace que se lea el mensaje completo, no solo el número que cambió. El `aria-hidden` en la etiqueta visual evita la doble lectura. Nota adicional: he quitado el `opacity-90` porque agrava el fallo de contraste B8.

Y el toast (`usePointsManagement.ts:296-299`):

```tsx
// Antes
toast.success(
  `${taskTypeMessage} ${newCompletedState ? 'completada' : 'desmarcada'}: ${currentTask.nombre}`,
  { position: "top-right", autoClose: 2000 }
);

// Después
toast.success(
  `${newCompletedState ? 'Completada' : 'Desmarcada'}: ${currentTask.nombre}. ` +
  `Total: ${nuevoTotalSemanal} puntos.`,
  { position: "top-right", autoClose: 5000 }
);
```

El emoji del mensaje original (`'✨ Tarea personalizada'` / `'📋 Tarea'`) también se lee en voz alta. Fuera.

Mismo patrón en `RewardTracker.tsx:215-218` y `RewardTracker.tsx:597`.

---

## 6. La parte importante: qué se arregla DENTRO del componente compartido

**La tesis**: la accesibilidad no escala como paso de revisión. Escala cuando está dentro del componente.

Esta aplicación es la demostración empírica del argumento, y tiene la prueba en el propio código. Alguien escribió `ui/Button`, `ui/Card`, `ui/Input` y `ui/Modal`. Fue el instinto correcto. Y después el proyecto tiene **55 `<button>` crudos frente a 51 `<Button>`**, **47 controles de formulario crudos frente a 0 `<Input>`** y **3 modales escritos a mano frente a 8 `<Modal>`**. El componente existe y la mitad del código pasa de largo.

Eso no se arregla con revisiones de código más estrictas. Se arregla haciendo que el camino correcto sea también el camino corto.

### 6.1. Qué va dentro de `ui/Button`

```tsx
// src/components/ui/Button.tsx
import React from "react";

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

// El tipo obliga: o hay texto visible, o hay label explícita. No hay tercera opción.
type ButtonProps =
  | (BaseProps & { children: React.ReactNode; iconOnly?: never; label?: never })
  | (BaseProps & { iconOnly: React.ReactNode; label: string; children?: never });
```

Los seis arreglos que se meten aquí:

1. **Paleta con contraste garantizado** (B1). Las seis variantes al escalón 600 o 700. Ningún llamante puede empeorarlo si además se cierra la puerta del punto 2.
2. **Cerrar el escape de `className` para color**. La prop `variant` no se usa **ni una sola vez** en el proyecto: 51 llamantes eligiendo color con `className`. Mientras esa puerta esté abierta, arreglar la paleta interna no arregla nada. La solución es filtrar las clases `bg-*` y `text-*` que llegan por `className`, o aceptarlas solo desde una lista permitida de tokens.
3. **Nombre accesible obligatorio para botones de solo icono** (C3, C5, C6, C7, C8). La firma de tipos de arriba hace que TypeScript rechace en tiempo de compilación un `<Button iconOnly={<FontAwesomeIcon icon={faCopy} />} />` sin `label`. Los tres botones sin nombre de `ShareChildLink.tsx:106-169` dejarían de compilar. Esto es lo que convierte la accesibilidad de "algo que hay que recordar" en "algo que el compilador te exige".
4. **Foco visible que sobrevive al contraste forzado** (H3). Cambiar `focus:outline-none focus:ring-2` por `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`, más un bloque `@media (forced-colors: active)`. El anillo actual de `box-shadow` desaparece en ese modo.
5. **Tamaño mínimo de objetivo** (I1, I2). `min-h-6 min-w-6` en el tamaño `sm` y `min-h-11 min-w-11` cuando es `iconOnly`. Los cuatro botones de borrar de 22 x 22 px pasan a cumplir 2.5.8 sin que nadie tenga que acordarse.
6. **Estado de carga anunciado y sin movimiento forzado** (F4, H1). El spinner de `Button.tsx:56-77` recibe `aria-hidden="true"`, se le añade `<span className="sr-only">Cargando</span>` y `aria-busy="true"` en el botón, y el `animate-spin` se envuelve en `motion-safe:`.

### 6.2. Qué va dentro de `ui/Input`

**Aquí hay que ser sincera: arreglar `ui/Input` hoy corrige exactamente cero hallazgos**, porque no lo importa ningún fichero del proyecto. Es código muerto. La búsqueda de `from '.../ui/Input'` en todo `src/` no devuelve nada.

Eso no invalida el argumento, lo refuerza: **un componente compartido que nadie usa no protege de nada**. El trabajo aquí es doble, arreglarlo y adoptarlo, y el segundo tramo es el que da el retorno.

Lo que va dentro, cuando exista:

1. **Etiqueta asociada por construcción** (E1, E2). `const id = useId()` dentro del componente, `htmlFor={id}` en la etiqueta e `id={id}` en el campo. Es imposible desde fuera crear un campo sin etiqueta asociada, porque el `id` no lo elige el llamante. Los 22 `<label>` huérfanos y los 12 campos sin etiqueta desaparecen por construcción.
2. **Errores anunciados** (E3). `aria-invalid={!!errorMessage}` en el campo, `aria-describedby` apuntando al `id` del mensaje, y `role="alert"` en el `<p>` del error. Un solo bloque, replicado automáticamente en los 47 controles cuando migren.
3. **Obligatoriedad programática** (E5, E6). Si llega `required`, el componente pone `required` y `aria-required` en el campo, y renderiza el asterisco visual con un `<span className="sr-only">obligatorio</span>` al lado.
4. **Foco visible en contraste forzado** (H3). Igual que en `Button`.

Y hacen falta tres hermanos, porque `Input` solo cubre `<input>`: **`Select`** (2 usos crudos), **`Textarea`** (3) y **`Checkbox`** (los de `taskForm.tsx:295`, `TaskManagement.tsx:639`, `PrivilegeManagement.tsx:633`, `AddEditChild.tsx:150`). Con `Field` como envoltorio común que resuelva etiqueta, descripción y error para los cuatro.

### 6.3. Qué va dentro de `ui/Modal`

Es el componente donde la inversión rinde más rápido, porque los 8 usos ya pasan por él. Arreglar el fichero corrige los 8 sitios sin tocar ni una línea de las pantallas.

Los seis arreglos que se meten aquí (D1, D3, D4):

1. `role="dialog"` y `aria-modal="true"` en el contenedor.
2. `aria-labelledby` apuntando a un título obligatorio. La prop `title` pasa a ser requerida, y el componente renderiza el `<h2>` con el `id` generado internamente. Hoy cada llamante pone su propio encabezado suelto: `TaskManagement.tsx:533`, `PrivilegeManagement.tsx:522`, `ShareChildLink.tsx:77`, `AddEditChild.tsx:189`.
3. **Trampa de foco**: al abrir, mover el foco al primer elemento enfocable o al diálogo. Al pulsar Tab en el último, volver al primero. Con `useRef` y un manejador de `keydown`, unas 25 líneas.
4. **Cierre con Escape** y **devolución del foco** al elemento que lo abrió, guardado en un `useRef` con `document.activeElement` en el momento de abrir.
5. **Inertizar el fondo**: `inert` en el contenedor de la aplicación mientras el diálogo esté abierto, para que el contenido de detrás salga del árbol de accesibilidad y del orden de tabulación.
6. **Restaurar el `overflow` previo** en la limpieza del efecto en lugar de forzar `'auto'` (D4).

### 6.4. La cuarta pieza que hace falta y que no es un componente

Los hallazgos B2 a B8 no viven en `Button`, `Input` ni `Modal`. Viven en `<p className="text-yellow-600">` y `<span className="text-gray-400">` repartidos por las pantallas. Ningún componente puede protegerte de eso.

La pieza que sí puede es la **capa de tokens semánticos** en `tailwind.config.js`, más una regla de ESLint:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      // Cada valor está verificado contra el fondo de la superficie donde se usa.
      'text-default': '#111827',  // gray-900,  17.74:1 sobre blanco
      'text-muted':   '#4b5563',  // gray-600,   7.56:1 sobre blanco
      'text-success': '#15803d',  // green-700,  5.02:1 sobre blanco
      'text-warning': '#b45309',  // amber-700,  5.02:1 sobre blanco
      'text-danger':  '#b91c1c',  // red-700,    6.47:1 sobre blanco
    }
  }
}
```

Y una regla `no-restricted-syntax` de ESLint que rechace `text-gray-400`, `text-yellow-500`, `text-yellow-600`, `text-green-500`, `text-green-600`, `text-orange-500` y `text-orange-600` en atributos `className`. El desarrollador ya no elige entre "un gris bonito" y "un gris accesible": elige entre `text-muted` y un error de lint.

Es el mismo principio que en los componentes. El código correcto tiene que ser el código que compila.

### 6.5. La cobertura, con números

He clasificado los 54 hallazgos en tres tramos.

**Tramo 1: solo se toca el interior de los tres componentes, ninguna pantalla.**

| Hallazgo | Componente |
|---|---|
| B1 contraste de las 6 variantes (51 botones) | `Button` |
| D1 diálogo sin rol, sin foco atrapado, sin devolución (8 usos) | `Modal` |
| D3 sin cierre con Escape | `Modal` |
| D4 restauración del scroll | `Modal` |
| H3 foco invisible en contraste forzado | `Button`, `Input` |
| I1, I2 tamaño mínimo de objetivo, parcial | `Button` |
| F4 estado de carga anunciado, parcial | `Button` |
| H1 movimiento reducido, parcial | `Button` |

**Cobertura del tramo 1: 5 hallazgos completos y 4 parciales, sobre 54. Alrededor del 10 %.** Y en `ui/Input` la cobertura es exactamente **cero**, porque no lo usa nadie.

**Tramo 2: tramo 1 más migrar los llamantes a los componentes. Es trabajo mecánico, sin lógica nueva.**

Migrar los 55 `<button>` crudos, los 47 controles de formulario y los 3 modales ad hoc cierra además:

| Hallazgos | Qué se cierra |
|---|---|
| C1, C2 | Los `<div onClick>` pasan a `<Button>` o `<Link>` |
| C3, C4, C5, C6, C7, C8 | Nombre accesible obligatorio por tipos |
| B9 | Al no quedar `<button>` sin `bg-*`, la regla global de `globals.css` se puede borrar |
| D2 | Los 3 modales ad hoc pasan por `ui/Modal` |
| E1, E2, E3, E5, E6 | Etiqueta, error, obligatoriedad, por construcción |
| I1, I2 | Tamaño de objetivo, ya completo |
| H1 | Movimiento reducido, ya completo |

**Cobertura acumulada del tramo 2: 23 de 54 hallazgos. El 43 %.**

**Tramo 3: tramo 2 más la capa de tokens y la regla de lint.**

Cierra B2, B3, B4, B5, B6, B7 y B8. Siete hallazgos más.

**Cobertura acumulada del tramo 3: 30 de 54. El 56 %.**

Si además se crea un quinto componente, un `<PointsCounter>` que encapsule el marcador con su `aria-live`, se cierran F1 y F2, los dos hallazgos que más pesan sobre la propuesta de valor del producto. **32 de 54, el 59 %.**

### 6.6. Los 22 hallazgos que NO escalan por componente

Ser honesta con el argumento significa decir también dónde no llega. Estos hay que arreglarlos pantalla por pantalla, y volverán a aparecer en la próxima pantalla si nadie está mirando:

- **A1 a A5**: idioma, título, foco al cambiar de ruta, enlace de salto, landmarks. Son decisiones de la capa de aplicación y del router.
- **C9 a C13**: el patrón de pestañas, el `scope` de las tablas, la jerarquía de encabezados. Cada tabla y cada página tienen su propia estructura.
- **E4**: la validación con `alert()` de `AddEditChild`. Es lógica de negocio.
- **F1 a F7**: qué merece anunciarse y con qué prioridad es una decisión de producto, no de componente. `<PointsCounter>` cubre las dos más importantes, el resto no.
- **G1 a G3**: los emojis decorativos son contenido. Solo se puede vigilar con lint (una regla que exija `aria-hidden` en nodos de texto que solo contengan emojis).
- **B10, H2, H4**: casos sueltos.

Para estos, la red de seguridad no es el componente, es el **pipeline**. Y ya está medio montada: Storybook 10 con `@storybook/addon-a11y` está instalado (`.storybook/main.ts:9`) y tiene exactamente **una** historia escrita. Ahí está la palanca:

1. Una historia por componente de `ui/`, con el addon de a11y activo. Detecta B1, C3, C5, C6, E1, E3, H3 automáticamente en cada cambio.
2. `vitest-axe` en los tests que ya existen (`src/__tests__/`), como aserción por defecto en cada render.
3. `eslint-plugin-jsx-a11y` en la configuración de ESLint, que hoy no está instalado. Habría detectado C1 y C2 (los `<div onClick>`) el día que se escribieron, sin que nadie los mirara.

---

## 7. Plan de trabajo

**Bloque 1, antes de enseñar la app a nadie** (12 críticos):
A1, B1, C1, C2, C3, C5, D1, D2, E1, E2, E3, F1.

**Bloque 2, siguiente iteración** (19 altos):
A2, A3, B2, B3, B4, B5, B7, B8, B9, C4, C6, C9, C10, D3, E4, F2, G1, I1.

**Bloque 3, mantenimiento** (16 medios y 7 bajos):
El resto de la tabla.

**En paralelo y desde el primer día**, porque es lo que evita reincidir:
`eslint-plugin-jsx-a11y`, historias de Storybook para los cuatro componentes de `ui/`, `vitest-axe` en los tests existentes, y la capa de tokens semánticos con su regla de lint.

**Reauditoría**: tras el bloque 1, y esta vez ejecutando la aplicación. Hay 5 hallazgos marcados como pendientes de verificación (B9, H4, I1, I2 y el conflicto de clases del apartado 5.2) que exigen navegador, y ninguna auditoría estática sustituye media hora con VoiceOver navegando `/child-view` con el trackpad desconectado.

---

## 8. Anexo: cómo reproducir los cálculos de contraste

Los ratios de la sección 3 salen de la fórmula de luminancia relativa de WCAG 2.x aplicada a los hex de Tailwind v3.4:

```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  donde cada canal c (normalizado a 0..1) vale:
  c / 12.92                          si c <= 0.03928
  ((c + 0.055) / 1.055) ^ 2.4        en caso contrario

ratio = (Lclara + 0.05) / (Loscura + 0.05)
```

Referencias de la paleta usadas: `gray-400` `#9ca3af`, `gray-500` `#6b7280`, `gray-600` `#4b5563`, `blue-500` `#3b82f6`, `blue-600` `#2563eb`, `green-500` `#22c55e`, `green-600` `#16a34a`, `yellow-500` `#eab308`, `yellow-600` `#ca8a04`, `orange-500` `#f97316`, `orange-600` `#ea580c`, `red-500` `#ef4444`, `cyan-500` `#06b6d4`, `purple-600` `#9333ea`.
