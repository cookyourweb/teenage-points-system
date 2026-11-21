# Arquitectura de la IA: responsabilidades separadas

> Diseño del 13-nov-2026, a partir de la visión
> ([2026-11-13-vision-producto-design.md](./2026-11-13-vision-producto-design.md))
> y de tres revisiones especializadas: arquitectura de IA, arquitectura de
> software y RGPD con menores. Las marcas: **(dueña)** lo decidió ella;
> **(propuesta)** está pendiente de que lo confirme; 🔶 son supuestos sin verificar.
>
> El contenido del método nunca aparece aquí. Este documento solo describe
> **estructura**.

---

## 1. Las tres reglas que lo sostienen todo

1. **La IA propone; nunca escribe.** Devuelve una `Propuesta`. Solo el adulto,
   con un clic, la convierte en tarea (`POST /api/tasks`, el endpoint que ya
   existe) o en acuerdo. El módulo de IA **no importa** `task/` ni `acuerdo/`.
   El *human-in-the-loop* lo garantiza la estructura, no una convención.
2. **Los permisos se cierran por construcción, no por instrucciones al modelo.**
   Cada audiencia tiene su propio tipo de contexto. El de adolescente **no tiene
   campo** para el perfil privado del adulto, así que no se le puede filtrar.
3. **Lo que decide el producto no pasa por el modelo.** El tipo se calcula con
   código determinista, el nivel lo deciden las personas y los mensajes de crisis
   son fijos. El modelo solo redacta.

---

## 2. Componentes y su única responsabilidad

| Componente | Hace una sola cosa | Notas |
|---|---|---|
| `ContenidoMetodoPort` | Entrega los fragmentos del método para un momento y un tipo | Es la costura para cambiar de fuente o para pasar a RAG. Hoy el adaptador es Firestore |
| `EnsambladorDeContexto` | Construye el contexto **permitido** según la audiencia | Función pura. Es la frontera de privacidad |
| `ComponedorDePrompt` | Une la plantilla del momento con el contexto y el contenido, **delimitados como datos** | Función pura, se testea sin modelo |
| `ModeloPort` | Envía un prompt y devuelve una salida con esquema fijo (JSON) | Adaptadores `ClaudeModelo` y `ModeloFalso` (tests) |
| `GuardaDeSeguridad` | Dos ganchos: `DetectorDeRiesgo` **antes** del modelo y `ValidadorDeSalida` **después** | Ver §5 |
| `PresupuestoDeTokens` | Límite diario por familia y caché de sugerencias | Con presupuesto ~0 no es opcional |
| `Propuesta` (record) | Representa lo que la IA sugiere, siempre en estado *propuesta* | El límite del *human-in-the-loop* |
| `CoachService` | Orquesta la secuencia; no decide nada | El único con estado de flujo |
| `RegistroDeAuditoria` | Escribe **metadatos** de cada llamada, nunca texto | Ver §4 |
| `SustitutorDeNombres` | Cambia los nombres conocidos de la familia por alias **antes** de que el texto libre salga hacia el modelo, y los repone a la vuelta | Decisión de quien escribe: el texto del conflicto y del chat son libres, y la RGPD pide alias en los prompts |
| `NotasDelAdulto` | Guarda hechos cortos que el adulto **aprobó y puede editar o borrar** (por ejemplo, "le cuesta arrancar por la mañana") | Sustituye a la memoria de conversaciones. Mismo aislamiento que el perfil privado: por `uid` |
| `TipoService` | Calcula la sugerencia de tipo en el **servidor** a partir de las respuestas | Determinista y sin modelo. Es servidor porque el mapa respuesta→tipo es contenido del método y no puede llegar al navegador |

**Descartado a propósito:**
- **Memoria de conversaciones.** Guardaría texto íntimo, choca con el
  anti-objetivo de vigilancia y con el RGPD. En su lugar habrá **notas cortas
  aprobadas y editables por el adulto**, más las notas de sesión de la coach.
- **Motor de acuerdos dentro de la IA.** Los acuerdos son otra feature
  (`acuerdo/`). La IA solo redacta borradores.

---

## 3. Dónde vive cada cosa

**Backend:** una feature nueva `es.cookyourweb.points.ia/`, plana como `task/`.

```
ia/
  CoachController          GET  /api/ia/tipo/preguntas      (solo el texto de las preguntas)
                           POST /api/ia/tipo/sugerencia     (respuestas → {tipo, margen})
                           POST /api/ia/sugerencias
                           POST /api/ia/conflicto/turno
                           POST /api/ia/adolescente/turno   (más adelante, ver §10)
  CoachService
  TipoService              cálculo determinista en servidor
  ContenidoMetodoPort      FirestoreContenidoMetodo (Admin SDK, caché con TTL)
  EnsambladorDeContexto    ContextoAdulto | ContextoAdolescente | ContextoCoach   (tipos distintos)
  ComponedorDePrompt
  SustitutorDeNombres
  ModeloPort               ClaudeModelo, ModeloFalso
  GuardaDeSeguridad        DetectorDeRiesgo, ValidadorDeSalida
  PresupuestoDeTokens      CacheDeSugerencias (Mongo con TTL)
  NotasDelAdulto           Mongo, aislado por uid
  Propuesta                record
  RegistroDeAuditoria
```

El **perfil privado del adulto** no es de la IA: vive en su propia feature
(`perfil/`, Mongo, cifrado como un solo bloque y aislado por `uid`; detalle en el documento de frontend y backend, §5). La IA solo lo **lee**,
a través de un puerto, y solo para `ContextoAdulto` de esa misma persona.

**Frontend:** `src/services/coachService.ts` es el único adaptador a `/api/ia`,
igual que `customTaskService.ts` con las tareas. El navegador **nunca** recibe el
mapa respuesta→tipo ni el contenido del método: solo el texto de las preguntas y
la sugerencia ya calculada.

### Los tres momentos

**(a) Descubrir el tipo: solo el adulto y sin modelo en la primera versión**

```
UI adulto ─▶ GET  /api/ia/tipo/preguntas           (solo el texto de las preguntas)
          ─▶ POST /api/ia/tipo/sugerencia {respuestas}
               TipoService: sugerirTipo(respuestas, mapa)   función pura en servidor
          ◀─ {tipo, margen, porQué}
          ─▶ la UI muestra la sugerencia ─▶ el ADULTO elige ─▶ se guarda
             (una respuesta por adulto; si hay varios y no coinciden, se muestran
              las diferencias y no se decide solo; el adolescente no ve su tipo)
```

Que un modelo "diagnostique" el tipo sería opaco y arriesgado. El cálculo lo hace
el código; el modelo, más adelante, como mucho lo explica con palabras.

**(b) El conflicto: el adulto está en apuros**

```
UI: pantalla de pausa LOCAL (sin red, instantánea) + ping de calentamiento
 ─▶ POST /api/ia/conflicto/turno {texto ≤ 1500 caracteres, paso 1..3}
    JWT ─▶ ¿adulto? ─▶ PresupuestoDeTokens
    ─▶ DetectorDeRiesgo ──[riesgo]──▶ respuesta FIJA de escalado (sin modelo)
    ─▶ Ensamblador(ContextoAdulto) ─▶ Componedor ─▶ ModeloPort (clase Haiku, ≤ 300 tokens)
    ─▶ ValidadorDeSalida ──[falla o señal de riesgo]──▶ respuesta fija segura
    ─▶ UI. Al tercer paso cierra: "ahora andá a hablar con él". Sin chat infinito.
    ─▶ opcional: borrador de Propuesta. Mientras no exista acuerdo/ (fase 4), solo
       puede ser una TAREA (como en (c)); desde la fase 4, también un acuerdo.
```

La pantalla de pausa es local porque Java en Lambda puede arrancar **en frío en
varios segundos**. 🔶 SnapStart para imágenes de contenedor existiría desde
septiembre de 2026: se mide en S2 (documento de frontend y backend, §10).

**(c) Sugerencia diaria**

```
UI ─▶ POST /api/ia/sugerencias {tipo, nivel}        (sin texto libre)
   ─▶ caché por (tipo, nivel, versión del contenido, semana) ─[acierto]─▶ devuelve
   ─▶ si no: Ensamblador ─▶ Componedor ─▶ Modelo ─▶ Validador ─▶ guarda en caché
UI muestra Propuesta[] ─▶ el ADULTO acepta o edita ─▶ customTaskService ─▶ POST /api/tasks
```

La caché se puede **compartir entre familias** porque no entra ningún dato
familiar: casi todo serán aciertos y el coste será casi cero. Cuando exista el
contexto de la coach (proyecto 2), la clave suma la **versión del texto de sesión
del grupo**: `(tipo, nivel, versión del contenido, grupo, versión de sesión,
semana)`. Sigue sin entrar ningún dato de una familia concreta.

**El nivel** que recibe la sugerencia es, mientras no exista la feature de nivel,
el valor inicial (1). El nivel real llega con la fase 4.

---

## 4. Fronteras de datos

| Componente | Lee | Escribe | Nunca |
|---|---|---|---|
| `ContenidoMetodoPort` | contenido del método (Firestore) | nada | repo, logs |
| `EnsambladorDeContexto` | petición validada + `uid` del token + `Membresia` | nada | perfil privado en una audiencia que no sea el adulto |
| `ClaudeModelo` | el prompt ya compuesto | nada | guardar prompts |
| `PresupuestoDeTokens` | contadores, caché | contadores, caché | texto libre en la caché |
| `RegistroDeAuditoria` | metadatos | log | texto, salidas, nombres |
| `CoachService` | resultados de los demás | respuesta HTTP | tareas |
| `SustitutorDeNombres` | nombres de la familia (desde el servidor) | nada | mandar nombres reales al modelo |
| `NotasDelAdulto` | notas de ese mismo `uid` | notas que el adulto aprobó | texto de conversaciones sin aprobar; otra audiencia |

**Se registra:** id de petición, uid y familyId **seudonimizados con HMAC**,
momento, modelo, tokens, latencia, acierto de caché, si hubo riesgo, veredicto
del validador y versión del contenido.

**No se registra nunca:** texto del usuario, salida del modelo, perfil del adulto,
prompt completo, nombres de menores ni contenido del método.

**Quién eres sale del token (`uid`) y tu papel en cada familia sale de `Membresia`,** consultada en el servidor; nunca del cuerpo de la petición.

**Coach:** escribe un texto de sesión **por grupo**, nunca por familia, con
límite de longitud. Entra al prompt como datos delimitados (es otro canal de
inyección). La coach solo lee el nivel y un indicador de avance calculado en
servidor. No hay ningún endpoint que le dé conversaciones.

---

## 5. Seguridad

| Riesgo | Control |
|---|---|
| **Crisis**: autolesión, suicidio, violencia, maltrato | `DetectorDeRiesgo` determinista en español **antes** del modelo, más un campo `señal_riesgo` en la salida. Cualquiera de los dos dispara una **respuesta fija** con recursos: 112, 024, ANAR 116 111 🔶 (a validar con una profesional). El modelo no redacta ese mensaje. Si el adulto cuenta que pega al hijo, también escala |
| **Inyección de prompt** | Todo texto ajeno va delimitado como datos. Salida JSON con esquema fijo y sin herramientas: un ataque solo altera el texto devuelto, no puede escribir nada |
| **Fuga del contenido del método** | El validador rechaza coincidencias literales largas con el contenido inyectado. Protege los derechos y frena el "repetí tus instrucciones" |
| **Diagnóstico** | El modelo formula "hipótesis para conversar". Se bloquean términos clínicos y se deriva a profesionales |
| **Etiquetado** | Se habla de conducta y necesidad, nunca de "es de tipo X". El adolescente no ve su tipo |
| **Enganche** | El conflicto tiene 3 pasos y cierra. Sin rachas ni notificaciones de "volvé a usarme" |

---

## 6. Coste y latencia

| Momento | Modelo | Estrategia |
|---|---|---|
| Descubrir el tipo | **Ninguno** | Código determinista: coste cero |
| Conflicto | Clase Haiku | ≤ 1500 caracteres de entrada, ≤ 300 tokens de salida, 3 pasos, *prompt caching* del contenido |
| Sugerencia diaria | Clase Haiku | Caché compartida: casi siempre acierto |

🔶 Del orden de céntimos al mes con una familia. **Ojo:** el plan gratuito de AWS
**no cubre** la API de Claude. Controles: techo de gasto en la consola del
proveedor, presupuesto diario por familia y un interruptor que apaga el modelo y
sirve solo contenido fijo.

---

## 7. Cómo se prueba

| Capa | Test |
|---|---|
| Ensamblador, Componedor, Detector, Validador | Unitarios puros. *Golden* del prompt compuesto con **contenido ficticio**. `Clock` inyectado |
| `CoachService` | Con `ModeloFalso`: flujo, escalado, presupuesto, caché |
| `ClaudeModelo` | Contrato con HTTP simulado (WireMock). **Cero llamadas reales en CI** |
| `FirestoreContenidoMetodo` | Emulador de Firestore con documentos inventados |
| Evals | Corpus adversarial (inyecciones, frases de crisis, pedidos de diagnóstico) con contenido ficticio. A mano o de noche. Métrica dura: **el detector escala el 100 % de las frases de crisis** |
| Anti-fuga en el repo | Todo fixture de `src/test/resources/ia` lleva el marcador `[FICTICIO]`; un test falla si falta |
| Arquitectura | Un test impide que el contexto del adolescente importe el perfil privado |

---

## 8. Cómo entra el RAG sin tocar nada más

`ContenidoMetodoPort` nace con la firma `fragmentosPara(Consulta)`. `Consulta`
lleva momento, tipo y un texto opcional; cada `Fragmento` lleva **origen y
licencia**.

- **Hoy:** el adaptador de Firestore devuelve la categoría entera.
- **Después:** `RecuperadorAtlasContenido` implementa el mismo puerto con Atlas
  Vector Search, y los embeddings van detrás de un `EmbeddingsPort`. Lo demás
  **no cambia**. El adaptador filtra por licencia: lo que no tiene licencia no
  se indexa.
- **Cuándo:** cuando el contenido deje de caber (del orden de 15 a 20 mil tokens)
  y gane en las evals al prompt completo.

---

## 9. Orden de construcción

> **El camino real hasta la primera demo está en el documento de frontend y
> backend, §8:** 6 sesiones, y la IA arranca solo con 4 piezas. Esta tabla es el
> orden completo de la IA a largo plazo.

| Fase | Qué | Por qué en este orden |
|---|---|---|
**El orden de los cimientos (seguridad, autenticación, familia y cuentas) está
solo en el documento de frontend y backend, §8 (slices S0 a S6).** Esta tabla
ordena únicamente lo de la IA, encima de esos cimientos.

| Fase | Qué | Por qué en este orden |
|---|---|---|
| 0 | Cimientos: sesiones 1 a 3 (S0, S1 y S3) del documento de frontend y backend | Sin autenticación ni propiedad, un endpoint de IA es un grifo de dinero abierto |
| 1 | Descubrir el tipo (`TipoService` en servidor) + `ContenidoMetodoPort` + feature `perfil/` (perfil privado cifrado) | Lo mínimo útil, sin modelo. El perfil es el paso 2 del método y lo usa el conflicto |
| 2 | Sugerencia diaria: modelo, componedor, `SustitutorDeNombres`, guarda básica, presupuesto, caché y `Propuesta` (solo tareas) | Riesgo bajo (sin texto libre); ejercita todo el pipeline |
| 3 | Conflicto: pantalla de pausa, detector de riesgo, escalado con **mensajes fijos**, evals de crisis y `NotasDelAdulto` | Máximo valor y máximo riesgo. Se construye con los mensajes fijos y queda **apagado (interruptor) hasta que lo revise una profesional** |
| 4 | Features `nivel/` y `acuerdo/`. La `Propuesta` ya puede ser un acuerdo; el nivel real alimenta la sugerencia | El nivel sube por acuerdo mutuo: necesitan ir juntos |
| 5 | Chat del adolescente (`ContextoAdolescente`) | Necesita las guardas de la fase 3, `acuerdo/` (sus propuestas van ahí como borrador) y la revisión profesional |
| 6 | Contexto de la coach por grupo (proyecto 2) | Ver la condición legal en la visión §8 |
| 7 | RAG con contenido propio | Solo si el contenido deja de caber |

**Cómo llega al adulto lo que propone el adolescente.** "Nada cruza" se refiere a
las **conversaciones con la IA**. Lo que el adolescente decide proponer, con su
botón, crea un **borrador de acuerdo** en `acuerdo/`, visible para los adultos,
igual que un acuerdo que propone un adulto. La IA puede ayudarlo a redactarlo,
pero quien lo envía es él.

**El adolescente necesita cuenta propia** para chatear, aceptar acuerdos y dar su
consentimiento desde los 14. Ver la pregunta abierta en §11.

---

## 10. Decisiones de la dueña (13-nov)

**El adolescente sí tendrá chat con la IA, pero solo si los adultos lo activan
(dueña).** El argumento: los adolescentes ya chatean con IA en otros sitios, y es
mejor que lo hagan en un espacio pensado para ellos y con reglas.
- **Consentimiento:** por debajo de 14 años lo activa el adulto. Desde los 14, en
  España consiente el propio adolescente, así que hace falta que el adulto lo
  active **y** que el adolescente acepte.
- **Audiencia propia:** `ContextoAdolescente`, sin campo para el perfil del adulto
  ni para su "color". El tema está acotado: su zona, sus tareas, cómo proponer un
  acuerdo y cómo hablar con su familia. No es un chat de uso general.
- **Va tarde en el orden:** después del conflicto (fase 3), con las guardas ya
  probadas.

**Los adultos no leen las conversaciones del hijo con la IA (dueña).** "La IA
debería ser como un psicólogo que habla con uno y con otro."
- **Nada cruza de un lado al otro:** cada audiencia tiene su contexto y la IA no
  hace de mensajera. Si algo tiene que llegar al otro, lo lleva la persona (por
  ejemplo, proponiendo un acuerdo).
- **No se presenta como psicóloga:** dice que es una IA, no diagnostica ni hace
  terapia.

**Riesgo grave contado por el adolescente (dueña, sobre propuesta):** la app
**no avisa automáticamente a ningún adulto**, porque el riesgo podría venir de un
adulto de la casa. Le da al chico los recursos (024, ANAR 116 111, 112) y lo anima
a hablar con alguien de confianza. **Esta regla la revisa una profesional antes de
construirla.**

**El perfil privado del adulto se guarda en el servidor (dueña),** cifrado y
aislado por `uid`, no por familia. Incluye su historia y sus patrones familiares,
así que es el dato más íntimo de la app. Solo lo lee el `ContextoAdulto` de esa
misma persona. Vive en **Mongo**, en su propia feature `perfil/`, como todo
dominio nuevo. **Cifrado:** todo el perfil como un solo bloque, con la clave maestra en SSM
Parameter Store (gratis) y nunca en el repo. El detalle está en el documento de
frontend y backend, §5. Un
test de arquitectura demuestra el aislamiento.

## 11. Pendiente de decidir

- **Decidido (dueña, 13-nov): cada miembro de la familia tiene su propia cuenta,**
  adolescente incluido, y entra desde el móvil y desde el ordenador. Hoy no es
  así: el hijo entra con un enlace sin sesión, `/child-view/:familyId/:childId`
  (`docs/MODELO-DE-ROLES.md:41-44`). Ese enlace se retira cuando exista la cuenta.
- **(dueña)** ¿Se construye la parte de la coach (proyecto 2) antes de tener el
  acuerdo con Vicent? Propuesta: sí, como **demo con familias ficticias** y
  construida **"sin método"** (con contenido de ejemplo detrás del puerto), para
  poder enseñarla en público. A Vicent se le muestra en privado con su contenido.
  No bloquea: va después del núcleo.
- **(dueña, sin bloquear)** ¿Quién será la profesional que revise el protocolo de
  crisis? Hasta entonces, la fase 3 se construye con mensajes fijos y queda apagada.
- **Técnico:** medir el arranque en frío real de Java en Lambda.
- **Legal, antes de abrir a otras familias:** contrato de tratamiento (DPA) con el
  proveedor del modelo y base jurídica para datos de menores.
