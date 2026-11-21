# Sesión 1: cerrar los agujeros de las reglas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que nadie pueda crearse administrador ni apuntarse a la familia de otro, que el contenido del método deje de leerse sin sesión y que el alta cree una sola familia.

**Architecture:** Las reglas de Firestore se prueban contra el emulador con `@firebase/rules-unit-testing`, en una configuración de Vitest aparte (entorno `node`) que no entra en `npx vitest run`. El alta de familia queda en un solo sitio (`Signup.tsx`); `useAuth` deja de crear nada. Las reglas solo se endurecen.

**Tech Stack:** Firestore Security Rules v2, `firebase-tools` 13.13 (emulador, ya instalado en global), `@firebase/rules-unit-testing`, Vitest 2, React 18 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` (§2 agujeros A1, A2, A3, A5 y A8; §8 sesión 1).

## Global Constraints

- TDD estricto (`AGENTS.md`): el test se ve fallar **por una aserción**, no por un módulo que falta, antes de implementar.
- Un commit por tarea, en español, con el porqué en el título y formato convencional (`fix(reglas): ...`, `test: ...`, `fix(ui): ...`). **Sin `Co-Authored-By` ni atribución a IA.**
- Rama `develop`. Nada a `main`.
- **No debilitar** reglas ni tests existentes para que algo pase.
- **Ningún contenido del método en tests ni en fixtures:** los datos de prueba de `categorias` llevan el marcador `[FICTICIO]`.
- Firestore solo dentro de `src/services/` (excepción heredada: `useAuth.ts`, que esta sesión **reduce**, no amplía).
- El emulador de Firestore usa el **puerto 8085**: el 8080 es del backend Java.
- **No hacer `npm run build` sin preguntar.** Verificación: `npm run lint`, `npm run typecheck`, `npx vitest run` y `npm run test:rules`.
- **Desplegar las reglas es un cambio en producción:** solo con el sí explícito de la dueña (Tarea 5).

## Review Focus

- Un usuario que **ya existe** sigue sin poder cambiarse `rol` ni `familyId` al actualizar: el arreglo de `create` no puede abrir `update`. → test en la Tarea 1.
- Alguien que crea su `usuarios/{uid}` con el `familyId` de una familia **real en la que no figura**: denegado. → test en la Tarea 1.
- Un miembro de una familia **sigue pudiendo** leer su familia y un extraño no: pinzar el comportamiento actual antes de tocar el fichero. → test en la Tarea 1.
- Un visitante sin sesión que abre `/faqs` (por ejemplo, el abuelo con el enlace viejo) llega a la pantalla de entrada, no a una página rota o vacía. → test en la Tarea 2.
- Un usuario sin documento en `usuarios` (por ejemplo, un alta que falló a medias) **no** recibe una familia nueva al entrar, y `useAuth` no lanza un error. → test en la Tarea 3.

---

### Task 1: Arnés de tests de reglas + cerrar A1 (alta de `usuarios` y de `familias`)

**Files:**
- Modify: `firebase.json` (añadir `emulators.firestore.port: 8085`)
- Modify: `package.json` (devDependency `@firebase/rules-unit-testing`; script `test:rules`)
- Create: `vitest.rules.config.ts`
- Modify: `vite.config.ts` (`test.exclude` añade `tests/rules/**`, conservando los valores por defecto de Vitest)
- Create: `tests/rules/usuarios-familias.rules.test.ts`
- Modify: `firestore.rules:46-67`

**Interfaces:**
- Produces: script `npm run test:rules` = `firebase emulators:exec --only firestore --project demo-teenage-points "vitest run --config vitest.rules.config.ts"`. Proyecto `demo-*`: el emulador no toca nada real.
- Produces: helper `tests/rules/entorno.ts` con `crearEntorno(): Promise<RulesTestEnvironment>` (lee `firestore.rules`, host `127.0.0.1`, puerto 8085) y `sembrar(env, ruta: string, datos: object)` (escribe con `withSecurityRulesDisabled`). Lo usan las Tareas 1 y 2.

- [ ] **Step 1: Instalar y configurar el arnés**

`npm i -D @firebase/rules-unit-testing`. `vitest.rules.config.ts` con `environment: 'node'`, `include: ['tests/rules/**/*.rules.test.ts']`, sin `setupFiles` y `fileParallelism: false` (un solo emulador compartido). Run: `npx vitest run` → la suite actual sigue en verde y no recoge `tests/rules/`.

- [ ] **Step 2: Escribir los tests (deben fallar los de alta)**

En `tests/rules/usuarios-familias.rules.test.ts`, con `beforeEach` que limpia (`env.clearFirestore()`) y siembra `familias/F1` con `miembros.padres = { ana: {...} }` y `usuarios/ana` con `{ rol: 'padre', familyId: 'F1' }`:

```ts
it('nadie se crea admin al darse de alta', async () =>
  assertFails(setDoc(doc(como('eva'), 'usuarios/eva'), { nombre: 'Eva', email: 'e@x.es', rol: 'admin', familyId: 'F2' })));

it('nadie se apunta a una familia en la que no figura', async () =>
  assertFails(setDoc(doc(como('eva'), 'usuarios/eva'), { nombre: 'Eva', email: 'e@x.es', rol: 'padre', familyId: 'F1' })));

it('no se aceptan campos de más al crear el usuario', async () => { /* familia F2 de eva sembrada; doc válido + { esAdmin: true } */ assertFails(...) });

it('el alta normal funciona: familia propia y luego usuario', async () => {
  await assertSucceeds(setDoc(doc(como('eva'), 'familias/F2'), { miembros: { padres: { eva: { nombre: 'Eva', email: 'e@x.es', rol: 'padre' } }, hijos: {} } }));
  await assertSucceeds(setDoc(doc(como('eva'), 'usuarios/eva'), { nombre: 'Eva', email: 'e@x.es', rol: 'padre', familyId: 'F2', fechaCreacion: '2026-11-13T00:00:00.000Z' }));
});

it('no se crea una familia metiendo a otro adulto', async () =>
  assertFails(setDoc(doc(como('eva'), 'familias/F3'), { miembros: { padres: { eva: {...}, ana: {...} }, hijos: {} } })));

it('un usuario existente sigue sin poder cambiarse el rol', async () =>
  assertFails(updateDoc(doc(como('ana'), 'usuarios/ana'), { rol: 'admin' })));

it('un miembro lee su familia y un extraño no', async () => {
  await assertSucceeds(getDoc(doc(como('ana'), 'familias/F1')));
  await assertFails(getDoc(doc(como('eva'), 'familias/F1')));
});
```

`como(uid)` = `env.authenticatedContext(uid).firestore()`.

- [ ] **Step 3: Verlos fallar**

Run: `npm run test:rules`
Expected: fallan por aserción `nadie se crea admin…`, `nadie se apunta…`, `no se aceptan campos…` y `el alta normal funciona` (hoy `familias` exige un `usuarios` previo). Los dos últimos pasan: pinzan lo que ya funciona.

- [ ] **Step 4: Endurecer `firestore.rules`**

- `usuarios` `create`: `request.auth.uid == uid`, `keys().hasOnly(['nombre','email','rol','familyId','fechaCreacion'])`, `rol == 'padre'`, y `request.auth.uid in get(/databases/$(database)/documents/familias/$(request.resource.data.familyId)).data.miembros.padres`.
- `familias`: `create` si `request.resource.data.miembros.padres.keys().hasOnly([request.auth.uid])` y `hijos.size() == 0`; `read, update, delete` siguen con `esMiFamilia(familyId)`.
- Mantener los comentarios del fichero y añadir uno corto con el porqué de cada cambio.

- [ ] **Step 5: Verlos pasar**

Run: `npm run test:rules` → Expected: 7 PASS. Run: `npx vitest run` → Expected: suite actual en verde.

- [ ] **Step 6: Commit**

```bash
git add firebase.json package.json package-lock.json vitest.rules.config.ts vite.config.ts tests/rules firestore.rules
git commit -m "fix(reglas): nadie puede crearse admin ni apuntarse a la familia de otro al darse de alta"
```

---

### Task 2: Cerrar A2 (el contenido del método deja de leerse sin sesión)

**Files:**
- Create: `tests/rules/categorias.rules.test.ts`
- Modify: `firestore.rules:99-109` (bloque `categorias` y su comentario)
- Modify: `src/App.tsx:85-88` (ruta `/faqs`)
- Modify: `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `crearEntorno`, `sembrar` y `como` de la Tarea 1.

- [ ] **Step 1: Tests de reglas**

Sembrar `categorias/c1 = { titulo: '[FICTICIO] Categoría', definicion: '[FICTICIO]', preguntas: [] }`.

```ts
it('sin sesión no se lee el contenido', () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'categorias/c1'))));
it('con sesión sí se lee', () => assertSucceeds(getDoc(doc(como('ana'), 'categorias/c1'))));
it('un padre no escribe categorías', () => assertFails(setDoc(doc(como('ana'), 'categorias/c2'), { titulo: '[FICTICIO]' })));
it('un admin sí escribe', /* usuarios/root sembrado con rol 'admin' y su familia */ () => assertSucceeds(...));
```

- [ ] **Step 2: Test de la ruta**

En `App.test.tsx`, con el patrón de *mocks* que ya usa el fichero: sin usuario, navegar a `/faqs` muestra la pantalla de entrada (el mismo elemento que el test existente usa para `/`), no `PaginaFaqs`.

- [ ] **Step 3: Verlos fallar**

Run: `npm run test:rules` → falla `sin sesión no se lee el contenido`. Run: `npx vitest run src/__tests__/App.test.tsx` → falla el test de `/faqs`.

- [ ] **Step 4: Implementar**

- `categorias`: `allow read: if haIniciadoSesion();` y `write` igual. El comentario explica que el contenido es del método (derechos de su autor) y que **leerlo solo desde el backend** llega con la sesión 4.
- `App.tsx`: `/faqs` con la misma condición que `/dashboard` (`user ? <PaginaFaqs /> : <Navigate to="/" replace />`). Actualizar el comentario de la ruta.

- [ ] **Step 5: Verlos pasar**

Run: `npm run test:rules` y `npx vitest run` → todo en verde. Run: `npm run lint` y `npm run typecheck` → 0.

- [ ] **Step 6: Commit**

```bash
git add tests/rules/categorias.rules.test.ts firestore.rules src/App.tsx src/__tests__/App.test.tsx
git commit -m "fix(reglas): el contenido del metodo deja de leerse sin sesion porque no es nuestro para publicarlo"
```

---

### Task 3: Cerrar A5 (una sola familia por alta) y el cierre de sesión roto

**Files:**
- Create: `src/__tests__/useAuth.test.tsx`
- Modify: `src/hooks/useAuth.ts:15-62`

**Interfaces:**
- Produces: `useAuth(): { user: User | null; loading: boolean; logout: () => Promise<void> }`. La firma no cambia; cambia el comportamiento.

- [ ] **Step 1: Tests**

Con `vi.mock('firebase/auth')`, `vi.mock('firebase/firestore')`, `vi.mock('../services/familyService')` y `MemoryRouter`:

```ts
it('un usuario sin documento no recibe una familia nueva', async () => {
  // onAuthStateChanged entrega { uid: 'u1' }; getDoc devuelve exists() === false
  // renderHook(() => useAuth()) y esperar a loading === false
  expect(addFamily).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
});
it('cerrar sesión lleva a la entrada', async () => {
  // result.current.logout() → expect(navigate).toHaveBeenCalledWith('/')
});
```

- [ ] **Step 2: Verlos fallar**

Run: `npx vitest run src/__tests__/useAuth.test.tsx`
Expected: FAIL. `addFamily` se llama 1 vez; `navigate` recibe `'/signin'`.

- [ ] **Step 3: Implementar**

En `useAuth.ts`: quitar todo el bloque de "usuario nuevo" (lectura de `usuarios` y creación de familia). Solo queda `onAuthStateChanged` → `setUser` / `setLoading`. `logout` navega a `'/'`. Quitar los imports de Firestore y de `familyService` que queden sin uso. `Signup.tsx` sigue siendo el único sitio que crea la familia.

- [ ] **Step 4: Verlos pasar**

Run: `npx vitest run` → todo en verde. Run: `npm run lint` y `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/__tests__/useAuth.test.tsx
git commit -m "fix(auth): el alta crea una sola familia porque useAuth tambien la creaba y salian duplicadas"
```

---

### Task 4: Las reglas se prueban en CI

**Files:**
- Modify: `.github/workflows/ci.yml` (job nuevo `reglas`)

- [ ] **Step 1: Añadir el job**

Job `reglas` en `ubuntu-latest`: `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, caché npm), `actions/setup-java@v4` (Temurin 17; el emulador necesita Java), `npm ci`, `npx firebase-tools@13.13.0 emulators:exec --only firestore --project demo-teenage-points "npx vitest run --config vitest.rules.config.ts"`. Sin `continue-on-error`. Comentario corto con el porqué, al estilo del fichero.

- [ ] **Step 2: Verificar**

Push a `develop` y `gh run watch` → Expected: los tres jobs en verde.

- [ ] **Step 3: Commit** (antes del push del Step 2)

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): las reglas de Firestore se prueban en cada push para que no se abran sin que nadie lo vea"
```

---

### Task 5: Comprobar las reglas desplegadas (A3) y desplegar — **con el sí de la dueña**

**Files:** ninguno (verificación y despliegue).

- [ ] **Step 1: La dueña compara las reglas desplegadas**

Ella abre **Consola de Firebase → Firestore Database → Reglas** y compara con `firestore.rules` de `develop`. Anotar el resultado (iguales / distintas / las de por defecto) en `MEMORY.md`. **Si son distintas, parar** y revisar con ella antes de seguir: el despliegue podría romper pantallas que hoy funcionan.

- [ ] **Step 2: Desplegar, solo con su sí explícito**

Run (lo ejecuta ella, o el agente con su permiso): `firebase deploy --only firestore:rules --project sistema-puntos`
Expected: `Deploy complete!`

- [ ] **Step 3: Comprobar en producción**

Run: `curl -s -o /dev/null -w '%{http_code}' "https://firestore.googleapis.com/v1/projects/sistema-puntos/databases/(default)/documents/categorias"`
Expected: `403` (antes devolvía `200`). Después, la dueña entra con su cuenta y comprueba que el panel, las tareas y `/faqs` siguen funcionando.

- [ ] **Step 4: Cerrar**

Actualizar `MEMORY.md` (estado de las reglas, sesión 1 hecha) en un commit `docs(memoria): ...`.
