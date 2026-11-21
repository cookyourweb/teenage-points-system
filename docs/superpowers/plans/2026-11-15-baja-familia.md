# Script de baja de una familia — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que la dueña pueda borrar **todos** los datos de una familia que pide la baja (RGPD art. 17, plazo de un mes), con un comando que por defecto solo **muestra** lo que borraría.

**Architecture:** script Node/TypeScript en `scripts/baja-familia/`, ejecutado por la dueña en su máquina (nunca en la app ni en CI contra producción). Separado en: un **planificador puro** (dado lo que hay, decide qué borrar y en qué orden), **adaptadores** (Firestore + Auth con Firebase Admin SDK; Mongo con el driver oficial) y un **CLI** con `--familia <id>` y `--confirmar`. Sin `--confirmar` es un ensayo (*dry run*). Orden: Mongo → Firestore (datos, luego `usuarios`, luego `familias/{id}`) → Auth al final, para que un fallo a medias no deje datos sin dueño localizable.

**Tech Stack:** Node 20, TypeScript, `tsx` para ejecutar, `firebase-admin`, `mongodb`, Vitest, emuladores de Firebase (Firestore + Auth), `mongodb-memory-server` para tests.

**Spec:** decisión de la dueña (15-nov-2026) en conversación; RGPD art. 17. Inventario de colecciones medido en el código el 15-nov (tabla abajo). Relacionado: `docs/superpowers/specs/2026-11-13-vision-producto-design.md` (datos de menores).

## Global Constraints

- **Por defecto no borra nada**: sin `--confirmar` solo lista, por colección, cuántos documentos y qué ids borraría.
- **Credenciales sin fichero de clave**: Application Default Credentials (`gcloud auth application-default login`), nunca una clave JSON de cuenta de servicio en el repo ni en el disco del proyecto. El script **no imprime** tokens ni credenciales.
- Proyecto de Firebase y URI de Mongo por **variables de entorno** (`FIREBASE_PROJECT_ID`, `MONGODB_URI`); sin valores por defecto que apunten a producción. Si apuntan a un emulador, se respeta `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST`.
- Repo público: ningún id, email ni dato real en ficheros versionados.
- **No borra** el catálogo común (`tareas`, `recompensas`, `categorias`).
- Una cuenta de Auth **solo** se borra si ese uid no tiene membresía en **otra** familia (Mongo `membresias`) ni su `usuarios.familyId` apunta a otra.
- Al terminar con `--confirmar`, imprime un **resumen sin datos personales** (fecha, `familyId`, recuentos por colección) para que la dueña lo guarde como constancia.
- Repo: TDD estricto, un commit por tarea en español con el porqué, sin Co-Authored-By ni atribución a IA, sin push. Verificación: `npm run lint`, `npm run typecheck`, `npx vitest run`, y el test de integración del script.

## Inventario (medido en `src/` el 15-nov)

| Colección | Cómo se liga a la familia `F` |
|---|---|
| Firestore `familias/F` | el documento; `miembros.padres` (mapa uid→datos) y `miembros.hijos` |
| `usuarios` | `where familyId == F` **y** los uid de `miembros.padres` |
| `weeklyTasks`, `privileges`, `privilegeHistory`, `invitaciones` | `where familyId == F` |
| `privilegeHistory` (canjes antiguos sin `familyId`) | `where childId in <hijos de F>` |
| `childPoints` | id del documento empieza por `F_` |
| `tasks` (Firestore) | `where childId in <hijos de F>` |
| Mongo `tasks`, `membresias` | `{ familyId: F }` |
| Firebase Auth | uid de los adultos (con la regla de "no en otra familia") |

## Review Focus

1. **Familia inexistente**: mensaje claro y código ≠ 0, sin borrar nada. → Task 1.
2. **Ensayo sin `--confirmar`**: cero escrituras en las tres fuentes. → Task 3 (test que cuenta escrituras).
3. **Adulto que está también en otra familia**: su cuenta de Auth y su `usuarios` sobreviven. → Task 1.
4. **Más de 500 documentos** en una colección (límite de lote de Firestore): se borran todos. → Task 2.
5. **Fallo a mitad** (p. ej. Firestore cae tras borrar Mongo): el script para, informa qué hizo y volver a ejecutarlo termina el trabajo (idempotente). → Task 3.

---

### Task 1: el planificador (puro, sin red)

**Files:**
- Create: `scripts/baja-familia/plan.ts`, `scripts/baja-familia/tipos.ts`
- Test: `scripts/baja-familia/plan.test.ts`
- Modify: `vite.config.ts` o config de vitest para incluir `scripts/**/*.test.ts` (no los de integración)

**Interfaces:**
- Produces: `type Inventario` (lo que los adaptadores leen: familia con padres e hijos, ids por colección, membresías por uid); `type PlanBaja = { pasos: Paso[] }` donde `Paso = { fuente: 'mongo' | 'firestore' | 'auth'; coleccion: string; ids: string[] }`; `planificarBaja(inv: Inventario): PlanBaja`; `FamiliaNoEncontrada` (error).
- Orden de `pasos`: Mongo (`tasks`, `membresias`) → Firestore datos (`weeklyTasks`, `privileges`, `privilegeHistory`, `invitaciones`, `childPoints`, `tasks`) → `usuarios` → `familias` → `auth`.

- [ ] **Step 1: Tests que fallan:** `ordenDeBorrado` (Auth último, `familias` antes de Auth y después de `usuarios`); `familiaInexistenteLanza`; `adultoEnOtraFamiliaSeConserva` (su uid fuera de `usuarios` y de `auth`); `canjesViejosPorHijo` (privilegeHistory sin familyId de un hijo de F entra); `noTocaElCatalogo` (ningún paso sobre `tareas`, `recompensas`, `categorias`); `sinDuplicados` (un id que aparece por dos vías sale una vez).
- [ ] **Step 2:** rojo por aserción; implementar; verde.
- [ ] **Step 3: Commit** `feat(baja): el plan de borrado de una familia se decide sin tocar la red para poder probarlo entero`

### Task 2: adaptadores (Firestore + Auth y Mongo)

**Files:**
- Create: `scripts/baja-familia/firebase.ts`, `scripts/baja-familia/mongo.ts`
- Modify: `package.json` (devDependencies: `firebase-admin`, `mongodb`, `tsx`, `mongodb-memory-server`; script `baja:familia`)
- Test: `scripts/baja-familia/integracion.test.ts` (emuladores Firestore + Auth y `mongodb-memory-server`), con su propio script `test:baja` = `firebase emulators:exec --only firestore,auth --project demo-teenage-points "vitest run --config vitest.baja.config.ts"`

**Interfaces:**
- Produces: `leerInventario(familyId, { firestore, auth, mongo }): Promise<Inventario>`; `ejecutar(plan, { firestore, auth, mongo }): Promise<Resumen>` con borrado en lotes de ≤ 500 y `deleteUsers` de Auth en lotes de ≤ 1000; `type Resumen = { familyId; fecha; recuentos: Record<string, number> }`.

- [ ] **Step 1: Test que falla** `borraTodoYSoloLoDeLaFamilia`: sembrar en emuladores y Mongo en memoria dos familias (F y G) con datos en cada colección del inventario + un adulto compartido + catálogo; `leerInventario('F')` → `ejecutar(plan)` → no queda nada de F, G intacta, catálogo intacto, adulto compartido intacto.
- [ ] **Step 2: Test que falla** `masDeQuinientos` (Review Focus 4): 1200 `weeklyTasks` de F → todos borrados.
- [ ] **Step 3: Test que falla** `idempotente` (Review Focus 5): ejecutar dos veces → la segunda no falla y su resumen es 0.
- [ ] **Step 4:** implementar; `npm run test:baja` verde; añadir el job al CI junto al de reglas (mismos emuladores; `mongodb-memory-server` no necesita Docker).
- [ ] **Step 5: Commit** `feat(baja): los adaptadores borran por lotes en Mongo, Firestore y Auth, probados contra emuladores`

### Task 3: el CLI con ensayo por defecto

**Files:**
- Create: `scripts/baja-familia/cli.ts`
- Test: `scripts/baja-familia/cli.test.ts` (adaptadores falsos)
- Modify: `docs/LEVANTAR-EN-LOCAL.md` o nuevo `docs/BAJA-DE-FAMILIA.md` (cómo y cuándo, ADC con `gcloud`, constancia)

**Interfaces:**
- `npm run baja:familia -- --familia <id> [--confirmar]`. Sin `--familia` → uso y código 2. Variables de entorno que faltan → mensaje y código 2. Familia inexistente → código 1.

- [ ] **Step 1: Tests que fallan:** `ensayoNoEscribe` (Review Focus 2: el adaptador falso cuenta 0 llamadas de borrado y la salida lista recuentos); `confirmarEjecuta`; `faltaFamiliaMuestraUso`; `noImprimeDatosPersonales` (la salida no contiene emails ni nombres sembrados); `falloAMitadInforma` (Review Focus 5: el adaptador falla en Firestore → código ≠ 0 y dice qué pasos se completaron).
- [ ] **Step 2:** implementar; verde; lint y typecheck.
- [ ] **Step 3: Commit** `feat(baja): comando de baja que por defecto solo ensaya, para no borrar una familia por error`

### Task 4: ensayo real (la dueña con el controlador)

- [ ] La dueña instala `gcloud` si no está y hace `gcloud auth application-default login` (ella, en su terminal).
- [ ] Ensayo sin `--confirmar` contra una **familia de prueba** creada para esto: revisar recuentos.
- [ ] Con el sí de la dueña, `--confirmar` sobre esa familia de prueba; comprobar en la app que su cuenta ya no entra y que la familia de la dueña sigue intacta.
- [ ] `MEMORY.md`, `docs/APRENDER-ARQUITECTURA.md` (derecho de supresión, ensayo por defecto, orden de borrado, credenciales sin fichero de clave) y log de sesiones.
