# Entrega 1 — Importar deberes: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el adulto pega en la app la lista que Claude in Chrome saca de Classroom (exámenes, entregas, material y avisos), ve qué es 🆕 nuevo, ✏️ cambió, igual o ya no aparece, acepta lo que quiere y lo guarda. Después ve los deberes de su hijo ordenados por fecha, con el material colgado de cada examen, y confirma o archiva cada uno.

**Architecture:**
- Feature nueva `es.cookyourweb.points.deber` (espejo de `task/`), colección Mongo `deberes` con índice único `(familyId, hijoId, clave)`, y colección `importaciones` con **un documento por hijo** (upsert) para «Última importación». `Task.java` no se toca.
- Rutas bajo `/api/familias/{familyId}/hijos/{hijoId}/` (`deberes` e `importaciones-deberes`) con `requireMember` (404 entre familias), igual que `eleccionesTipo`.
- Frontend: funciones puras en `src/utils/deberes/` (enlaces, formato, comparar, agrupar), un adaptador `src/services/deberesService.ts`, y pantallas en `src/components/deberes/` montadas en una pestaña nueva del `Dashboard`.
- Guardar = **una petición por deber** (POST nuevo / PUT cambió), con 4 en vuelo a la vez. Ver Decisión 2.

**Tech Stack:** Java 17, Spring Boot 4.1 (Jackson 3: `tools.jackson.databind`), Spring Data MongoDB, Testcontainers; React 18 + TS 5.7, Vitest, Testing Library, `vitest-axe`.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` §8 «Antes de la sesión 5: deberes con fecha e "Importar deberes"» (tabla entera, incluidas las filas del 20-nov); §10 «404 entre familias»; `MEMORY.md` «`Task.java` intocable» (coach).

---

## Decisión 1 — tipo aparte `Deber`, no ampliar `Task` (✅ sí de la dueña, 20-nov)

**Decidido: tipo aparte** (`backend/.../deber/` + `src/services/deberesService.ts`).

| | A. Ampliar `Task` (+ `TaskType.DEBER`, campos opcionales) | **B. `Deber` aparte (recomendada)** |
|---|---|---|
| `Task.java intocable` (coach) | Lo rompe: cambia el constructor del record y cada `new Task(` de tests | Lo respeta |
| Rejilla semanal | `usePointsManagement` pide `getActiveTasksByFamily`: los deberes aparecerían como diarias/extra salvo filtrar en cada pantalla | No se entera |
| Material y avisos | No son tareas: `Task` con `puntos=0` y `tipo=MATERIAL` es meter un tablón dentro de tareas | Encajan como `TipoDeber` |
| Límites | `nombre` 50 se queda corto para un título; no hay `hijoId` (las tareas son de familia) | Topes propios (título 120, detalle 500, enlace 500) e `hijoId` |
| Identidad | Índice único sobre un campo que el 95 % de tareas no tiene | Índice único natural sobre `clave` |
| Entrega 2 (bloques) | `bloques` dentro de `Task` afecta a todas las tareas | `bloques` solo en `Deber` |
| Coste | 0 rutas nuevas | ~150 líneas de CRUD repetido; el libro de movimientos (S5) tendrá que leer de dos colecciones |

**Contradice la spec en:** «Se crean con el `POST` que ya existe» → se crean con `POST /api/familias/{f}/hijos/{h}/deberes`. Coste si es incorrecto: migrar la colección `deberes` a `tasks` (un script, sin tocar la UI salvo el adaptador).

## Decisión 2 — técnica: una petición por deber, no un lote

El tope de cuerpo es 16 KB (`LimiteDeCuerpoFiltro.MAX_BYTES`). Un deber al máximo (60 + 120 + 500 + 500 + 500 caracteres de texto) con caracteres de 3 bytes en UTF-8 pesa ~5 KB: un lote cabría con **3 deberes**. Subir el tope a todo el backend para una ruta es debilitar CWE-770. Por eso:
- `nuevo` → `POST`, `cambió` → `PUT /{id}`; el índice único hace que un reintento o dos pestañas den **409**, nunca un duplicado.
- 4 peticiones en vuelo: 60 deberes ≈ 15 rondas. El fallo de uno no tumba el resto: la pantalla dice cuáles fallaron.
- El límite de peticiones solo vigila `/api/ia/**`: estas rutas no lo gastan.

## Otras decisiones tomadas al escribir el plan

- **Identidad = `clave`** guardada en el documento y calculada igual en los dos lados: `EXAMEN`/`ENTREGA`/`AVISO` → el enlace canónico; `MATERIAL` → `MATERIAL <enlace> <examen>` (un mismo vídeo puede servir a dos exámenes). El front produce la forma canónica (`claveDeEnlace`); el **back es la frontera**: rechaza un enlace de Classroom que no esté en forma canónica y calcula la `clave` él mismo (nunca llega del cuerpo).
- **Los archivados cuentan como conocidos**: la importación compara contra **todos** los deberes del hijo (`soloActivos=false`). Un archivado igual va a «Iguales»; si cambió, sale en «Cambiaron» marcado «Archivado» y el `PUT` **no lo desarchiva**. Nunca sale como 🆕 (si saliera, el `POST` daría 409 cada día).
- **«Ya no aparece» solo mira `EXAMEN` y `ENTREGA`** activos: material y avisos no son compromisos. En la receta, el material sin fecha entra en la ventana con la fecha de su examen.
- **Todo se puede archivar**: botón «Archivar» en cada fila; `EXAMEN`/`ENTREGA` tienen además «Confirmar hecho». En la entrega 1 los dos ponen `isActive=false`; se distinguen en la entrega 2 (bloques).
- **«Última importación»**: un documento por hijo (`_id = familyId/hijoId`; los ids de Firestore no llevan `/`), `PUT` idempotente. Se registra al guardar sin fallos y también con «Revisado, sin cambios»: revisar una pegada sin novedades es importar.
- **Un deber pertenece a un hijo** (`hijoId` en la ruta). El `hijoId` no se valida contra Firestore, igual que en `eleccionesTipo` (límite declarado). El `PUT` exige `requireMember` **y** que el `familyId` y `hijoId` guardados sean los de la ruta.
- **`DUDA` no se guarda**: se muestra para que el adulto lo mire en Classroom.
- **Puntos en la entrega 1 (✅ dueña, 20-nov, opción A): no hay puntos.** Ni campo `puntos` en `Deber`, ni en el cuerpo, ni en los tipos de TS, ni en la pantalla; nada suma a la puntuación semanal (Firestore, `usePointsManagement`). Esto reemplaza en esta entrega la frase de la demo «el adulto lo confirma y suma puntos».
- **El hijo no tiene sesión** hasta S6 y `/child-view` no puede llamar a la API: la vista de deberes vive en el panel del adulto.
- **TanStack Query** (§6 de la spec) no está instalado y la sesión 4 no lo usó: se sigue el patrón de `DescubrirTipo` (efecto + servicio). Fuera de esta entrega.
- **Entrega 2 (no se construye):** añadirá a `Deber` `bloques: List<Bloque(LocalDate planificado, Instant hechoEn, Instant confirmadoEn)>` (puntos = 5 × bloque), una función pura `planificar(deberes, hoy, topePorDia)` y confirmar por bloque. Los documentos de la entrega 1 se leen como «sin bloques»: **no hace falta migrarlos**.

---

## Global Constraints

- **TDD estricto**: el test primero, que falle **por una aserción**, nunca por módulo que falta ni por excepción: crear el fichero con la firma y un cuerpo **neutro** (`return false`, `return ''`, un resultado vacío; en Java `return null`, `List.of()`, `Optional.empty()`), luego lo mínimo, luego verde. Los tests **de guarda** (verdes desde el principio) se declaran como tales con su porqué.
- Verificación: `npx vitest run <fichero>`, `npm run lint`, `npm run typecheck` (`tsc -b`; `tsc --noEmit` es un no-op); backend `cd backend && ./mvnw --batch-mode test` (los `*IntegracionTest` necesitan **Docker**). **Nunca** `npm run build` sin preguntar.
- **Solo `src/services/` habla con la API** (`apiFetch` de `http.ts`); componentes y `src/utils/` no. Componentes de `src/components/ui/` **sin `className`**; color solo por tokens de 3 niveles. No debilitar `arquitectura.test.ts`, `contraste.test.ts`, `tokens.test.ts`, ni las reglas de Firestore.
- Textos de la app en español de **tú** («Pega aquí la lista», nunca «pegá»), con tildes.
- **Repo público**: ni datos reales del colegio, ni nombres de profesores, ni datos personales. Ejemplos y fixtures **ficticios**: fechas de **2027**, enlaces con `EJEMPLO`, hijo «Leo», familia `fA`.
- **El texto pegado es de fuera**: solo enlaces `https://`, se pinta como texto (nunca `dangerouslySetInnerHTML`), enlaces con `rel="noopener noreferrer"`. **Las mismas reglas de enlace en front y back** (el back es la frontera): sin usuario ni clave, sin `localhost` ni IPs, sin espacios, caracteres de control (`\u0000-\u001F`, `\u007F`) ni de dirección (`‪-‮`, `⁦-⁩`).
- Topes iguales en front y back: asignatura 60, título 120, detalle 500, enlace 500, texto pegado 200 000 caracteres, 300 líneas de datos.
- Backend: feature `deber/`, `Clock` inyectado (nada de `Instant.now()` sin reloj), errores por `ManejadorDeErrores` en `ProblemDetail`, JSON camelCase sin nulos, `familyId`/`hijoId`/`createdBy`/`clave` **de la ruta, del token o calculados, nunca del cuerpo**. Registrar `Deber` en `config/IndicesMongo` (lista explícita: si no, el índice único no existe en producción).
- **Antes de editar un fichero**: `git log --oneline -10 -- <ruta>`.
- **Un commit por tarea**, en español, con el porqué en el título, **sin Co-Authored-By ni atribución a IA**. Sin push.
- Tamaño estimado: ~2 800 líneas → **PRs encadenados**: PR A (Tasks 1–4, puro), PR B (Tasks 5–8, backend), PR C (Tasks 9–12, servicio y pantallas).

## Review Focus

1. **Finales de línea de Windows, BOM y espacios de más** → el parser se rompe o el diff marca ✏️ cambió algo idéntico. → Task 3 (`toleraCrlfBomYEspacios`) y Task 4 (`espaciosDistintosNoSonCambio`).
2. **Una pegada de 60 deberes contra el tope de 16 KB** → 413 a mitad de importación. → Task 6 (`unDeberAlMaximoCabeEnElTope`, guarda) y Task 9 (`sesentaDeberesSonSesentaPeticionesBajoElTope`).
3. **El mismo deber con `/u/1/`, con otra fecha o ya archivado** → sale como 🆕 y da 409 o se duplica. → Task 2 (`quitaLaCuentaDeLaRuta`), Task 3 (`enlacesSalenNormalizados`), Task 4 (`unDeberArchivadoNoVuelveComoNuevo`, `cambiaLaFechaSaleComoCambio`), Task 8 (`mismaClaveDosVecesDa409`).
4. **Deber sin fecha** → error de parseo, desaparece del orden o del aviso «ya no aparece». → Task 3 (`sinFechaEsValido`), Task 4 (`sinFechaCuentaParaYaNoAparece`), Task 11 (`sinFechaVaAlFinal`).
5. **`MATERIAL` que apunta a un examen ausente, o a dos exámenes** → se pierde, rompe o choca. → Task 3 (`materialConExamenAusenteAvisaYSeQueda`, `mismoMaterialParaDosExamenes`) y Task 11 (`materialSinExamenVaASuGrupo`). Variante: **pegada cortada sin `=== FIN ===`** → Task 4 (`listaCortadaNoAvisaDeDesaparecidos`).

---

### Task 1: la receta de Classroom

**Files:**
- Create: `docs/receta-classroom.md`
- Modify: `.gitignore` (+ `*.pegada.txt`: las pegadas reales que se guarden para probar a mano nunca se versionan)

**Interfaces:**
- Produces: un bloque ```` ```text ```` con la salida de ejemplo, entre `=== DEBERES v1 ===` y `=== FIN ===`, que Task 3 lee como fixture.

- [ ] **Escribir la receta** (es documentación: no hay test propio; Task 3 parsea su ejemplo y comprueba que **todo el fichero** solo lleva datos ficticios: ninguna fecha que no sea de 2027 y ningún enlace sin `EJEMPLO`, también fuera del ejemplo). Secciones:
  1. **Para qué** y cuándo: todos los días, desde Chrome con la sesión que ve las clases de Leo. Guardar la pegada real, si hace falta, como `algo.pegada.txt` (ignorado por git).
  2. **El prompt exacto** para Claude in Chrome, que dice:
     - Solo lectura. **Nunca** pulses «Entregar», «Marcar como completada», «Continuar», «Aceptar», ni escribas comentarios. Si una página lo pide, para y escribe una `DUDA`.
     - Recorre **cada clase** (Tablón y Trabajo de clase). Ventana: **desde hace 7 días y todo lo futuro**, más lo **atrasado** y lo **sin fecha**. El material sin fecha entra si su examen entra.
     - Saca cuatro bloques: `EXAMEN` (qué entra: temas, páginas y la **frase literal** del profesor entre comillas), `ENTREGA` (estado y si hay que imprimir), `MATERIAL` (archivos, vídeos y enlaces por tema, con el enlace del examen al que sirve), `AVISO` (del tablón, que no son tareas).
     - Cada línea lleva **el enlace propio** del elemento en Classroom, nunca la portada.
     - Lo que no esté claro, como `DUDA`, **nunca inventado**. Sin nombres de profesores.
     - No uses `|` dentro de un campo (cámbialo por `/`). Una línea por elemento.
     - Termina con una línea `COBERTURA` por asignatura, aunque sea con ceros.
  3. **La gramática** (copiar tal cual):

     | Línea | Columnas (separadas por `\|`) |
     |---|---|
     | Cabecera | `=== DEBERES v1 ===` (lo anterior se ignora) |
     | Comentario | empieza por `#` |
     | Elemento (9) | `TIPO \| ASIGNATURA \| FECHA \| TÍTULO \| ENLACE \| DETALLE \| ESTADO \| IMPRIMIR \| EXAMEN` |
     | Cobertura (7) | `COBERTURA \| ASIGNATURA \| exámenes \| entregas \| material \| avisos \| dudas` (enteros) |
     | Fin | `=== FIN ===` (lo posterior se ignora) |

     - `TIPO`: `EXAMEN`, `ENTREGA`, `MATERIAL`, `AVISO`, `DUDA`.
     - `FECHA`: `aaaa-mm-dd` o vacía (sin fecha). Examen = día del examen; entrega = fecha límite; aviso = día publicado.
     - `ENLACE`: obligatorio y seguro salvo en `DUDA`. `EXAMEN`/`ENTREGA`/`AVISO` = la ficha de Classroom; `MATERIAL` = el archivo o vídeo.
     - `ESTADO` (solo `ENTREGA`): `PENDIENTE`, `ENTREGADA` o `ATRASADA`. `IMPRIMIR` (solo `ENTREGA`): `SI` o `NO`.
     - `EXAMEN` (solo `MATERIAL`): el `ENLACE` del examen al que sirve, o vacío.
     - Columnas que no tocan a ese tipo, vacías.
  4. **Ejemplo** (ficticio, el que lee Task 3):

```text
=== DEBERES v1 ===
# TIPO | ASIGNATURA | FECHA | TÍTULO | ENLACE | DETALLE | ESTADO | IMPRIMIR | EXAMEN
EXAMEN | Matemáticas | 2027-03-15 | Examen del tema 4 | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details | Tema 4, páginas 60-75. "Entra todo lo de fracciones" | | |
ENTREGA | Lengua | 2027-03-10 | Redacción sobre el invierno | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | 200 palabras | PENDIENTE | SI |
MATERIAL | Matemáticas | | Vídeo de fracciones | https://www.youtube.com/watch?v=EJEMPLO5 | Repaso del tema 4 | | | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details
AVISO | Ciencias | 2027-03-08 | Traer bata al laboratorio | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | El jueves hay práctica | | |
DUDA | Inglés | | | | Habla de un examen "la semana que viene" sin fecha | | |
COBERTURA | Matemáticas | 1 | 0 | 1 | 0 | 0
COBERTURA | Lengua | 0 | 1 | 0 | 0 | 0
COBERTURA | Ciencias | 0 | 0 | 0 | 1 | 0
COBERTURA | Inglés | 0 | 0 | 0 | 0 | 1
=== FIN ===
```

  5. **Versiones**: si cambia el formato, se sube a `v2` y la app sigue leyendo `v1` mientras haga falta.
- [ ] Commit: `docs: la receta de Classroom fija el formato DEBERES v1 con ejemplos ficticios, porque la app solo puede importar lo que Chrome escriba siempre igual`

---

### Task 2: enlaces seguros y su clave

**Files:**
- Create: `src/types/deberTypes.ts`, `src/utils/deberes/enlaces.ts`
- Test: `src/__tests__/deberesEnlaces.test.ts`

**Interfaces:**
- Produces (`deberTypes.ts`):
  ```ts
  export type TipoDeber = 'EXAMEN' | 'ENTREGA' | 'MATERIAL' | 'AVISO';
  export type EstadoEntrega = 'PENDIENTE' | 'ENTREGADA' | 'ATRASADA';
  export const TOPES = { asignatura: 60, titulo: 120, detalle: 500, enlace: 500, texto: 200_000, lineas: 300 } as const;
  ```
- Produces (`enlaces.ts`):
  ```ts
  export function esEnlaceSeguro(texto: string): boolean;
  export function claveDeEnlace(enlace: string): string;   // forma canónica; asume esEnlaceSeguro
  export function esPortadaDeClassroom(enlace: string): boolean;
  export function claveDeDeber(d: { tipo: TipoDeber; enlace: string; examen?: string | null }): string;
  ```

- [ ] **Test que falla:**
  ```ts
  it('soloHttps', () => {
    expect(esEnlaceSeguro('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details')).toBe(true);
    for (const malo of MALOS) expect(esEnlaceSeguro(malo)).toBe(false);
    // MALOS (la misma lista copia Task 6 en Java): 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'http://classroom.google.com/c/EJEMPLO1',
    // 'data:text/html,hola', 'https://usuario:clave@ejemplo.com/', 'https://exa mple.com/', 'https://localhost/', 'https://127.0.0.1/',
    // 'https://[::1]/', '//ejemplo.com/x', 'https://ejemplo.com/‮exe', 'https://ejemplo.com/\u0007', 'https://ejemplo.com/' + 'a'.repeat(500)
  });
  it('quitaLaCuentaDeLaRuta', () => {
    const a = 'https://classroom.google.com/u/0/c/EJEMPLO1/a/EJEMPLO2/details';
    const b = 'https://Classroom.Google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details/?authuser=1#x';
    expect(claveDeEnlace(a)).toBe('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details');
    expect(claveDeEnlace(b)).toBe(claveDeEnlace(a));
  });
  it('noTocaElQueryDeOtrosSitios', () => {
    expect(claveDeEnlace('https://www.youtube.com/watch?v=EJEMPLO5')).toBe('https://www.youtube.com/watch?v=EJEMPLO5');
  });
  it('laPortadaNoEsUnEnlace', () => {
    expect(esPortadaDeClassroom('https://classroom.google.com/')).toBe(true);
    expect(esPortadaDeClassroom('https://classroom.google.com/u/2/h')).toBe(true);
    expect(esPortadaDeClassroom('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details')).toBe(false);
  });
  it('laClaveDelMaterialLlevaSuExamen', () => {
    expect(claveDeDeber({ tipo: 'EXAMEN', enlace: E1 })).toBe(E1);
    expect(claveDeDeber({ tipo: 'MATERIAL', enlace: VIDEO, examen: E1 })).toBe(CLAVE_MATERIAL); // literal compartido con Task 5
  });
  ```
  (`E1` = el examen del ejemplo, `VIDEO` = `https://www.youtube.com/watch?v=EJEMPLO5`, `CLAVE_MATERIAL` = `` `MATERIAL ${VIDEO} ${E1}` `` escrito como literal.)
- [ ] `npx vitest run src/__tests__/deberesEnlaces.test.ts` → FAIL por aserción (stubs: `false`, `''`).
- [ ] Implementar en `src/utils/deberes/enlaces.ts`: `new URL` dentro de `try`; `https:`, sin usuario ni clave, host con punto que no sea IP (ni IPv4 ni `[…]`) ni `localhost`, sin espacios, control ni dirección, ≤ 500. La forma canónica: host en minúsculas, sin `#`; solo en `classroom.google.com`, quitar `/u/<n>`, el parámetro `authuser` y la `/` final. `claveDeDeber`: el enlace, y en `MATERIAL` `MATERIAL <enlace> <examen o vacío>` (los enlaces no llevan espacios: el separador no es ambiguo).
- [ ] Mismo comando → PASS.
- [ ] Commit: `feat(deberes): solo se aceptan enlaces https seguros y el de Classroom se normaliza, porque el texto pegado es de fuera y /u/0 y /u/1 son el mismo deber`

---

### Task 3: el parser del formato v1

**Files:**
- Modify: `src/types/deberTypes.ts`
- Create: `src/utils/deberes/formato.ts`
- Test: `src/__tests__/deberesFormato.test.ts`

**Interfaces:**
- Consumes: `esEnlaceSeguro`, `claveDeEnlace`, `esPortadaDeClassroom`, `claveDeDeber`, `TOPES`.
- Produces (`deberTypes.ts`):
  ```ts
  export interface ItemImportado {   // enlace y examen ya en forma canónica
    linea: number; tipo: TipoDeber; asignatura: string; fecha: string | null; titulo: string;
    enlace: string; detalle: string; estado: EstadoEntrega | null; imprimir: boolean; examen: string | null;
  }
  export interface Duda { linea: number; asignatura: string; titulo: string; detalle: string; enlace: string | null }
  export interface Cobertura { asignatura: string; examenes: number; entregas: number; material: number; avisos: number; dudas: number }
  export interface ErrorDeLinea { linea: number; motivo: string; texto: string } // texto: la línea cruda, 80 caracteres
  export interface ResultadoImportacion {
    items: ItemImportado[]; dudas: Duda[]; cobertura: Cobertura[];
    errores: ErrorDeLinea[]; avisos: string[]; completa: boolean;
  }
  ```
- Produces (`formato.ts`): `export function parsearDeberes(texto: string): ResultadoImportacion;`

Reglas (lo que fijan los tests): quitar BOM, `\r\n`/`\r` → `\n`; ignorar todo antes de la cabecera y después de `=== FIN ===`, las líneas vacías y las de `#`; cada campo con `trim` y espacios internos colapsados a uno; `TIPO` sin distinguir mayúsculas; un campo con caracteres de control o de dirección, o por encima de su tope, es **error de la línea**, nunca se recorta; `enlace` y `examen` salen por `claveDeEnlace`; los repetidos se detectan por `claveDeDeber`; `linea` = número de línea en el texto pegado (1-based); errores globales con `linea: 0` y sin items.

- [ ] **Tests que fallan** (`RECETA` = `docs/receta-classroom.md` entero, leído con `readFileSync(join(__dirname, '../../docs/receta-classroom.md'), 'utf8')`; `EJEMPLO` = su bloque cortado entre la cabecera y `=== FIN ===` incluidos):
  ```ts
  it('elEjemploDeLaRecetaSeLeeEntero', () => {
    const r = parsearDeberes(EJEMPLO);
    expect(r.errores).toEqual([]); expect(r.avisos).toEqual([]); expect(r.completa).toBe(true);
    expect(r.items.map((i) => i.tipo)).toEqual(['EXAMEN', 'ENTREGA', 'MATERIAL', 'AVISO']);
    expect(r.items[1]).toMatchObject({ asignatura: 'Lengua', fecha: '2027-03-10', estado: 'PENDIENTE', imprimir: true, examen: null });
    expect(r.items[2].examen).toBe('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details');
    expect(r.dudas).toHaveLength(1); expect(r.cobertura).toHaveLength(4);
  });
  it('laRecetaSoloLlevaDatosFicticios', () => {   // todo el fichero, no solo el ejemplo
    expect((RECETA.match(/\d{4}-\d{2}-\d{2}/g) ?? []).every((f) => f.startsWith('2027-'))).toBe(true);
    expect((RECETA.match(/https?:\/\/[^\s`|)]+/g) ?? []).every((u) => u.includes('EJEMPLO'))).toBe(true);
  });
  it('enlacesSalenNormalizados', () => {
    const r = parsearDeberes(envuelve('MATERIAL | Matemáticas | | Ficha | https://classroom.google.com/u/1/c/EJEMPLO1/m/EJEMPLO11/details?authuser=1 | | | | https://classroom.google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details'));
    expect(r.items[0].enlace).toBe('https://classroom.google.com/c/EJEMPLO1/m/EJEMPLO11/details');
    expect(r.items[0].examen).toBe('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details');
  });
  it('toleraCrlfBomYEspacios', () => {
    const r = parsearDeberes('﻿=== DEBERES v1 ===\r\n  EXAMEN |  Matemáticas  | 2027-03-15 | Examen   del tema 4 | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details | | | |\r\n=== FIN ===\r\n');
    expect(r.errores).toEqual([]);
    expect(r.items[0]).toMatchObject({ asignatura: 'Matemáticas', titulo: 'Examen del tema 4', linea: 2 });
  });
  it('sinFechaEsValido', () => {
    const r = parsearDeberes(envuelve('ENTREGA | Lengua | | Lectura | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO8/details | | PENDIENTE | NO |'));
    expect(r.items[0].fecha).toBeNull(); expect(r.errores).toEqual([]);
  });
  it('unaLineaMalaNoTumbaElResto', () => {
    const r = parsearDeberes(envuelve(
      'EXAMEN | Matemáticas | 2027-02-30 | Mal | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO9/details | | | |',
      'AVISO | Ciencias | | Bata | javascript:alert(1) | | | |',
      'ENTREGA | Lengua | 2027-03-10 | Corta | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | | PENDIENTE | SI',
      'EXAMEN | Historia | 2027-03-20 | Portada | https://classroom.google.com/ | | | |',
      'ENTREGA | Lengua | 2027-03-10 | Bien | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | | PENDIENTE | NO |'));
    expect(r.errores.map((e) => [e.linea, e.motivo])).toEqual([
      [2, 'La fecha 2027-02-30 no existe'],
      [3, 'El enlace no es https:// seguro'],
      [4, 'Tiene 8 columnas y deben ser 9 (¿hay un | dentro de un texto?)'],
      [5, 'El enlace es la portada de Classroom: falta el del deber'],
    ]);
    expect(r.items.map((i) => i.titulo)).toEqual(['Bien']);
  });
  it('topesComoElServidor', () => {
    const r = parsearDeberes(envuelve(`AVISO | Ciencias | | ${'x'.repeat(121)} | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |`));
    expect(r.errores[0].motivo).toBe('El título pasa de 120 caracteres');
  });
  it('enlaceRepetidoEnLaMismaPegada', () => {
    const l = 'AVISO | Ciencias | | Bata | https://classroom.google.com/u/0/c/EJEMPLO6/p/EJEMPLO7 | | | |';
    const r = parsearDeberes(envuelve(l, l.replace('/u/0', '/u/1')));
    expect(r.errores).toEqual([{ linea: 3, motivo: 'Repite el deber de la línea 2', texto: expect.any(String) }]);
  });
  it('mismoMaterialParaDosExamenes', () => {
    const r = parsearDeberes(envuelve(EXAMEN_E1, EXAMEN_E2, MATERIAL_VIDEO_DE(E1), MATERIAL_VIDEO_DE(E2)));
    expect(r.errores).toEqual([]); expect(r.items.filter((i) => i.tipo === 'MATERIAL')).toHaveLength(2);
  });
  it('materialConExamenAusenteAvisaYSeQueda', () => {
    const r = parsearDeberes(envuelve('MATERIAL | Matemáticas | | Ficha | https://drive.google.com/file/d/EJEMPLO10/view | | | | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO99/details'));
    expect(r.items).toHaveLength(1);
    expect(r.avisos).toContain('Línea 2: el examen de este material no está en la lista');
  });
  it('coberturaQueNoCuadra', () => {
    const r = parsearDeberes(envuelve('AVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |',
      'COBERTURA | Ciencias | 0 | 0 | 0 | 2 | 0'));
    expect(r.avisos).toEqual(['Ciencias: la cobertura dice 2 avisos y llegaron 1']);
    expect(parsearDeberes(envuelve('AVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |')).avisos)
      .toEqual(['Falta la línea de cobertura de Ciencias']);
  });
  it('cabeceraFinYVersion', () => {
    expect(parsearDeberes('hola').errores).toEqual([{ linea: 0, motivo: 'No encuentro la línea === DEBERES v1 ===', texto: '' }]);
    expect(parsearDeberes('=== DEBERES v2 ===\n=== FIN ===').errores[0].motivo).toBe('Esta app lee la versión v1 y la lista es v2');
    const cortada = parsearDeberes('=== DEBERES v1 ===\nAVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |');
    expect(cortada.completa).toBe(false); expect(cortada.items).toHaveLength(1);
    expect(cortada.avisos).toContain('La lista está cortada: falta === FIN ===');
  });
  it('demasiadoLargo', () => {
    expect(parsearDeberes('x'.repeat(200_001)).errores[0].motivo).toBe('La lista pasa de 200000 caracteres');
  });
  it('demasiadasLineas', () => {
    const r = parsearDeberes(envuelve(...Array.from({ length: 301 }, (_, n) => avisoConEnlace(`EJEMPLO${n}`))));
    expect(r.errores).toEqual([{ linea: 0, motivo: 'La lista pasa de 300 líneas de datos', texto: '' }]); expect(r.items).toEqual([]);
  });
  ```
  (`envuelve(...lineas)` = `['=== DEBERES v1 ===', ...lineas, '=== FIN ==='].join('\n')`; con él la primera línea de datos es la 2. `EXAMEN_E1`, `EXAMEN_E2`, `MATERIAL_VIDEO_DE(e)`, `avisoConEnlace(id)` son fábricas de líneas del test. El aviso «Falta la línea de cobertura» solo se espera en el test que lo nombra: en los demás se comprueba con `toContain`, no con `toEqual`.)
- [ ] `npx vitest run src/__tests__/deberesFormato.test.ts` → FAIL por aserción (stub: resultado vacío con `completa: false`).
- [ ] Implementar `parsearDeberes` en `src/utils/deberes/formato.ts`: un recorrido de líneas con un `switch` por `TIPO`; las validaciones de campo en funciones pequeñas que devuelven `string | null` (el motivo); al final, dos pasadas cruzadas (material → examen por clave canónica, cobertura → conteo por asignatura y tipo de los items válidos).
- [ ] Mismo comando → PASS. `npm run lint && npm run typecheck` → 0.
- [ ] Commit: `feat(deberes): el parser del formato v1 separa errores por línea sin tirar el resto, porque una línea rara de Chrome no puede costar la importación entera`

---

### Task 4: comparar la pegada con lo guardado

**Files:**
- Modify: `src/types/deberTypes.ts`
- Create: `src/utils/deberes/comparar.ts`
- Test: `src/__tests__/deberesComparar.test.ts`

**Interfaces:**
- Produces (`deberTypes.ts`) — la forma que devuelve la API (Task 6):
  ```ts
  export interface Deber {
    id: string; familyId: string; hijoId: string; tipo: TipoDeber; asignatura: string; fecha?: string;
    titulo: string; enlace: string; clave: string; detalle?: string; estado?: EstadoEntrega; imprimir: boolean;
    examen?: string; isActive: boolean; createdBy?: string; createdAt?: string; updatedAt?: string;
  }
  export type CampoComparado = 'asignatura' | 'fecha' | 'titulo' | 'detalle' | 'estado' | 'imprimir';
  export interface Cambio { campo: CampoComparado; antes: string; despues: string }
  export interface Comparacion {
    nuevos: ItemImportado[];
    cambiados: { item: ItemImportado; guardado: Deber; cambios: Cambio[] }[];   // guardado.isActive=false → «Archivado»
    iguales: ItemImportado[];
    yaNoAparecen: Deber[];
  }
  ```
- Produces (`comparar.ts`):
  ```ts
  export function compararConGuardados(items: ItemImportado[], guardados: Deber[], opciones: { completa: boolean; hoy: string }): Comparacion;
  export function necesitaImportar(ultima: string | undefined, ahora: Date): boolean;
  export function hoyEnMadrid(ahora?: Date): string;   // 'aaaa-mm-dd' en Europe/Madrid, no en UTC
  ```
  `guardados` son **todos** los del hijo, archivados incluidos. Se cruzan por `claveDeDeber(item)` contra `guardado.clave`. Los textos se comparan normalizados en **los dos lados** (`trim` + espacios colapsados). Los valores en `Cambio` van como texto: `null`/`undefined` → `''`, booleano → `'sí'`/`'no'`. `isActive` no se compara (lo pone el adulto). `examen` no se compara: en `MATERIAL` es parte de la clave.

- [ ] **Tests que fallan** (fábricas `item(over)` y `guardado(over)` con el examen de Matemáticas del ejemplo, `hoy = '2027-03-09'`):
  ```ts
  it('clasificaNuevoIgualYCambio', () => {
    const r = compararConGuardados([item(), item({ enlace: OTRO }), item({ enlace: E3, titulo: 'Nuevo título' })],
      [guardado(), guardado({ id: 'g3', enlace: E3, clave: E3 })], { completa: true, hoy });
    expect(r.nuevos.map((i) => i.enlace)).toEqual([OTRO]); expect(r.iguales).toHaveLength(1);
    expect(r.cambiados.map((c) => [c.guardado.id, c.cambios[0].campo])).toEqual([['g3', 'titulo']]);
  });
  it('cambiaLaFechaSaleComoCambio', () => {
    const r = compararConGuardados([item({ fecha: '2027-03-17' })], [guardado({ fecha: '2027-03-15' })], { completa: true, hoy });
    expect(r.cambiados[0].cambios).toEqual([{ campo: 'fecha', antes: '2027-03-15', despues: '2027-03-17' }]);
  });
  it('espaciosDistintosNoSonCambio', () => {
    // un guardado antiguo o editado a mano con espacios de más; comparar normaliza los dos lados
    expect(compararConGuardados([item({ titulo: 'Examen del tema 4' })], [guardado({ titulo: '  Examen   del tema 4 ' })], { completa: true, hoy }).iguales).toHaveLength(1);
  });
  it('quitarLaFechaEsUnCambio', () => {
    expect(compararConGuardados([item({ fecha: null })], [guardado({ fecha: '2027-03-15' })], { completa: true, hoy })
      .cambiados[0].cambios).toEqual([{ campo: 'fecha', antes: '2027-03-15', despues: '' }]);
  });
  it('unDeberArchivadoNoVuelveComoNuevo', () => {
    const igual = compararConGuardados([item()], [guardado({ isActive: false })], { completa: true, hoy });
    expect(igual.nuevos).toEqual([]); expect(igual.iguales).toHaveLength(1);
    const cambio = compararConGuardados([item({ fecha: '2027-03-17' })], [guardado({ isActive: false })], { completa: true, hoy });
    expect(cambio.nuevos).toEqual([]); expect(cambio.cambiados[0].guardado.isActive).toBe(false);
  });
  it('yaNoApareceSoloEnLaVentanaYActivos', () => {
    const r = compararConGuardados([], [
      guardado({ id: 'g1', fecha: '2027-03-02' }),                     // hoy-7: dentro
      guardado({ id: 'g2', fecha: '2027-03-01', clave: E2 }),          // hoy-8: fuera, la receta ya no lo mira
      guardado({ id: 'g3', isActive: false, clave: E3 }),              // archivado: no avisa
      guardado({ id: 'g5', tipo: 'MATERIAL', clave: CLAVE_MATERIAL }), // material: nunca avisa
      guardado({ id: 'g6', tipo: 'AVISO', clave: E6 }),                // aviso: nunca avisa
    ], { completa: true, hoy });
    expect(r.yaNoAparecen.map((d) => d.id)).toEqual(['g1']);
  });
  it('sinFechaCuentaParaYaNoAparece', () => {
    expect(compararConGuardados([], [guardado({ id: 'g4', fecha: undefined })], { completa: true, hoy }).yaNoAparecen).toHaveLength(1);
  });
  it('listaCortadaNoAvisaDeDesaparecidos', () => {
    expect(compararConGuardados([], [guardado()], { completa: false, hoy }).yaNoAparecen).toEqual([]);
  });
  it('necesitaImportar', () => {
    const ahora = new Date('2027-03-09T20:00:00Z');
    expect(necesitaImportar(undefined, ahora)).toBe(true);
    expect(necesitaImportar('2027-03-08T21:00:00Z', ahora)).toBe(false);  // 23 h
    expect(necesitaImportar('2027-03-08T19:59:00Z', ahora)).toBe(true);   // > 24 h
  });
  it('hoyEsLaFechaDeMadrid', () => {
    expect(hoyEnMadrid(new Date('2027-03-08T23:30:00Z'))).toBe('2027-03-09');  // 00:30 en Madrid (CET)
    expect(hoyEnMadrid(new Date('2027-07-01T22:30:00Z'))).toBe('2027-07-02');  // 00:30 en Madrid (CEST)
  });
  ```
- [ ] `npx vitest run src/__tests__/deberesComparar.test.ts` → FAIL por aserción (stubs: comparación vacía, `false`, `''`).
- [ ] Implementar en `src/utils/deberes/comparar.ts`: un `Map` por `clave` de los guardados; la ventana es `fecha >= hoy - 7 días` en ISO (comparación de cadenas) o sin fecha, solo para `EXAMEN`/`ENTREGA` activos; `hoyEnMadrid` con `toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })`.
- [ ] Mismo comando → PASS; lint y typecheck → 0.
- [ ] Commit: `feat(deberes): la importación compara por clave contra todo lo guardado y avisa de lo que desaparece sin borrarlo, porque importar cada día no puede duplicar ni resucitar deberes`

---

### Task 5: dominio y servicio `deber/` (backend)

**Files:**
- Create en `backend/src/main/java/es/cookyourweb/points/deber/`: `TipoDeber.java`, `EstadoEntrega.java`, `Deber.java`, `DeberCuerpo.java`, `DeberRepository.java`, `DeberService.java`, `DeberNoEncontradoException.java`, `DeberDuplicadoException.java`, `Importacion.java`, `ImportacionRepository.java`
- Test: `backend/src/test/java/es/cookyourweb/points/deber/DeberServiceTest.java`

**Interfaces:**
- Produces:
  ```java
  public enum TipoDeber { EXAMEN, ENTREGA, MATERIAL, AVISO }
  public enum EstadoEntrega { PENDIENTE, ENTREGADA, ATRASADA }
  @Document("deberes") @CompoundIndex(def = "{'familyId': 1, 'hijoId': 1, 'clave': 1}", unique = true)
  public record Deber(@Id String id, String familyId, String hijoId, String createdBy, TipoDeber tipo,
      String asignatura, LocalDate fecha, String titulo, String enlace, String clave, String detalle,
      EstadoEntrega estado, boolean imprimir, String examen, boolean isActive,
      Instant createdAt, Instant updatedAt) {
    static String claveDe(TipoDeber tipo, String enlace, String examen); // igual que claveDeDeber del front
  }
  public record DeberCuerpo(TipoDeber tipo, String asignatura, LocalDate fecha, String titulo, String enlace,
      String detalle, EstadoEntrega estado, boolean imprimir, String examen, boolean isActive) {}  // validaciones: Task 6
  @Document("importaciones")   // un documento por hijo: id = familyId + "/" + hijoId
  public record Importacion(@Id String id, String familyId, String hijoId, String uid, Instant en) {}
  public interface DeberRepository extends MongoRepository<Deber, String> {
    List<Deber> findByFamilyIdAndHijoId(String familyId, String hijoId);
    List<Deber> findByFamilyIdAndHijoIdAndIsActiveTrue(String familyId, String hijoId);
  }
  public interface ImportacionRepository extends MongoRepository<Importacion, String> {}
  // DeberService(DeberRepository, ImportacionRepository, AccesoFamilia, Clock)
  public List<Deber> deHijo(String uid, String familyId, String hijoId, boolean soloActivos);
  public Deber crear(String uid, String familyId, String hijoId, DeberCuerpo cuerpo);
  public Deber actualizar(String uid, String familyId, String hijoId, String id, DeberCuerpo cuerpo);
  public Importacion registrarImportacion(String uid, String familyId, String hijoId);
  public Optional<Importacion> ultimaImportacion(String uid, String familyId, String hijoId);
  ```

- [ ] **Tests que fallan** (Mockito para los repos y `AccesoFamilia`; `Clock.fixed(Instant.parse("2027-03-09T10:00:00Z"), UTC)`):
  - `crearPoneFamiliaHijoCreadorClaveYFechasDeLaRutaYElToken`: `crear("ana","fA","leo",cuerpo)` guarda un `Deber` con `familyId="fA"`, `hijoId="leo"`, `createdBy="ana"`, `clave=E1`, `createdAt=updatedAt=2027-03-09T10:00:00Z`, `id=null`.
  - `laClaveDelMaterialEsLaDelFront`: cuerpo `MATERIAL` con enlace del vídeo y `examen E1` → `clave` = el mismo literal `CLAVE_MATERIAL` que Task 2.
  - `crearEnFamiliaAjenaNoGuarda`: `requireMember` lanza `FamiliaNoEncontradaException` → `verify(repo, never()).save(any())`.
  - `claveRepetidaEs409`: `repo.save` lanza `DuplicateKeyException` → `DeberDuplicadoException`.
  - `actualizarConservaIdentidad`: original `{id "d1", fA, leo, createdBy "ana", enlace E1, clave E1, examen null, createdAt T0}`; cuerpo con `enlace E2`, `titulo "Nuevo"` → guarda `id "d1"`, `enlace E1`, `clave E1`, `createdBy "ana"`, `createdAt T0`, `titulo "Nuevo"`, `updatedAt 2027-03-09T10:00:00Z`. En `MATERIAL` también se conserva `examen` (es parte de la clave).
  - `actualizarConOtraFamiliaUOtroHijoEnLaRutaEs404`: `requireMember("ana","fC")` pasa (es miembro de las dos) pero el guardado es de `fA` → `DeberNoEncontradoException`; igual con `hijoId "mia"` en la ruta y `leo` guardado. Nunca `save`.
  - `registrarImportacionEsUnoPorHijo`: guarda `Importacion("fA/leo","fA","leo","ana",2027-03-09T10:00:00Z)`; `ultimaImportacion` hace `findById("fA/leo")` tras `requireMember`.
- [ ] `cd backend && ./mvnw --batch-mode test -Dtest=DeberServiceTest` → FAIL por aserción (stubs: `return null`, `List.of()`, `Optional.empty()`).
- [ ] Implementar `DeberService` en el espejo de `TaskService`: `requireMember(uid, familyId de la ruta)` antes de leer o guardar; por id = `findById` + `familyId` y `hijoId` guardados **iguales a los de la ruta**, si no 404. `crear` calcula la `clave` con `Deber.claveDe`.
- [ ] Mismo comando → PASS.
- [ ] Commit: `feat(deberes): los deberes viven en su propia coleccion por hijo y familia con una clave calculada en el servidor, porque Task.java es intocable y el material y los avisos no son tareas`

---

### Task 6: rutas HTTP y topes de entrada

**Files:**
- Create: `backend/src/main/java/es/cookyourweb/points/deber/DeberController.java`, `backend/.../deber/EnlaceSeguro.java` (anotación), `backend/.../deber/EnlaceSeguroValidator.java`
- Modify: `backend/.../deber/DeberCuerpo.java` (anotaciones), `backend/.../web/ManejadorDeErrores.java` (404 y 409)
- Test: `backend/src/test/java/es/cookyourweb/points/deber/DeberControllerTest.java` (`@WebMvcTest`, mismo montaje que `EleccionTipoControllerTest`), `backend/src/test/java/es/cookyourweb/points/deber/EnlaceSeguroValidatorTest.java`

**Interfaces:**
- Produces (base `/api/familias/{familyId}/hijos/{hijoId}`):

  | Método | Ruta | Respuesta |
  |---|---|---|
  | `GET` | `/deberes?soloActivos=` | `200 List<Deber>` |
  | `POST` | `/deberes` | `201 Deber` · `409` clave repetida |
  | `PUT` | `/deberes/{id}` | `200 Deber` · `404` |
  | `PUT` | `/importaciones-deberes` (sin cuerpo) | `200 {en}` |
  | `GET` | `/importaciones-deberes` | `200 {en?}` (sin `en` si nunca se importó) |

- `DeberCuerpo`: `@NotNull tipo`; `@NotBlank @Size(max=60) asignatura`; `@NotBlank @Size(max=120) titulo`; `@NotBlank @Size(max=500) @EnlaceSeguro enlace`; `@Size(max=500) detalle`; `@Size(max=500) @EnlaceSeguro examen` (nulo vale); `asignatura`, `titulo` y `detalle` con `@Pattern` que excluye control y dirección.
- `EnlaceSeguroValidator`: las mismas reglas que `esEnlaceSeguro` (Task 2) con `java.net.URI`, y además, si el host es `classroom.google.com`, **solo la forma canónica** (host en minúsculas, sin `/u/<n>`, sin `authuser`, sin `#`, sin `/` final). El back no normaliza: comprueba.
- `ManejadorDeErrores`: `DeberNoEncontradoException` → 404 `title "Deber no encontrado"`; `DeberDuplicadoException` → 409 `title "Deber repetido"`, `detail "ya hay un deber con esa clave"`.

- [ ] **Tests que fallan:**
  - `EnlaceSeguroValidatorTest.rechazaLoMismoQueElFront`: la lista `MALOS` de Task 2, copiada → todos inválidos; el enlace bueno → válido.
  - `EnlaceSeguroValidatorTest.classroomSoloEnFormaCanonica`: `…/u/1/c/EJEMPLO1/a/EJEMPLO2/details`, `…?authuser=1`, `…/details/` y `…#x` → inválidos; la forma canónica → válida; `https://www.youtube.com/watch?v=EJEMPLO5` → válido.
  - `crearDevuelve201YUsaLaRuta`: `POST /api/familias/fA/hijos/leo/deberes` con `familyId:"fB"` y `clave:"x"` en el cuerpo → `service.crear("ana","fA","leo",…)`; `201`.
  - `enlaceJavascriptEs400`: `"enlace":"javascript:alert(1)"` → `400`, `$.campos.enlace` existe.
  - `topes`: `titulo` de 121 → `400 $.campos.titulo`; `asignatura` de 61 → `$.campos.asignatura`; `titulo` con `‮` → `$.campos.titulo`; `tipo:"DEBER"` → `400`.
  - `duplicadoEs409`: el servicio lanza `DeberDuplicadoException` → `409`, `$.title == "Deber repetido"`.
  - `ultimaSinImportacionesNoTraeEn`: servicio devuelve `Optional.empty()` → `GET /importaciones-deberes` `200`, cuerpo `{}`.
  - `unDeberAlMaximoCabeEnElTope` — **test de guarda, verde desde el principio** (el record existe desde Task 5 y hoy cabe): serializar con el `tools.jackson.databind.json.JsonMapper` de la app (`@Autowired`, el que configura Spring Boot 4 con Jackson 3) un `DeberCuerpo` con todos los textos al máximo hechos de `"€"` (3 bytes) → `bytes.length < LimiteDeCuerpoFiltro.MAX_BYTES` (hoy ~5 KB). Su rojo llega si alguien sube los topes y deja de caber: falla aquí y no en producción.
- [ ] `./mvnw --batch-mode test -Dtest='DeberControllerTest,EnlaceSeguroValidatorTest'` → FAIL por aserción, salvo la guarda (stubs: controller que devuelve `null`/`200` vacío, validador que devuelve `true`).
- [ ] Implementar el controller como `EleccionTipoController` (uid de `jwt.getSubject()`, `@Valid @RequestBody`) y el validador.
- [ ] Mismo comando → PASS; `./mvnw --batch-mode test -Dtest='ErroresSinFugaTest,LimitesDeEntradaTest'` → PASS (no se debilita nada).
- [ ] Commit: `feat(deberes): las rutas de deberes validan los enlaces y los topes igual que el parser, porque el navegador no es frontera`

---

### Task 7: índices en arranque

**Files:**
- Modify: `backend/src/main/java/es/cookyourweb/points/config/IndicesMongo.java`
- Test: `backend/src/test/java/es/cookyourweb/points/config/IndicesMongoTest.java`

- [ ] **Test que falla** — `creaElIndiceDeDeberes`: con el mismo doble que usa el test existente, `crear()` pide `indexOps(Deber.class)` (`verify(mongo).indexOps(Deber.class)`). `Importacion` no necesita índice: su `_id` ya es por hijo.
- [ ] `./mvnw --batch-mode test -Dtest=IndicesMongoTest` → FAIL.
- [ ] Añadir `Deber.class` a la lista de `crear()` (y al Javadoc).
- [ ] Mismo comando → PASS.
- [ ] Commit: `fix(deberes): el indice unico de deberes se crea al arrancar, porque sin el dos pestañas importando a la vez duplicarian deberes`

---

### Task 8: aislamiento entre familias (integración)

**Files:**
- Create: `backend/src/test/java/es/cookyourweb/points/deber/DeberIntegracionTest.java` (montaje copiado de `PropiedadIntegracionTest`: Testcontainers `mongo:7`, `RANDOM_PORT`, el Bearer es el uid)

- [ ] **Tests** (escenario: `ana` miembro de `fA` y `fC`, `bea` de `fB`; `ana` crea un deber `d1` para `fA/leo` con `ENLACE_1`):
  - `otraFamiliaDa404EnTodasLasRutas`: `bea` en `GET /deberes`, `POST /deberes`, `PUT /deberes/d1`, `PUT /importaciones-deberes`, `GET /importaciones-deberes` de `fA/leo` → `404` las cinco; `d1` sigue igual en Mongo.
  - `editarConRutaDeOtraFamiliaDa404`: `ana` hace `PUT /api/familias/fC/hijos/leo/deberes/d1` → `404`; `d1` sigue igual.
  - `otroHijoDa404`: `PUT /api/familias/fA/hijos/mia/deberes/d1` → `404`.
  - `mismaClaveDosVecesDa409`: `ana` repite `POST` con `ENLACE_1` → `409`; en Mongo hay **1** documento (se espera con `await()` a que `IndicesMongo` cree el índice, como el test existente).
  - `unaImportacionPorHijo`: dos `PUT /importaciones-deberes` → en `importaciones` hay **1** documento para `fA/leo` y `GET` trae `en`.
- [ ] `./mvnw --batch-mode test -Dtest=DeberIntegracionTest` (Docker arriba). Aquí no hay rojo previo esperable (las rutas ya existen): se comprueba que **falla** quitando la comprobación de `familyId` guardado en `actualizar` → `editarConRutaDeOtraFamiliaDa404` rojo, y comentando `requireMember` en `deHijo` → `otraFamiliaDa404EnTodasLasRutas` rojo; se restaura → verde. Anotarlo en el PR.
- [ ] `./mvnw --batch-mode test` completo → PASS (153 + los nuevos).
- [ ] Commit: `test(deberes): una segunda familia no ve ni toca los deberes de otra, ni por su propia ruta, porque son datos escolares de un menor`

---

### Task 9: adaptador `deberesService` y guardado de cuatro en cuatro

**Files:**
- Create: `src/services/deberesService.ts`
- Test: `src/__tests__/deberesService.test.ts` (mock de `./http` como `coachService.test.ts`)

**Interfaces:**
- Consumes: `apiFetch`, `ErrorHttp` (`http.ts`); `Deber`, `ItemImportado` (`deberTypes.ts`).
- Produces:
  ```ts
  export type DeberNuevo = Omit<Deber, 'id' | 'familyId' | 'hijoId' | 'clave' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  export const getDeberes: (familyId: string, hijoId: string, soloActivos: boolean) => Promise<Deber[]>;
  export const crearDeber: (familyId: string, hijoId: string, deber: DeberNuevo) => Promise<Deber>;
  export const actualizarDeber: (familyId: string, hijoId: string, id: string, deber: DeberNuevo) => Promise<Deber>;
  export const getUltimaImportacion: (familyId: string, hijoId: string) => Promise<string | undefined>;
  export const registrarImportacion: (familyId: string, hijoId: string) => Promise<void>;
  export interface Decision { item: ItemImportado; guardado?: Deber }   // item ya con el título/fecha que editó el adulto
  export interface ResultadoGuardado { guardados: number; fallidos: { item: ItemImportado; motivo: string }[] }
  export const guardarImportacion: (familyId: string, hijoId: string, decisiones: Decision[]) => Promise<ResultadoGuardado>;
  export const aDeberNuevo: (item: ItemImportado, guardado?: Deber) => DeberNuevo;
  ```
  `aDeberNuevo` conserva `isActive` del guardado (un ✏️ no desarchiva) y pone `isActive: true` en uno nuevo; `fecha: null` → sin campo. `guardarImportacion` llama a `registrarImportacion` **al final si no hubo fallos**, también con `decisiones = []`.

- [ ] **Tests que fallan:**
  - `rutasEscapadas`: `getDeberes('f A','leo/1', true)` → `apiFetch('/api/familias/f%20A/hijos/leo%2F1/deberes?soloActivos=true')`.
  - `nuevoEsPostYCambioEsPut`: dos decisiones (una con `guardado.id 'd1'`) → un `POST …/deberes` y un `PUT …/deberes/d1`; después **un** `PUT …/importaciones-deberes`.
  - `sinDecisionesSoloRegistraLaImportacion`: `guardarImportacion('fA','leo',[])` → solo `PUT …/importaciones-deberes`; `{ guardados: 0, fallidos: [] }`.
  - `sesentaDeberesSonSesentaPeticionesBajoElTope`: 60 decisiones con textos al máximo de `€` → 60 llamadas de deber, cada `new TextEncoder().encode(body).length < 16384`, y nunca más de 4 pendientes a la vez (contador en el mock con promesas que resuelve el test).
  - `unFalloNoParaElResto`: tres decisiones nuevas `d1..d3`; la 2.ª llamada rechaza `new ErrorHttp(409,'x','Deber repetido')` → `{ guardados: 2, fallidos: [{ item: d2.item, motivo: 'Ya estaba guardado: vuelve a importar para ver el cambio' }] }`; **no** se registra la importación (el aviso de «más de un día» sigue hasta que salga limpia).
  - `unCambioNoDesarchiva`: `aDeberNuevo(item, guardado({ isActive: false })).isActive === false`.
  - `ultimaImportacionVacia`: `apiFetch` resuelve `{}` → `undefined`.
- [ ] `npx vitest run src/__tests__/deberesService.test.ts` → FAIL por aserción (stubs: `[]`, `undefined`, resultado vacío).
- [ ] Implementar en `src/services/deberesService.ts`; el reparto en 4 es un bucle de `Promise.allSettled` sobre trozos de 4 (no hace falta más).
- [ ] Mismo comando → PASS; `npx vitest run src/__tests__/arquitectura.test.ts` → PASS; lint y typecheck → 0.
- [ ] Commit: `feat(deberes): el servicio guarda cada deber en su propia peticion, de cuatro en cuatro, porque un lote no cabe en el tope de 16 KB`

---

### Task 10: pantalla «Importar deberes»

**Files:**
- Create: `src/components/deberes/ImportarDeberes.tsx`
- Test: `src/__tests__/ImportarDeberes.test.tsx` (mock de `../services/deberesService`)

**Interfaces:**
- Consumes: `parsearDeberes`, `compararConGuardados`, `hoyEnMadrid`, `getDeberes`, `guardarImportacion`, componentes `ui/` (`Button`, `Card`, `Checkbox`, `Field`, `Accordion`).
- Produces: `export default function ImportarDeberes(props: { familyId: string; hijoId: string; nombreHijo: string; hoy?: string; onGuardado?: () => void }): JSX.Element` (`hoy` por defecto = `hoyEnMadrid()`; los tests lo fijan en `'2027-03-09'`).

Comportamiento: `<textarea>` con etiqueta «Pega aquí la lista de Claude in Chrome» y `maxLength 200000` → botón «Ver qué cambia» (pide `getDeberes(familyId, hijoId, false)`: archivados incluidos) → secciones con encabezado y número: «Nuevos», «Cambiaron» (tabla campo · antes · después; etiqueta «Archivado» si lo está), «Iguales» (plegado), «Ya no aparecen» («No se borra nada. Si ya no hace falta, archívalo desde la lista.»), «Errores» (línea, motivo, texto), «Dudas», «Cobertura» (tabla por asignatura). Cada nuevo/cambiado: casilla «Guardar» marcada, título y fecha editables. Botón «Guardar N deberes», o «Revisado, sin cambios» si no hay nuevos ni cambiados → resumen «Guardados: N» y la lista de fallidos.

- [ ] **Tests que fallan** (texto = el ejemplo de la receta; `getDeberes` resuelve `[guardado del examen de Matemáticas con fecha 2027-03-12]`):
  - `agrupaLaPegada`: tras «Ver qué cambia», `getDeberes` se llamó con `('fA','leo', false)`; `getByRole('heading', { name: 'Nuevos (3)' })`, `'Cambiaron (1)'`, `'Dudas (1)'`; la fila de cambio muestra `2027-03-12` y `2027-03-15`.
  - `descartarNoGuarda`: desmarcar «Guardar» del aviso de Ciencias y pulsar «Guardar 3 deberes» → `guardarImportacion` recibe 3 decisiones, ninguna con `item.tipo === 'AVISO'`.
  - `editarTitulo`: cambiar el título de la entrega a «Redacción corregida» → la decisión lleva `item.titulo === 'Redacción corregida'`; ninguna fila tiene campo de puntos.
  - `sinCambiosRegistraLaImportacion`: `getDeberes` resuelve los cuatro del ejemplo ya guardados e iguales → «Iguales (4)», botón «Revisado, sin cambios» → `guardarImportacion('fA','leo',[])`.
  - `erroresYYaNoAparece`: con una línea `javascript:` y una `ENTREGA` guardada ausente de la pegada → «Errores (1)» con «El enlace no es https:// seguro» y «Ya no aparecen (1)» con el título del guardado.
  - `noPintaHtml`: un título `<img src=x onerror=alert(1)>` aparece como texto (`getByText`) y `container.querySelector('img')` es `null`.
  - `enlacesSeguros`: cada `<a>` tiene `href` que empieza por `https://` y `rel="noopener noreferrer"`.
  - `accesible`: `expect(await axe(container)).toHaveNoViolations()` en la vista previa.
- [ ] `npx vitest run src/__tests__/ImportarDeberes.test.tsx` → FAIL por aserción (stub: un `<div />`).
- [ ] Implementar `ImportarDeberes.tsx`: estado `'pegar' | 'revisar' | 'guardando' | 'hecho'`; el cálculo es `compararConGuardados(parsearDeberes(texto).items, guardados, …)`; nada de lógica de formato en el componente.
- [ ] Mismo comando → PASS; `npx vitest run src/__tests__/contraste.test.ts src/__tests__/tokens.test.ts` → PASS; lint y typecheck → 0.
- [ ] Commit: `feat(deberes): el adulto revisa la pegada agrupada en nuevo, cambio, igual y desaparecido antes de guardar, porque solo se guarda lo que el acepta`

---

### Task 11: lista de deberes y «Última importación»

**Files:**
- Create: `src/components/deberes/ListaDeberes.tsx`, `src/utils/deberes/agrupar.ts`
- Test: `src/__tests__/deberesAgrupar.test.ts`, `src/__tests__/ListaDeberes.test.tsx`

**Interfaces:**
- Produces (`agrupar.ts`):
  ```ts
  export interface DiaDeDeberes { fecha: string | null; deberes: { deber: Deber; materiales: Deber[] }[] }
  export function agruparPorFecha(deberes: Deber[]): { dias: DiaDeDeberes[]; materialSinExamen: Deber[] };
  ```
  Orden: fechas ascendentes, «sin fecha» al final; `MATERIAL` nunca es fila propia: cuelga del `EXAMEN` activo cuyo `enlace` es su `examen`, si no va a `materialSinExamen`.
- Produces: `export default function ListaDeberes(props: { familyId: string; hijoId: string; ahora?: Date; onImportar: () => void }): JSX.Element` (pide `getDeberes(familyId, hijoId, true)`).

- [ ] **Tests que fallan:**
  - `ordenaPorFecha` / `sinFechaVaAlFinal`: entregas del `2027-03-10`, sin fecha y `2027-03-08` → `dias.map(d => d.fecha)` = `['2027-03-08','2027-03-10', null]`.
  - `materialColgadoDeSuExamen`: examen `E1` + material con `examen: E1` → `dias[0].deberes[0].materiales` tiene el material; no hay fila propia.
  - `materialSinExamenVaASuGrupo`: material con `examen` que no está → `materialSinExamen` lo tiene.
  - `ListaDeberes muestraUltimaImportacionYAvisa`: `getUltimaImportacion` → `'2027-03-08T08:00:00Z'`, `ahora = 2027-03-09T20:00:00Z` → texto «Última importación: 8 de marzo de 2027» y un aviso con rol `status` «Hace más de un día que no importas. Los profesores publican a diario.»; con `undefined` → «Todavía no has importado deberes».
  - `confirmarArchiva`: botón «Confirmar hecho» de una entrega → `actualizarDeber(…, 'd1', { …, isActive: false })` y la fila desaparece; el material y el aviso no tienen ese botón.
  - `todoSePuedeArchivar`: el examen, la entrega, el aviso y el material colgado tienen cada uno «Archivar»; pulsarlo en el aviso → `actualizarDeber(…, isActive: false)` y desaparece.
  - `enlaceAbreClassroom`: enlace «Abrir en Classroom» con `href` = `deber.enlace` y `rel="noopener noreferrer"`.
  - `accesible`: `axe` sin violaciones.
- [ ] `npx vitest run src/__tests__/deberesAgrupar.test.ts src/__tests__/ListaDeberes.test.tsx` → FAIL por aserción (stubs: `{ dias: [], materialSinExamen: [] }` y un `<div />`).
- [ ] Implementar `agruparPorFecha` y `ListaDeberes` (fecha con `toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })`; el aviso usa `necesitaImportar`).
- [ ] Mismo comando → PASS; lint y typecheck → 0.
- [ ] Commit: `feat(deberes): la lista ordena los deberes por fecha con el material bajo su examen y deja confirmar o archivar, porque a un adolescente se le pasan los deberes`

---

### Task 12: pestaña «Deberes» en el panel

**Files:**
- Create: `src/components/deberes/PanelDeberes.tsx` (elige hijo, monta `ListaDeberes` y es **dueño del `Modal`** con `ImportarDeberes`)
- Modify: `src/components/dashboard/Dashboard.tsx` (amplía la unión de `activeTab` con `'deberes'`, añade la pestaña y su `case` que monta `PanelDeberes`; nada más)
- Test: `src/__tests__/PanelDeberes.test.tsx`

**Interfaces:**
- Produces: `export default function PanelDeberes(props: { familyId: string; hijos: { id: string; nombre: string }[] }): JSX.Element`.
- `Dashboard`: `useState<'overview' | 'children' | 'tasks' | 'privileges' | 'faqs' | 'deberes'>`; pestaña `{ id: 'deberes', label: 'Deberes', disabled: !isPadre, disabledReason: 'solo disponible para padres' }`, icono `faBook`.

- [ ] **Tests que fallan:**
  - `eligeHijoYListaSusDeberes`: con hijos `[{id:'leo',nombre:'Leo'},{id:'mia',nombre:'Mía'}]`, elegir «Mía» → `getDeberes('fA','mia', true)`.
  - `importarAbreElDialogoYRecargaAlGuardar`: «Importar deberes» abre un diálogo (`role="dialog"`) con título «Importar deberes de Leo»; al llamar `onGuardado`, se vuelve a pedir `getDeberes`.
  - `sinHijos`: texto «Añade un hijo para importar sus deberes.»
- [ ] `npx vitest run src/__tests__/PanelDeberes.test.tsx` → FAIL por aserción (stub: un `<div />`).
- [ ] Implementar `PanelDeberes.tsx` y la pestaña en `Dashboard.tsx` (`git log --oneline -10 -- src/components/dashboard/Dashboard.tsx` antes).
- [ ] `npx vitest run` completo → PASS; `npm run lint && npm run typecheck` → 0.
- [ ] Actualizar `backend/AGENTS.md` (tabla de API con las 5 rutas) y `MEMORY.md` (estado, decisión 1, puntos opción A, próximo paso: entrega 2).
- [ ] Commit: `feat(deberes): el adulto llega a los deberes desde su panel, porque el hijo aun no tiene sesion propia`

---

## Límites declarados (para el cuerpo del PR)

- No hay puntos por deber en esta entrega (opción A): confirmar solo archiva. Confirmar y archivar quedan iguales en datos hasta la entrega 2.
- `hijoId` no se valida contra Firestore; un id inventado crea deberes huérfanos dentro de la propia familia.
- Sin `DELETE`: archivar es la única baja. Sin bloques ni planning (entrega 2).
- Si un material cambia de examen, su clave cambia: sale como 🆕 y el viejo sigue activo hasta que se archive. Archivar un examen deja sus materiales en «Material sin examen».
- La receta solo se prueba por su ejemplo; la salida real de Chrome se prueba a mano con la cuenta de la dueña y **no se versiona** (`*.pegada.txt` en `.gitignore`).
