# Visión de producto: hacia dónde va la aplicación

> Documento de diseño acordado con la dueña el 13-nov-2026. Marca con **(dueña)**
> lo que decidió ella y con **(propuesta)** lo que propone quien escribe y ella
> todavía tiene que confirmar.
>
> **Derechos:** el método pedagógico es de Vicent Ginés Romero (ver `NOTICE.md`).
> Este documento describe la **estructura** del producto y nunca el contenido del
> método. El contenido vive en Firestore y la IA lo recibe en tiempo de ejecución.

---

## 1. Para qué existe

**El problema.** En muchas casas con adolescentes la convivencia se rompe: gritos
que se contestan con gritos, castigos que no funcionan y familias que dejan de
hacer cosas juntas. El método que la dueña estudió propone otra cosa: entender
qué tipo de adolescente hay en casa, que el adulto se mire a sí mismo y que, en el
momento del conflicto, lea la conducta del hijo como un pedido de ayuda.

**La aplicación.** Lleva ese método de la formación a la vida diaria de la casa.

**Definición de éxito (dueña).** La familia **convive bien y vuelve a hacer cosas
juntos**. El adolescente trabaja sus tareas y **sube de nivel hasta que ya no
necesita puntos** para hacer las cosas. El adulto **mira a su hijo de otra forma**.

> El éxito no es que usen mucho la app: es que **dejen de necesitarla**.

**Para qué la construye la dueña (dueña), en orden:**
1. **Practicar**: un proyecto real y completo para aprender y contar en
   entrevistas (React, Java, AWS, datos, IA, Angular).
2. **Venderla** si queda muy bien. Eso exige un acuerdo con Vicent (sección 6).

Origen: la idea inicial era ofrecérsela a Vicent a cambio de la formación.

---

## 2. Usuarios

| Usuario | Quién es | Qué busca |
|---|---|---|
| **Adulto responsable** (dueña) | Padre, madre, tutor, tío o abuela. Puede haber **varios por familia**, aunque vivan separados | Entender a su hijo, cambiar cómo reacciona y recuperar la convivencia |
| **Adolescente** (dueña) | El hijo o la hija | Ganar autonomía subiendo de nivel |
| **Coach** (dueña) | Profesional formado en el método | Dar formación online a un grupo de familias y seguir su avance |

**Varios adultos (dueña):** una sola familia, la del adolescente, con varios
adultos con acceso, aunque estén separados. No se modelan "dos casas".

**Corrección (revisión de arquitectura):** el modelo actual **no** lo soporta
todavía. `Family.miembros.padres` es un mapa, pero la autorización depende de
`usuarios.familyId`, que es **un solo valor** y las reglas impiden cambiarlo
desde la app (`firestore.rules:52-58`). Además, `invitaciones` cae en la regla
que lo deniega todo. Aceptar una invitación necesita un **servidor**, y ese es
el primer caso real de la API Java con autenticación. La propuesta es una
`Membresia(uid, familyId, papel)`, para que un adulto pueda estar en varias
familias (por ejemplo, una abuela con dos nietos).

---

## 3. El recorrido del método dentro de la app (núcleo familiar)

Orden (dueña):

1. **Descubrir el tipo de adolescente.** La app ayuda con preguntas sobre
   situaciones de casa y **el adulto decide** con una sugerencia delante. Hoy es
   solo un selector sin ayuda (`AddEditChild.tsx:152`).
   - Las preguntas **las escribe la dueña** a partir de la formación y de los
     libros que compró (dueña). Van a Firestore, nunca al repo.
   - **Se hace desde la cuenta del adulto**, en la ficha del hijo. El tipo es
     información de los adultos sobre el chico: **el adolescente no ve su color**.
   - **Cada adulto lo contesta por separado (dueña).** Si no coinciden, la app no
     decide: les muestra en qué difieren, como punto de partida para hablarlo.

   **Cuentas e invitaciones (dueña):** cada miembro tiene **su propia cuenta**
   (móvil y ordenador) y entra en la familia **por invitación**, como en un grupo
   de WhatsApp. Al adolescente se le invita con un código o un QR. Si tiene menos
   de 14 años acepta un adulto por él; desde los 14, acepta él.
2. **Mirarse a uno mismo.** El adulto revisa su propia adolescencia y cómo está
   educando: el **perfil del adulto**, **privado**, que nunca ve el hijo (iteración
   1 del plan del 17-oct).
   - **Lo heredado de la familia (dueña):** los patrones familiares que se
     repiten de generación en generación ("en mi casa se gritaba, y yo grito"),
     incluso cuando uno sabe que no quiere repetirlos y algo lo hace "ser fiel" a
     ellos.
   - **Epigenética (dueña, en investigación):** quiere incorporarla. Ella lo
     investiga antes de escribir el contenido. Criterio: el centro son los
     **patrones aprendidos**, que tienen evidencia sólida y se pueden cambiar. La
     herencia epigenética del trauma en humanos tiene evidencia débil y
     discutida, así que si aparece va como contexto y nunca de forma
     determinista. La IA nunca dice "heredaste esto genéticamente".
   - **El perfil se guarda en el servidor (dueña),** cifrado y **aislado por
     persona**, no por familia. Nadie más lo puede leer: ni el hijo, ni la coach,
     ni otro adulto de la familia.
3. **El momento del conflicto.** Cuando hay un choque, la app ayuda al adulto a
   parar, entender qué le está pidiendo el hijo según su tipo y elegir otra
   respuesta (propuesta: este es el momento de más valor de la app). Lo que sale
   de ahí se convierte en un **acuerdo** o en una **tarea**.
4. **Práctica diaria y niveles.** El adolescente trabaja en su zona: tareas,
   acuerdos y privilegios. **Sube de nivel; el nivel nunca baja** y sube por
   acuerdo mutuo, con los datos como apoyo (decidido el 17-oct).
5. **Retirar los puntos (propuesta).** Los puntos son un **andamio**. A más
   nivel, menos tareas con puntos y más acuerdos de confianza. La meta es llegar
   a un nivel donde los puntos ya no hagan falta.

**El adolescente también puede chatear con la IA, si los adultos lo activan
(dueña),** y **los adultos no leen esas conversaciones (dueña)**: la IA habla con
cada uno por separado y nada cruza de un lado al otro. El detalle está en la
arquitectura de la IA, §10.

**La IA acompaña el día a día (dueña).** Es el coach de texto (Claude) ya planeado:
sugiere tareas según el tipo, ayuda a cerrar acuerdos y recuerda lo trabajado en
la formación. **La coach humana aparece cada cierto tiempo; la IA, todos los días.**

---

## 4. La parte de la coach (formación online)

Lo que describió la dueña: la coach hace **sesiones online con todas las familias**
del grupo, **comparte sus recursos y presentaciones** y sigue los **objetivos
conseguidos**. En el fondo son **formaciones online**. Entre sesión y sesión, las
familias **practican en casa** lo aprendido y los adolescentes suben de nivel.

Propuestas:
- **La videollamada no se construye**: se enlaza una reunión de Zoom o de Google
  Meet. Construir videoconferencia no diferencia al producto.
- **La coach alimenta a la IA**: lo que enseña en una sesión pasa a ser contexto
  de la IA para esas familias durante la semana.
- **Lo que ve la coach, por defecto**: el **nivel** de cada adolescente y su
  **avance** (si subió de nivel desde la última sesión). No ve cuánto usan la
  app: medir el uso premiaría justo lo que no es el éxito.
- **El grupo es una entidad nueva** del proyecto 2: `Grupo(coach, familias)`,
  con sus sesiones. **No ve** conversaciones con la IA, el perfil privado
  del adulto ni detalles de la casa. Lo demás solo lo ve **si la familia lo
  comparte** para una sesión concreta. Es minimización de datos (RGPD con menores).

Pendiente (dueña): confirmar qué ve la coach. Lo dejó abierto ("no lo tengo claro")
y aceptó partir de la propuesta.

---

## 5. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- El recorrido del método (sección 3) funcionando con la familia de la dueña.
- Un proyecto que se pueda contar en una entrevista de punta a punta.

**No-objetivos (por ahora)**
- Videoconferencia propia.
- Pagos, cuentas de terceros y publicación como producto (fase 3).
- RAG con libros (sección 7, fase posterior).

**Anti-objetivos (sería un fracaso aunque funcione)**
- Que **los puntos se vuelvan el objetivo** y la app enganche en vez de soltarse.
- Que la app sirva para **vigilar** al hijo.
- Que la coach **vea la intimidad** de la casa.
- Que el **perfil privado del adulto** llegue al hijo.
- Que el **contenido del método** acabe en el repositorio público.

---

## 6. Restricciones

- **Derechos del método.** Uso personal de alumna: sí. Vender o usarlo con
  familias de terceros: **solo con acuerdo con Vicent**. Hasta entonces sigue en
  vigor `NOTICE.md` ("este proyecto no se comercializa"). El camino previsto es
  mostrarle un demo funcionando y proponerle ser socio tecnológico.
- **El diseño no depende del contenido.** El método entra desde Firestore a través
  de puertos. Si no hay acuerdo, se cambia la fuente de contenido sin reescribir
  la app.
- **Datos de menores.** Mínimo necesario y analítica seudonimizada
  (`docs/AWS-JUSTIFICACION.md`).
- **Repositorio público.** Nunca claves, datos personales ni contenido del método.
- **Coste.** AWS en el plan gratuito y diseñado para costar céntimos.

---

## 7. RAG con libros (fase posterior)

Idea de la dueña: un sistema que busca fragmentos relevantes en libros sobre el
tema antes de que la IA responda.

Propuesta:
- **Hoy no hace falta.** El contenido actual (42 reflexiones) cabe entero en el
  prompt. El RAG compensa cuando el contenido deja de caber.
- **Empieza con contenido propio**: las reflexiones y las preguntas que escriba la
  dueña. **Los libros entran solo con licencia**; los de Vicent, como parte del
  acuerdo con él. Comprar un libro da derecho a leerlo, no a indexarlo en un
  producto.
- Ni el texto ni los embeddings van al repositorio.
- La técnica ya está elegida en el plan de AWS: Atlas Vector Search, embeddings
  de Voyage y Claude Haiku detrás de un puerto.

---

## 8. Orden de trabajo (propuesta)

Son tres proyectos independientes. Cada uno tendrá su propio diseño y su plan.

1. **Núcleo familiar**: secciones 2 y 3. Se valida con la familia de la dueña.
2. **Coach y formación**: sección 4. **Condición:** usar el método con familias
   de terceros exige el acuerdo con Vicent y los requisitos legales. Hasta
   tenerlos, este proyecto es un **demo con familias ficticias** (propuesta,
   pendiente de que la dueña lo confirme).
3. **Producto vendible**: cuentas reales, pagos y RGPD completo.

**El protocolo de crisis lo revisa una profesional antes de encender** el momento
del conflicto y el chat del adolescente, no al final. Mientras tanto se
construyen con mensajes fijos y quedan apagados.

Los tres proyectos **comparten** identidad, familia (con su `Membresia`) y nivel:
son los contratos comunes y se construyen una sola vez, en el núcleo.

AWS y la capa de datos acompañan a los tres. El panel de datos puede mostrar justo
la curva que define el éxito: **los puntos bajan mientras el nivel sube**.

**Arquitectura de la IA:** en su propio documento,
[2026-11-13-arquitectura-ia-design.md](./2026-11-13-arquitectura-ia-design.md).

**Cimientos y agujeros actuales:** el orden de construcción, con los agujeros de
seguridad que hay hoy (por ejemplo, que cualquier cuenta nueva puede hacerse
admin, o que el contenido del método se lee sin sesión), está en un solo sitio:
[2026-11-13-arquitectura-front-back-design.md](./2026-11-13-arquitectura-front-back-design.md),
§2 y §8. **La fuente de la analítica de AWS** (propuesta): el libro de movimientos de
puntos en Mongo, en lugar de `weeklyTasks`. Hay que confirmarlo antes de S5.

**Privacidad con menores (revisión RGPD; no es asesoramiento legal):**
- **Ya, aunque sea práctica:** no registrar nunca conversaciones con la IA, el
  perfil privado, las respuestas del test ni nombres; usar alias en los prompts;
  hash **con sal secreta** en la analítica (es seudonimización, no
  anonimización); borrado completo de una familia; un registro mínimo de
  tratamientos en `docs/`; contarle al adolescente qué ve cada uno.
- **Antes de vender:** contratos de tratamiento con Anthropic, AWS, Google y
  Atlas; evaluación de impacto (casi seguro obligatoria: perfilado de menores con
  IA); consentimientos separados por edad (en España, **14 años**: por debajo
  consienten los padres; desde los 14, el propio adolescente, que puede revocar
  lo de sus padres); regla escrita para padres separados (la app no arbitra);
  protocolo de crisis revisado por una profesional; aviso de que es una IA.


---

## 9. Lo que queda para quien construya

- Cómo se calcula y se muestra el nivel, y cuántos niveles hay.
- La regla exacta para retirar los puntos por nivel.
- El formato de las preguntas para descubrir el tipo: lo define la dueña con su
  contenido; el código solo guarda la estructura.
- El rol "adulto responsable" en lugar de `padre | madre | tutor`, y los textos
  de la pantalla sin "padre".
- La interfaz de cada paso, siguiendo el design system (`src/components/ui/`).

## 10. Preguntas abiertas para la dueña

- Qué ve exactamente la coach (sección 4).
- Si el adolescente tiene algún papel en descubrir su propio tipo. La dueña no lo
  tiene claro (13-nov). **Propuesta:** al principio lo hace **solo el adulto**,
  porque el método empieza por él y un test que termina en "sos de tal color" puede
  hacer que el chico se sienta **etiquetado**. Más adelante, como opción, el
  adolescente podría hacer una reflexión sobre sí mismo **sin ver ningún color**.
  Pendiente de contrastar con la formación y los libros.
