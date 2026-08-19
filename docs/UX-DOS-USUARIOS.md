# Dos usuarios, una sola interfaz

Análisis de experiencia del Sistema de puntos familiar, hecho leyendo el código.
Toda afirmación lleva fichero y línea. Lo que no se puede deducir del código está
marcado como tal al final, en la sección "Lo que no he podido determinar".

Rutas relativas a `/Users/vero/Desktop/proyectosActivosCookyourweb/teenage-points-system/`.

---

## 1. Qué ve y qué puede hacer cada usuario hoy

### El padre

Entra por rutas protegidas por autenticación: `/dashboard` (`src/App.tsx:58-61`),
`/reward-tracker/:familyId/:childId` (`src/App.tsx:64-67`) y `/admin/faqs`
(`src/App.tsx:82-85`). Sin sesión, todas redirigen a `/`.

**Dashboard**, cuatro pestañas (`src/components/dashboard/Dashboard.tsx:48`):

*Vista General*: un párrafo explicando qué es la aplicación (`Dashboard.tsx:219-231`),
el componente `FamilyPointsOverview` (`Dashboard.tsx:234`), cuatro botones de acción
rápida (`Dashboard.tsx:242-275`) y una tarjeta "Resumen Familiar" con tres cifras
(`Dashboard.tsx:289-314`).

Dos de esas tres cifras están escritas a mano: `12` tareas base (`Dashboard.tsx:300`)
y `10` privilegios (`Dashboard.tsx:308`). No se calculan de ningún sitio.

Y `FamilyPointsOverview` **siempre muestra el estado vacío**. Su hook `useFamilyPoints`
hace `setChildrenPoints([])` sin más (`src/hooks/usePointsManagement.ts:361-363`),
con el comentario "Por ahora retornamos datos vacíos". El servicio que haría el trabajo
existe y está exportado: `getFamilyChildrenPoints` (`src/services/familyService.ts:271-290`,
exportado en la línea 366). Nadie lo llama. Así que el bloque principal de la pantalla
principal del padre dice permanentemente "No hay datos de puntos disponibles"
(`src/components/dashboard/FamilyPointsOverview.tsx:116-122`).

*Gestión de Hijos*: una tarjeta por hijo con avatar de emoji, nombre, edad y etiquetas
de tipo (`Dashboard.tsx:352-390`). Debajo, un botón "Ver Sistema de Puntos"
(`Dashboard.tsx:393-398`) y una fila de tres: Compartir, Editar, Eliminar
(`Dashboard.tsx:399-413`).

*Tareas Personalizadas* y *Privilegios Personalizados*: bloqueadas si el rol no es
`padre` ni `admin` (`Dashboard.tsx:426-442` y `449-465`; el rol se lee en
`Dashboard.tsx:59-61` desde `src/hooks/useUserRole.ts:23`).

**RewardTracker**, la herramienta real del padre:

- Tabla de 8 columnas (tarea + 7 días) por 15 filas de tarea más una de totales
  (`src/components/dashboard/RewardTracker.tsx:502-591`). Cada celda es un botón que
  marca o desmarca esa tarea ese día (`RewardTracker.tsx:524-541`).
- Datos en tiempo real desde Firestore vía `subscribeToWeeklyTasks`
  (`RewardTracker.tsx:162-190`), escritura con `updateTask` (`RewardTracker.tsx:227`).
- Tarjetas de privilegio con barra de progreso y "cuántos faltan"
  (`RewardTracker.tsx:782-791`).
- Canje de privilegio con calendario y **descuento real de puntos**
  (`RewardTracker.tsx:326-385`, el descuento en `332-349`).
- Aviso al desbloquear un umbral por primera vez (`RewardTracker.tsx:248-260`).
- Si es padre o admin, iconos de editar y borrar sobre cada privilegio
  (`RewardTracker.tsx:687-708`).

### El adolescente

Entra por `/child-view/:familyId/:childId`, **sin autenticación** (`src/App.tsx:70-73`).

Lo que ve, en el orden en que aparece en pantalla
(`src/components/dashboard/ChildView.tsx`):

1. Emoji de trofeo a 60px (línea 170).
2. "¡Hola {nombre}!" a `text-3xl` (líneas 171-173).
3. Un mensaje motivacional elegido por tramos de puntos (líneas 65-72, pintado en 175).
4. Tarjeta azul con el total semanal a `text-6xl` y la fecha de hoy (líneas 189-207).
5. "Mis Tareas de Hoy", separadas en diarias y extra (líneas 210-320).
6. "Mi Progreso de la Semana": siete casillas, una por día (líneas 323-371).
7. "Mis Privilegios Desbloqueados" (líneas 374-419).
8. "Mi Próximo Objetivo" con barra de progreso y "solo te faltan X puntos"
   (líneas 462-509).
9. Tarjeta rosa "¡Sigue así!" (líneas 512-523).

Lo que puede hacer: **marcar y desmarcar tareas** (líneas 243 y 287) y **canjear
privilegios** (líneas 398-408, con modal de elección de día en 422-459).

Esto contradice directamente lo que el propio proyecto dice de esa pantalla. El README
la describe como "un enlace propio de solo lectura" (README.md:7-9) y el modal de
compartir dice "solo lectura, interfaz amigable para niños"
(`src/components/ShareChildLink.tsx:93-96`). No es de solo lectura.

### Componentes que no ve nadie

`TaskCard.tsx`, `PrivilegeCard.tsx` y `TaskTable.tsx` no los importa ningún componente
que se renderice:

- El único import de `TaskCard` es su propia story (`TaskCard.stories.tsx:3`).
  `TaskManagement` define su **propio** `TaskCard` local (`TaskManagement.tsx:697`),
  que es el que se usa en las líneas 443 y 480.
- `PrivilegeCard` no aparece en ningún import fuera de sí mismo.
- `TaskTable` tampoco.

Además hay dos ficheros idénticos de 47 líneas: `src/components/ui/PrivilegeRedemptionModal.tsx`
y `src/components/ui/PrivilegeRedemptionModal_temp.tsx`. El único que consume alguno de
los dos es `PrivilegeCard`, que está muerto.

No afecta al usuario. Sí afecta a quien abra el proyecto por primera vez: son la primera
pista falsa que va a seguir.

---

## 2. Problemas de experiencia, ordenados por impacto

### P1. Padre e hijo no miran los mismos datos

Es el problema de fondo del que salen casi todos los demás.

`ChildView` usa `usePointsManagement`, que persiste en **localStorage** y solo ahí:
`tasks-${childId}` y `points-${childId}` (`src/hooks/usePointsManagement.ts:161-162`
para leer, `210-211` al inicializar, `282` y `290` al marcar tareas). Ni una sola
escritura a Firestore.

`RewardTracker` usa **Firestore**: `subscribeToWeeklyTasks`
(`src/components/dashboard/RewardTracker.tsx:162-190`) y `updateTask` (línea 227).

Consecuencias directas:

- El padre marca una tarea desde el ordenador y el hijo no la ve nunca.
- El hijo marca una tarea desde el móvil y el padre no la ve nunca.
- Si el hijo abre su enlace en el móvil y en la tablet, tiene **dos marcadores
  distintos** que no se hablan.
- Peor: `RewardTracker.tsx:121-154` lee esas dos claves de localStorage, las sube a
  Firestore y luego **las borra** (líneas 139-141). Si un padre abre `/reward-tracker`
  en el mismo navegador donde el hijo abrió su enlace, la próxima vez que el hijo entre,
  `usePointsManagement` no encontrará nada, caerá en la rama de inicialización
  (`usePointsManagement.ts:196-212`) y verá todo a cero. Sin explicación.

La promesa del producto es "que los hijos vean su progreso sin depender de que alguien
se lo recuerde" (README.md:3-5). Para eso hace falta que exista **un** progreso.
Hoy hay dos, y uno de ellos se puede borrar solo.

### P2. "Mi Próximo Objetivo" apunta al privilegio equivocado

`getNextPrivilege()` (`ChildView.tsx:61-63`) hace:

```ts
return initialPrivileges.find(privilege => weeklyTotal < privilege.points);
```

`initialPrivileges` **no está ordenado por puntos** (`src/config/rewardConfig.ts:141-211`).
El orden real es: 30, 50, 40, 45, 60, 80, 70, 100, 150, 200.

`.find` devuelve el primero del array que cumpla, no el más cercano. Resultado:

| Puntos del hijo | Le muestra | Le debería mostrar |
|---|---|---|
| 35 | 1 hora de TV (50 pts), faltan 15 | Elegir postre (40 pts), faltan 5 |
| 42 | 1 hora de TV (50 pts), faltan 8 | Tiempo extra dormir (45 pts), faltan 3 |
| 65 | Invitar a un amigo (80 pts), faltan 15 | Elegir película (70 pts), faltan 5 |

En tres de los diez tramos la aplicación le dice al chaval que le falta el triple de lo
que realmente le falta, y le esconde la recompensa que tiene a tiro.

La cercanía a la meta es la palanca motivacional más potente de esta pantalla, y el bug
está justo encima de ella. Es el error más caro del sistema en relación con su coste de
arreglo, que es de dos líneas.

Dato revelador: el padre **sí** lo ve bien. `fetchPrivileges` ordena por puntos
(`src/services/privilegesService.ts:22`) y `FamilyPointsOverview.getNextPrivilege`
está escrito tramo a tramo a mano y en orden correcto
(`src/components/dashboard/FamilyPointsOverview.tsx:56-68`). La lógica buena existe
dos veces en el repo, y ninguna de las dos es la que ve el hijo.

### P3. En la vista del hijo los puntos no se gastan

`getAvailablePrivileges()` (`ChildView.tsx:57-59`) devuelve **todos** los privilegios
cuyo coste sea menor o igual al total. Y `handleRedeemPrivilege` (`ChildView.tsx:75-112`)
no descuenta nada: escribe `unlocked: true` y añade una entrada al historial (líneas 90-93).

`RewardTracker` sí descuenta (`RewardTracker.tsx:332-349`). Son dos economías distintas
sobre el mismo marcador.

Lo que vive el hijo:

- Con 200 puntos ve los diez privilegios a la vez, todos con "¡Ya puedes disfrutarlo!"
  (`ChildView.tsx:394-396`). No hay elección: no hay coste de oportunidad.
- Puede canjear el mismo privilegio infinitas veces.
- Como el total nunca baja, "Mi Próximo Objetivo" se queda clavado en el privilegio más
  caro para siempre, y luego desaparece (el `getNextPrivilege()` de la línea 462 devuelve
  `undefined` a partir de 200 puntos y el bloque entero deja de renderizarse).

Un privilegio que no cuesta nada no es una recompensa. Es un cartel.

### P4. El botón "Canjear" del hijo probablemente lanza error

`ChildView.tsx:87` llama a `getPrivilegeById(privilege.id)`, donde `privilege` viene de
`initialPrivileges`, cuyos ids son las cadenas `'1'` a `'10'`
(`rewardConfig.ts:143, 151, 157, ...`).

`getPrivilegeById` hace `doc(db, "privileges", id)` (`privilegesService.ts:39`) y
`updatePrivilege` hace `updateDoc` (`privilegesService.ts:88`), que lanza si el documento
no existe. Los ids reales de esa colección los genera Firestore con `addDoc`
(`privilegesService.ts:66`): cadenas autogeneradas de 20 caracteres.

Salvo que alguien haya creado a mano documentos con id `"1"` a `"10"`, la cadena entera
revienta y el hijo ve `toast.error('Error al canjear privilegio. Inténtalo de nuevo.')`
(`ChildView.tsx:107`).

No lo puedo confirmar sin mirar los datos de Firestore. Lo que sí es seguro leyendo el
código: se está mandando un id de fichero de configuración a una función que espera un id
de base de datos.

### P5. Completar una tarea es casi silencioso, y lo poco que suena, suena lejos

Al marcar una tarea pasa esto:

- La fila se pinta de verde y el texto se tacha (`ChildView.tsx:253-257`).
- Aparece un ✨ a la derecha (`ChildView.tsx:265-267`).
- Salta un toast de `react-toastify` en `position: "top-right"`
  (`src/hooks/usePointsManagement.ts:296-299`).

Y lo que **no** pasa:

- El número grande de arriba (`ChildView.tsx:191`) cambia de golpe, sin transición, sin
  animación, sin que nada llame la atención sobre él.
- La barra de "Mi Próximo Objetivo" sí tiene `transition-all duration-500`
  (`ChildView.tsx:493`), pero está cuatro tarjetas más abajo, fuera de la pantalla en el
  momento exacto del toque.
- Nadie dice "+10" ni "te faltan 5 para el postre".

El momento con más carga emocional de toda la aplicación ocurre fuera del campo de
visión del usuario. Y encima el toast sale arriba a la derecha, que en un móvil sujetado
con una mano es el punto más lejano posible del pulgar que acaba de tocar.

### P6. La semana no termina nunca

No hay ninguna lógica de reinicio semanal en `ChildView` ni en `usePointsManagement`.
El total se reconstruye sumando todo lo que haya en `points-${childId}`
(`usePointsManagement.ts:191-192`) sin comprobar jamás de qué semana son esos puntos.
`currentWeekId` está declarado en la interfaz (`usePointsManagement.ts:11-17`) y el hook
del hijo no lo usa nunca.

Así que "Puntos esta semana" (`ChildView.tsx:194`) es una etiqueta que miente: son los
puntos acumulados desde que se abrió ese enlace por primera vez en ese navegador.

El padre sí tiene semana real: `getCurrentWeekId` (`src/services/familyService.ts:133`).

Sin cierre de semana no hay ciclo. Sin ciclo no hay ni urgencia ni derecho a empezar de
cero. Es la diferencia entre un juego y una hoja de cálculo que solo crece.

### P7. Las tareas de hoy son las mismas quince de siempre

`src/config/rewardConfig.ts:131-139`:

```ts
Martes: { ...lunesTasks },
Miércoles: { ...lunesTasks },
```

Los siete días son copias superficiales del mismo objeto. No hay tareas distintas por día
ni por hijo (todas llevan `childId: ''`, por ejemplo en la línea 12).

El hijo abre el enlace el jueves y ve exactamente lo mismo que el lunes. La novedad es la
mitad de la razón por la que alguien vuelve a abrir algo.

### P8. "Mi Progreso de la Semana" está diseñado para mostrar fracaso

`ChildView.tsx:331-369` pinta siete casillas con un número y "0/15 tareas". No hay
tendencia, ni comparación con la semana pasada, ni racha, ni nada que se parezca a un
progreso.

Y el icono de estado (`ChildView.tsx:358-364`) solo pone ✅ si `completed === total`, es
decir, si el chaval ha completado **las quince tareas** de ese día. En la práctica siempre
va a ver ⭐ o ❌.

Un umbral de todo o nada con quince tareas diarias casi nunca se cruza. El componente que
se llama "progreso" es el que más veces al día le dice al usuario que no ha llegado.

### P9. Accesibilidad: dos `aria-label` en 33 ficheros

En todo `src/` hay exactamente dos atributos `aria-label` (`src/components/ui/Modal.tsx:36`
y `src/components/dashboard/AdolescenteType.tsx`) y ni un solo `role`.

En `ChildView` las tareas se marcan con `<div onClick>` (`ChildView.tsx:236-243` y
`280-287`). Eso significa: no reciben foco con el tabulador, no se activan con Enter ni
con espacio, y un lector de pantalla no anuncia si la tarea está hecha o no. El estado
"completada" se comunica solo con color (verde o morado) y tachado.

Un adolescente que navegue con teclado, o con un lector de pantalla, o que tenga
dificultades para distinguir el estado por color, no puede usar esta pantalla. Y este
producto nació precisamente para un contexto familiar con necesidades de atención.

### P10. El enlace del hijo ni es de solo lectura ni es privado

Tres afirmaciones del propio proyecto que el código contradice:

1. "solo lectura" (README.md:7-9 y `ShareChildLink.tsx:93-96`). Falso: `ChildView` llama
   a `toggleTask` (línea 243) y a `updatePrivilege` (línea 90).
2. "Los enlaces son únicos y seguros" (`ShareChildLink.tsx:212-214`). El enlace es
   `/child-view/{familyId}/{childId}` (`ShareChildLink.tsx:18`), la ruta no pide
   autenticación (`App.tsx:70-73`) y no lleva ningún token. La seguridad depende por
   completo de que nadie adivine dos ids.
3. El QR se genera mandando la URL completa a un tercero: `api.qrserver.com`
   (`ShareChildLink.tsx:44`). El `familyId` y el `childId` del menor salen a un servidor
   externo cada vez que se abre ese modal.

Esto no es una pega de usabilidad. Es una decisión de producto que hay que tomar a
conciencia antes de compartir el enlace con nadie.

### P11. Los privilegios son globales, no de la familia

`fetchPrivileges` (`privilegesService.ts:19-34`) lee la colección `privileges` entera,
ordenada por puntos, **sin filtrar por familia**. `RewardTracker.tsx:105` la consume tal
cual. Si hay dos familias en la base de datos, cada una ve los privilegios personalizados
de la otra en su pantalla.

### P12. Al padre se le promete control que no tiene

`RewardTracker.tsx:713-769`: los tres inputs para editar un privilegio inicial solo
lanzan un `toast.success` y cierran el editor. "actualizado localmente" (línea 723),
"Puntos actualizados" (línea 735), "guardado" (línea 753). Ni una llamada a
`updatePrivilege`. Al recargar, todo igual.

El botón de la papelera sobre privilegios iniciales (`RewardTracker.tsx:696-707`) hace un
`window.confirm` y un `toast.info` (línea 699). No oculta nada.

Y el historial de privilegios (`RewardTracker.tsx:1038-1091`) se alimenta solo de
`setPrivilegeHistory` en memoria (línea 367), nunca se lee de Firestore. Al recargar la
página desaparece, mientras el subtítulo dice "Historial guardado en: /weeklyTasks"
(línea 1042).

Prometer control y no darlo erosiona la confianza más rápido que no ofrecerlo.

---

## 3. Qué jerarquía debería tener cada vista

### Adolescente, móvil: lo primero es cuánto le falta

**Una sola cosa: la distancia a la siguiente recompensa concreta.**

Una frase y un número. "Te faltan 5 puntos para elegir el postre".

Por qué eso y no el total acumulado:

El número absoluto no significa nada sin escala. 145 puntos puede ser mucho o poco: el
chaval no tiene forma de saberlo sin hacer cuentas. "Te faltan 5" es accionable en la
escala de una sesión de tres segundos, que es exactamente lo que dura la visita: abre el
enlace, mira, cierra.

El total es información de balance. La distancia a la meta es información de acción. En
una pantalla que se consulta de pie, en el pasillo, con el móvil en una mano, solo cabe
información de acción.

Y sobre todo: esa es la única pregunta que el hijo se hace de verdad al abrir el enlace.
Nadie abre esto para saber cuántos puntos tiene. Lo abre para saber si ya puede pedir algo.

Orden propuesto para `ChildView`, de arriba abajo:

1. **Distancia a la siguiente recompensa**, con su nombre y una barra. Una sola meta, la
   más cercana. Hoy está en la posición 5 (`ChildView.tsx:462-509`).
2. **Las tareas de hoy que aún puede hacer**, con lo que suma cada una, ordenadas por
   puntos de mayor a menor. Que vea que con dos tareas llega. Hoy están en la posición 3
   y sin ordenar (`ChildView.tsx:210-320`).
3. **El total de la semana**, en pequeño. Hoy es el bloque más grande de la pantalla
   (`ChildView.tsx:189-207`).
4. Progreso de la semana (`ChildView.tsx:323-371`).
5. Privilegios ya ganados (`ChildView.tsx:374-419`).

Fuera de la pantalla: el emoji de trofeo de 60px (`ChildView.tsx:170`), el mensaje
motivacional genérico (`ChildView.tsx:175`) y la tarjeta "¡Sigue así!"
(`ChildView.tsx:512-523`). Entre los tres ocupan casi todo el primer scroll y no dicen
nada que el hijo no sepa ya.

### Padre, escritorio: lo primero es qué hijo necesita atención

Hoy lo primero que ve es un párrafo explicando qué es la aplicación
(`Dashboard.tsx:219-231`), que él ya sabe porque la configuró él mismo. Y justo debajo,
un componente que siempre está vacío (`Dashboard.tsx:234`).

Debería ser: por cada hijo, nombre, puntos, última actividad y la diferencia contra la
semana anterior. El padre no entra a leer, entra a comprobar.

Y lo más importante: **si algo no ha pasado, eso es lo que hay que enseñar arriba**. Un
hijo que lleva cuatro días sin marcar nada es la información que el padre necesita, y hoy
no se muestra en ningún sitio. `lastActivity` ya existe en el modelo
(`src/hooks/usePointsManagement.ts:16`) y `formatLastActivity` ya está escrito
(`FamilyPointsOverview.tsx:16-40`).

La tabla de 8 columnas de `RewardTracker` (`RewardTracker.tsx:502-591`) es la herramienta
correcta para escritorio y sesión larga: densidad alta, todo a la vista, edición por
celda. Ahí no hay nada que cambiar de jerarquía.

---

## 4. Motivación y comportamiento

### Lo que funciona de verdad con adolescentes

**Cercanía a la meta.** El esfuerzo sube cuando la meta se ve cerca. Por eso la barra de
"Mi Próximo Objetivo" (`ChildView.tsx:491-501`) es el elemento con más potencial de toda
la aplicación, y por eso el bug de `getNextPrivilege` (P2) es el más caro que tiene: está
saboteando exactamente la palanca que funciona.

**Esfuerzo ya invertido.** Enseñar lo que ya lleva hecho hace que cueste más abandonar.
"Llevas tres días seguidos" es información que la aplicación ya tiene (los puntos por día
están en `totalPoints`, usados en `ChildView.tsx:334`) y no usa.

**Feedback inmediato y donde se está mirando.** El "+10" tiene que salir junto al dedo que
acaba de tocar, no en la esquina superior derecha
(`src/hooks/usePointsManagement.ts:298`).

**Anticipación concreta.** "Elegir postre especial" (`rewardConfig.ts:161`) funciona
porque es una imagen mental. "40 puntos" no funciona. El nombre del privilegio siempre
por delante del número.

**Autonomía.** Que el hijo elija cuándo gastar sus puntos y en qué. El modal de canje
(`ChildView.tsx:422-459`) ya lo hace bien: le deja elegir el día. Eso está bien pensado
y hay que conservarlo.

### Lo que no hay que hacer aquí, y por qué

**Ranking entre hermanos. Esto es urgente.**

El código ya existe: `FamilyPointsOverview.tsx:213-242` pinta un podio con oro, plata y
bronce entre los hijos de la familia. Hoy no se renderiza solo porque `childrenPoints`
siempre está vacío (`usePointsManagement.ts:363`). **En cuanto se arregle ese hook, el
podio aparece.** Hay que borrarlo antes de tocar el hook.

Un ranking convierte una tarea doméstica en una competición entre dos personas que van a
seguir compartiendo casa esta noche. El hermano que queda segundo no aprende a hacer la
cama: aprende que la hace peor que su hermano, y se lo dice la aplicación de sus padres.
En un producto de consumo un leaderboard es una palanca de retención. En una casa es otra
cosa completamente distinta, y no es lo mismo.

**Rachas que se rompen y castigan.** Un contador de días consecutivos que vuelve a cero
cuando el chaval se pone malo o se va de campamento no motiva: culpabiliza. Si se usa la
racha, que sea acumulativa ("llevas 12 días este mes") y nunca destructiva.

**Notificaciones push y recordatorios automáticos.** La promesa del producto es
literalmente "sin depender de que alguien se lo recuerde" (README.md:3-5). Una
notificación es exactamente eso: alguien recordándoselo, solo que ahora quien da la lata
es el móvil en lugar del padre. Sustituir la voz del padre por un badge rojo no resuelve
el conflicto, lo automatiza. Que el hijo abra el enlace cuando quiere es la decisión
correcta y hay que defenderla aunque baje el uso.

**Puntos negativos, penalizaciones o pérdida por inactividad.** El sistema tiene que ser
aditivo. Restar puntos por no hacer algo convierte el marcador en un registro de faltas y
le da al padre una herramienta de castigo con interfaz.

Matiz: `toggleTask` hoy permite desmarcar y resta los puntos
(`usePointsManagement.ts:274`). Eso es corregir un error de dedo, no penalizar, y está
bien. Lo que no debería poder hacer el padre es desmarcar retroactivamente algo que el
hijo ya dio por cobrado sin que quede constancia.

**Escasez artificial y cuentas atrás.** "¡Solo hasta el domingo!" para un privilegio
doméstico es manipulación, y además el chaval la va a detectar. Los adolescentes son
extraordinariamente buenos detectando cuándo les están vendiendo algo. El día que detecte
que la aplicación le manipula, deja de creerse también la parte honesta.

**Métricas de uso como objetivo.** Aquí el éxito **no** es que el hijo abra la aplicación
muchas veces. Es que la casa funcione mejor y que haya menos discusiones. El día que
alguien mida "sesiones por día" en este producto, ese día empieza a diseñar contra el
usuario.

### El límite ético de fondo

Hay que decirlo con claridad, porque cambia el listón de todo lo anterior.

Aquí el usuario es un menor que no eligió instalar esto, y quien define las reglas, los
puntos y las recompensas es su padre. No hay salida del producto: no puede darse de baja,
no puede irse a la competencia, no puede negociar los términos. Eso elimina las dos únicas
protecciones que tiene cualquier usuario normal frente a un diseño abusivo.

La consecuencia práctica es contraintuitiva: **el listón ético aquí es más alto que en una
aplicación de consumo, no más bajo.** Todo lo que en un producto normal sería
"gamificación agresiva pero aceptable", aquí es la presión de un padre sobre un hijo con
una interfaz por delante que la hace parecer neutral y objetiva. La aplicación no es un
árbitro: es el altavoz de una de las dos partes.

La relación padre e hijo no es una relación de producto y usuario, y el producto no debe
fingir que lo es. Esto tiene que ser el sitio donde se **consulta un acuerdo**, no el sitio
donde se **aplica una presión**.

Dos consecuencias concretas que salen de ahí:

1. Los puntos no deberían poder bajar sin que el hijo lo vea y sepa por qué.
2. El hijo debería poder ver el histórico completo de lo que ha ganado y lo que ha
   gastado. Hoy no puede: el historial solo existe en el estado local del padre
   (`RewardTracker.tsx:367`) y `ChildView` no tiene ninguna vista de histórico. Sin
   histórico, el marcador es la palabra del padre con tipografía bonita.

---

## 5. Móvil primero: qué se rompe hoy

Todo lo de esta sección sale de leer clases de Tailwind en el código, no de medir en un
dispositivo real.

**1. Los tres botones de la tarjeta de hijo se aplastan.**
`Dashboard.tsx:399`: `grid grid-cols-3 gap-2`, sin ningún breakpoint. Dentro van
`ShareChildLink` (que renderiza un botón con icono y la palabra "Compartir",
`ShareChildLink.tsx:66-72`), "Editar" y "Eliminar". En un móvil de 360px, la tarjeta mide
unos 328px, menos el `p-4` de `Card` (`src/components/ui/Card.tsx:11`) quedan unos 296px,
divididos en tres con `gap-2`: unos 93px por botón. "Compartir" con icono a `text-xs px-2`
no cabe. Debería ser `grid-cols-1 sm:grid-cols-3`.

**2. `ShareChildLink` no tiene ni un solo breakpoint** en sus 241 líneas (cero
ocurrencias de `sm:`, `md:` o `lg:`). Las filas `flex gap-2` con un input `flex-1` más un
botón (`ShareChildLink.tsx:99-112` y `157-170`) meten una URL completa en un input de unos
200px. El QR es fijo de 200x200 (`ShareChildLink.tsx:44`).

**3. El modal se pelea consigo mismo en pantalla pequeña.**
`src/components/ui/Modal.tsx:32`: contenedor con `p-6 max-w-[95vw] max-h-[90vh]
overflow-y-auto`, y el botón de cerrar en `absolute top-4 right-4` (líneas 33-35) sin
reservar espacio para él. El título "Compartir Sistema de Puntos" a `text-2xl`
(`ShareChildLink.tsx:77-79`) pasa por debajo del aspa en cuanto la pantalla se estrecha.
Y el contenido de `ShareChildLink` mide bastante más de `90vh`, así que en móvil queda un
scroll dentro de otro scroll.

**4. La tabla de `RewardTracker` sí tiene `overflow-x-auto`** (`RewardTracker.tsx:501`).
Eso está bien resuelto. Pero son 8 columnas y 16 filas con celdas `p-3` y botones `p-3`:
hay que arrastrar unos 700px para llegar al domingo, y **la primera columna no está fija**,
así que en cuanto empiezas a desplazarte dejas de ver el nombre de la tarea que estás
marcando. No está rota: es que una tabla no es un patrón de móvil. Y esta pantalla es del
padre, así que es aceptable. Solo hay que no fingir que funciona en el móvil.

**5. `TaskTable.tsx:14`** tiene `min-w-full` sin ningún contenedor con `overflow-x`. Eso
sí desbordaría el `body`. No pasa hoy porque el componente está muerto (P9 de la sección 1),
pero rompe en cuanto alguien lo use.

**6. Área táctil en `ChildView`.** Las filas de tarea son `p-4` con dos líneas de
contenido: unos 70px de alto, muy por encima del mínimo recomendado. Eso está bien. El
problema es el contrario: el objetivo táctil es el `div` entero
(`ChildView.tsx:236-243`), así que un scroll que arranque encima de una tarea puede
marcarla sin querer. Y no hay confirmación ni deshacer visible: el único deshacer es
volver a tocar y darse cuenta.

**7. El grid de siete días come media pantalla.**
`ChildView.tsx:331`: `grid-cols-2 md:grid-cols-4 lg:grid-cols-7`. En móvil son cuatro
filas de dos celdas `p-4`: unos 500px de alto para mostrar siete números. Es el bloque que
más pantalla consume y el que menos aporta (P8).

**8. `index.html` está sin tocar desde el `create vite`.**
`lang="en"` (línea 2) en una aplicación al 100% en español: un lector de pantalla va a leer
"¡Hola Guillermo!" con fonética inglesa. El `<title>` es "Vite + React + TS" (línea 7), que
es literalmente lo que se guarda si el chaval añade el enlace a la pantalla de inicio del
móvil. No hay `theme-color` ni manifest. El `viewport` (línea 6) sí está correcto.

**9. `src/theme.css` no está importado en ninguna parte.** El único import de CSS de toda
la aplicación es `globals.css` en `src/main.tsx:4`. Ese fichero de variables de color no
llega nunca al navegador.

**10. `globals.css:29-35` pinta de azul primario todos los `<button>` del documento.** Los
botones que traen su propia clase de fondo ganan por especificidad (una utilidad de
Tailwind es 0-1-0 contra un selector de elemento, 0-0-1), así que hoy no se nota. Pero
cualquier botón nuevo sin clase de fondo saldrá azul.

### Sobre la inconsistencia visual

Mis mediciones sobre los `.tsx` de `src/` (metodología: cadenas únicas del tipo
`bg-|text-|border-|from-|to-|via-|ring-` más familia y tono):

- **82 combinaciones familia y tono distintas**, repartidas en **11 familias de color**:
  blue, cyan, gray, green, indigo, orange, pink, primary, purple, red, yellow.
- **Ninguna tiene significado asignado.** El verde es "tarea completada"
  (`ChildView.tsx:240`), "guardar" (`RewardTracker.tsx:658`), "compartir"
  (`ShareChildLink.tsx:68`) y "desbloquear" (`RewardTracker.tsx:798`). Cuatro conceptos sin
  relación, un color.
- **El espaciado, en cambio, sí es consistente**: los únicos valores usados son 1, 1.5, 2,
  3, 4, 6, 8, 12, `px` y `auto`. Es la escala por defecto de Tailwind, sin un solo valor
  arbitrario. Ahí no hay nada que arreglar.
- **La adopción de `src/components/ui/` es de 9 ficheros sobre 33.** Los otros 24 pintan
  a mano.

Mis números no coinciden con el "163 tokens de color y 47 espaciados" del enunciado.
Puede ser diferencia de metodología (si se cuentan variantes `dark:` y `hover:` por
separado, o si se incluye `dist/` y `storybook-static/`). La conclusión es la misma en las
dos cuentas: el color no significa nada en esta interfaz.

---

## 6. Cinco cambios, por relación impacto y esfuerzo

### 1. Un solo origen de datos para padre e hijo

`ChildView` deja de usar localStorage y pasa a `subscribeToWeeklyTasks` y `updateTask`,
igual que hace ya `RewardTracker`.

- `src/hooks/usePointsManagement.ts`: sustituir el bloque de localStorage (líneas 160-212)
  y la persistencia de `toggleTask` (líneas 273-292) por las llamadas de `familyService`.
- `src/components/dashboard/RewardTracker.tsx`: eliminar el bloque de migración
  (líneas 121-154), que hoy borra el marcador del hijo sin avisar.

Impacto máximo. Sin esto, todo lo demás son mejoras sobre una pantalla que muestra datos
que no existen para nadie más. Esfuerzo medio, porque el servicio ya está escrito y
probado en `RewardTracker`.

### 2. Ordenar los privilegios antes de buscar el siguiente

- `src/config/rewardConfig.ts:141-211`: ordenar el array por `points` ascendente.
- `src/components/dashboard/ChildView.tsx:57-63`: ordenar defensivamente antes del `.find`
  y del `.filter`, para que no dependa del orden del fichero de configuración.

Impacto alto: arregla la palanca motivacional principal. Esfuerzo de minutos. Es la mejor
relación de las cinco, con diferencia. **Hazlo primero aunque el 1 tarde.**

### 3. Subir "cuánto te falta" al primer bloque

En `src/components/dashboard/ChildView.tsx`: mover el bloque de las líneas 462-509 arriba
del todo, reducir la cabecera (líneas 170-176) a una línea de saludo, y bajar la tarjeta
del total (líneas 189-207) a dato secundario.

Impacto alto. Esfuerzo bajo: es reordenar JSX que ya existe.

Importante: solo tiene sentido **después** del cambio 2. Si no, lo que subes a primera
posición es un dato equivocado, y lo dejas más visible que nunca.

### 4. Feedback en el punto del toque

Al marcar una tarea: un "+10" que aparece sobre la propia fila, y la barra de progreso
reaccionando de forma visible, en lugar del toast de esquina.

- `src/hooks/usePointsManagement.ts:296-299`: quitar o reubicar el toast.
- `src/components/dashboard/ChildView.tsx:236-268`: el feedback local en la fila.

Impacto medio y alto sobre la sensación de progreso, que hoy es nula. Esfuerzo bajo.

### 5. Conectar `useFamilyPoints` y borrar el podio entre hermanos

- `src/hooks/usePointsManagement.ts:361-363`: el hook devuelve `[]` a pelo mientras
  `getFamilyChildrenPoints` ya existe (`src/services/familyService.ts:271-290`) y está
  exportado (línea 366). Dos líneas y la Vista General del padre deja de estar vacía.
- `src/components/dashboard/FamilyPointsOverview.tsx:213-242`: **borrar el bloque de
  ranking en el mismo cambio**, antes de que empiece a renderizarse.

Impacto alto para el padre, y evita meter en producción un patrón dañino sin darse cuenta.
Esfuerzo bajo.

Aviso sobre este cambio: `getFamilyChildrenPoints` filtra por `doc.id.startsWith(familyId)`
(`familyService.ts:284`) sobre una query que trae la colección entera (líneas 272-276), y
`updateChildPointsSummary` escribe siempre `childName: ""` (`familyService.ts:261`). Al
conectarlo van a salir nombres vacíos. Hay que arreglarlo en el mismo paso.

---

## Lo que no he podido determinar leyendo el código

- **Si el botón "Canjear" del hijo funciona.** Depende de si existen documentos en la
  colección `privileges` de Firestore con ids `"1"` a `"10"`. Hay que mirar la base de
  datos (ver P4).
- **Si hay reglas de seguridad de Firestore.** El fichero de reglas no está en el
  repositorio. Sin eso no puedo decir si el enlace público del hijo (`App.tsx:70-73`)
  permite leer o escribir datos de otras familias.
- **Cómo se comporta de verdad en un móvil.** Toda la sección 5 sale de leer clases de
  Tailwind, no de medir en un dispositivo. Las estimaciones de píxeles son aritmética
  sobre la escala de Tailwind, no capturas.
- **Si algún adolescente real ha usado esto y qué hizo.** No hay analítica, telemetría ni
  registro de eventos en el repositorio. Nada de lo que digo sobre comportamiento está
  validado con datos de este producto: viene de patrones conocidos, y hay que tratarlo
  como hipótesis hasta que se mida.
- **Qué pasa con `initialTasks` y las copias superficiales** (`rewardConfig.ts:131-139`)
  cuando dos días se modifican a la vez en `RewardTracker`. `toggleTarea` hace
  `JSON.parse(JSON.stringify(tasks))` (`RewardTracker.tsx:203`), así que trabaja sobre una
  copia profunda del estado y no del config. No he encontrado ninguna ruta que mute
  `initialTasks` directamente, pero tampoco puedo descartarlo sin ejecutar la aplicación.

---

*Análisis hecho sobre el árbol de trabajo en `main`, commit `b1c9714`.*
*No se ha modificado ningún componente.*
