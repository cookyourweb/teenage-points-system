# Sesión 2 (S1): autenticación con `/api/me` — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que la API Java sepa **quién** llama (token de Firebase verificado en el servidor), que el frontend mande ese token en cada petición, y que la sesión viva en un solo `AuthProvider` que además arregla la carrera del alta.

**Architecture:** Spring Security como *resource server* verifica el JWT de Firebase contra su JWKS (solo RS256, `iss`, `aud`, `sub`). `/api/**` exige token; `/actuator/health` no. En el frontend, `src/services/http.ts` (`apiFetch`) es el único sitio que usa `fetch` y pone el token. Un `AuthProvider` sustituye las fuentes de sesión sueltas y observa `usuarios/{uid}` **en vivo**, así que el panel ya no lee un documento que todavía no existe.

**Tech Stack:** Java 17, Spring Boot 4.1 (`spring-boot-starter-oauth2-resource-server`, `spring-security-test`), React 18 + TS, Firebase JS SDK 11, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` — §4 "Autenticación", §6 "Sesión y alta" y "Peticiones", §8 fila "2. Auth (S1)", §10 "Ajustes → Autenticación" (§10 manda sobre lo anterior).

## Global Constraints

- Demo de la sesión (§8): **sin token, 401; con token, devuelve el `uid`**.
- Decodificador: JWKS de Firebase **solo RS256**; valida `iss` = `https://securetoken.google.com/{proyecto}`, `aud` contiene `{proyecto}` y `sub` no vacío (§10). Tests con tokens **falsos (otra clave), caducados, de otro proyecto y `alg=none`** (§8).
- **No** Firebase Admin SDK (§4). Sin sesión en servidor, sin CSRF; CORS permite la cabecera `Authorization` (§4).
- El id del proyecto llega por variable de entorno `FIREBASE_PROJECT_ID`, **sin valor por defecto** (si falta, la API no arranca: falla cerrada). Nada de ids en ficheros versionados.
- `fetch` solo en `src/services/http.ts`; Firebase solo en `src/services/`, `src/firebase.ts` y el `AuthProvider` (§6 Tests).
- Token: se pide a Firebase en cada llamada (`getIdToken()`), nunca se guarda a mano; un 401 reintenta **una** vez con `getIdToken(true)` (§6).
- Errores con tipo: `ErrorHttp` con `status` (§6).
- Repo: TDD estricto (el test falla por aserción antes de implementar), un commit por tarea en español con el porqué, **sin Co-Authored-By ni atribución a IA**, sin push, sin build, sin desplegar. Antes de editar: `git log --oneline -5 -- <ruta>`.
- Verificación: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run test:rules`, y en `backend/` `./mvnw test`.

## Rulings tomados al escribir el plan

- **Estados del `AuthProvider`:** §8 pide 3 (`cargando`, `anónimo`, `autenticado`). "Sin familia / con familia" (§6) depende de `Membresia` (sesión 3), así que aquí el `perfil` del usuario va **dentro** de `autenticado`. Coste si es incorrecto: renombrar estados en la sesión 3.
- **Mocks de `fetch` con `vi.fn` y no MSW** (§6 pide MSW): con dos llamadas, MSW es dependencia de más. Entra en la sesión 3, cuando haya 401/403/404 en varias rutas. Coste: reescribir 2 ficheros de test.
- **La carrera se arregla observando el dato, no esperando**: `onSnapshot` de `usuarios/{uid}` más un aviso explícito "alta en curso" que pone `Signup`. Nada de `setTimeout`.
- **Cargar las claves al arrancar** (§4, arranque en frío) queda para la sesión AWS: hoy no hay Lambda que medir.

## Review Focus

1. **Cuenta huérfana** (Auth sin documento `usuarios`, posible desde el 20-ago): debe ver "Tu cuenta no está configurada", **no** quedarse en "Preparando…" para siempre. → test en Task 5.
2. **El token caduca mientras la pestaña está abierta** (1 h): la primera petición da 401 y el reintento con token nuevo debe funcionar sin que la persona note nada. → test en Task 3.
3. **Cerrar sesión y entrar con otra cuenta**: el `perfil` del primero no puede quedar visible ni un instante (se cancela la suscripción). → test en Task 4.
4. **Preflight CORS con `Authorization`**: el navegador manda `OPTIONS` sin token; debe recibir permiso, no 401. → test en Task 1.
5. **Backend sin `FIREBASE_PROJECT_ID`**: no arranca, en vez de aceptar cualquier `aud`. → test en Task 1.

---

### Task 1: Spring Security verifica el JWT de Firebase

**Files:**
- Modify: `backend/pom.xml` (añadir `spring-boot-starter-oauth2-resource-server` y, en test, `spring-security-test`)
- Create: `backend/src/main/java/es/cookyourweb/points/config/SeguridadConfig.java`
- Create: `backend/src/main/java/es/cookyourweb/points/config/TokenFirebase.java`
- Modify: `backend/src/main/java/es/cookyourweb/points/config/CorsConfig.java` (`allowedHeaders("Content-Type", "Authorization")`)
- Modify: `backend/src/main/resources/application.properties` (`app.firebase.project-id=${FIREBASE_PROJECT_ID}`)
- Modify: `backend/src/test/java/es/cookyourweb/points/web/CorsTest.java`
- Test: `backend/src/test/java/es/cookyourweb/points/config/TokenFirebaseTest.java`
- Modify: `docs/LEVANTAR-EN-LOCAL.md` (la API necesita `FIREBASE_PROJECT_ID`)

**Interfaces:**
- Produces: `TokenFirebase.validador(String proyecto): OAuth2TokenValidator<Jwt>` (timestamp + `iss` + `aud` + `sub` no vacío); `TokenFirebase.JWKS_URL` (constante: verificá la URL exacta con context7 o la doc de Firebase "Verify ID tokens using a third-party JWT library" antes de fijarla); bean `JwtDecoder` construido con `NimbusJwtDecoder.withJwkSetUri(JWKS_URL).jwsAlgorithm(SignatureAlgorithm.RS256)` + `setJwtValidator(validador(proyecto))`.
- Seguridad: `OPTIONS /**` y `/actuator/health` permitidos; `/api/**` autenticado; resto denegado; `STATELESS`; CSRF desactivado; `http.cors(withDefaults())` usando `CorsConfig`.

- [ ] **Step 1: Tests que fallan** en `TokenFirebaseTest` (genera un par RSA en el test; decoder de prueba = `NimbusJwtDecoder.withPublicKey(clavePublica).signatureAlgorithm(RS256)` + `setJwtValidator(TokenFirebase.validador("proyecto-test"))`):
  - `tokenValidoPasa`: firmado con la clave, `iss=https://securetoken.google.com/proyecto-test`, `aud=proyecto-test`, `sub=uid-1`, `exp` futuro → `decode(...).getSubject()` es `"uid-1"`.
  - `otraClaveFalla`: firmado con otro par RSA → `JwtException`.
  - `caducadoFalla`: `exp` hace 2 horas → `JwtException`.
  - `otroProyectoFalla`: `aud=otro-proyecto` (iss correcto) → `JwtException`; e `iss` de otro proyecto → `JwtException`.
  - `algNoneFalla`: token sin firmar con cabecera `{"alg":"none"}` → `JwtException`.
  - `subVacioFalla`: `sub=""` → `JwtException`.
- [ ] **Step 2:** `cd backend && ./mvnw test -Dtest=TokenFirebaseTest` → falla por aserción / clase sin lógica.
- [ ] **Step 3:** implementar `TokenFirebase` y `SeguridadConfig`; CORS con `Authorization`; propiedad sin default.
- [ ] **Step 4: Tests de la cadena** en `CorsTest` (y lo que haga falta en `PointsApiApplicationTests` para que el contexto arranque: `@TestPropertySource(properties = "app.firebase.project-id=proyecto-test")` o `FIREBASE_PROJECT_ID` en el perfil de test, y `@MockitoBean JwtDecoder` donde no se pruebe la firma):
  - `preflightConAuthorizationPermitida`: `OPTIONS /api/tasks` con `Access-Control-Request-Headers: authorization` → 200 y `Access-Control-Allow-Headers` contiene `authorization` (sin token).
  - `peticionSinTokenDa401`: `GET /api/tasks?familyId=f` sin token → 401.
  - `peticionRealLlevaLaCabecera` existente: ahora con `.with(jwt())` → 200.
  - `sinProyectoNoArranca`: `ApplicationContextRunner` (o `SpringApplicationBuilder` en un test) sin la propiedad → el contexto falla.
- [ ] **Step 5:** `./mvnw test` → todo verde (incluidos los 11 tests previos).
- [ ] **Step 6: Commit** `fix(api): la API verifica el token de Firebase porque hasta ahora cualquiera podia llamarla sin identificarse`

### Task 2: `GET /api/me` devuelve quién eres

**Files:**
- Create: `backend/src/main/java/es/cookyourweb/points/identidad/YoController.java`
- Create: `backend/src/main/java/es/cookyourweb/points/identidad/Yo.java` (record)
- Test: `backend/src/test/java/es/cookyourweb/points/identidad/YoControllerTest.java`

**Interfaces:**
- Consumes: la cadena de seguridad de Task 1.
- Produces: `GET /api/me` → `200 {"uid": sub, "email": claim email, "emailVerificado": claim email_verified, "proveedor": claim firebase.sign_in_provider}` (campos null se omiten por la config de Jackson). `record Yo(String uid, String email, Boolean emailVerificado, String proveedor)`.

- [ ] **Step 1: Tests que fallan** (`@WebMvcTest(YoController.class)` + import de `SeguridadConfig`, `@MockitoBean JwtDecoder`):
  - `sinTokenDa401`: `GET /api/me` → 401.
  - `conTokenDevuelveElUid`: `.with(jwt().jwt(j -> j.subject("uid-1").claim("email","a@b.c").claim("email_verified", true).claim("firebase", Map.of("sign_in_provider","password"))))` → 200, `$.uid == "uid-1"`, `$.email == "a@b.c"`, `$.emailVerificado == true`, `$.proveedor == "password"`.
  - `cuentaAnonimaSinEmail`: `sub=uid-2`, `firebase.sign_in_provider=anonymous`, sin email → 200, `$.uid == "uid-2"`, `$.email` no existe.
- [ ] **Step 2:** `./mvnw test -Dtest=YoControllerTest` → falla (404 o clase ausente por aserción).
- [ ] **Step 3:** implementar con `@AuthenticationPrincipal Jwt`.
- [ ] **Step 4:** `./mvnw test` → verde.
- [ ] **Step 5: Commit** `feat(api): GET /api/me devuelve el uid del token para que el frontend sepa a quien reconoce el servidor`

### Task 3: `apiFetch` pone el token en cada petición

**Files:**
- Create: `src/services/http.ts`
- Create: `src/services/identidadService.ts`
- Modify: `src/services/customTaskService.ts` (su `peticion` delega en `apiFetch`; `errorDesde` se mueve a `http.ts`)
- Test: `src/__tests__/http.test.ts`, `src/__tests__/identidadService.test.ts`
- Modify: `src/__tests__/arquitectura.test.ts` (test nuevo `fetchSoloEnHttp`: ningún fichero de `src/` fuera de `src/services/http.ts` y de `src/__tests__/` contiene `fetch(`; sin lista de excepciones, porque hoy solo lo usa `customTaskService.ts`)

**Interfaces:**
- Produces: `class ErrorHttp extends Error { status: number }`; `apiFetch<T>(ruta: string, opciones?: RequestInit): Promise<T>` (base `import.meta.env.VITE_API_URL ?? 'http://localhost:8080'`, cabeceras `Content-Type: application/json` y `Authorization: Bearer <token>` si hay `auth.currentUser`, 204 → `undefined`, error → `ErrorHttp` con el `detail`/`title` del problem+json o el texto); `type Yo = { uid: string; email?: string; emailVerificado?: boolean; proveedor?: string }`; `getYo(): Promise<Yo>` (= `apiFetch<Yo>('/api/me')`).

- [ ] **Step 1: Tests que fallan** (mock de `../firebase` con `auth.currentUser.getIdToken` como `vi.fn`, `globalThis.fetch = vi.fn()`):
  - `ponElToken`: `getIdToken` → `"tok-1"`; `fetch` recibe `Authorization: "Bearer tok-1"`.
  - `sinSesionNoMandaAuthorization`: `auth.currentUser = null` → sin cabecera `Authorization`.
  - `reintentaUnaVezCon401` (Review Focus 2): primera respuesta 401, segunda 200 → `getIdToken` llamado con `true` la segunda vez, `fetch` 2 veces, devuelve el cuerpo.
  - `noReintentaDosVeces`: 401 y 401 → rechaza con `ErrorHttp` `status === 401`; `fetch` exactamente 2 veces.
  - `errorConTipo`: 404 con `{"detail":"no existe"}` → `ErrorHttp` con `status 404` y `message "no existe"`.
  - `204SinCuerpo`: → `undefined`.
  - `getYo` pide `GET /api/me` y devuelve el JSON.
  - Los tests existentes de `customTaskService` siguen verdes sin cambiar sus aserciones.
- [ ] **Step 2:** `npx vitest run src/__tests__/http.test.ts src/__tests__/identidadService.test.ts` → fallan por aserción.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `npx vitest run` + `npm run lint` + `npm run typecheck` → verde.
- [ ] **Step 5: Commit** `feat(servicios): apiFetch manda el token de Firebase porque la API ya no acepta peticiones anonimas`

### Task 4: un solo `AuthProvider` con perfil en vivo

**Files:**
- Create: `src/auth/AuthProvider.tsx`, `src/auth/useSesion.ts`
- Modify: `src/services/usersService.ts` (añadir `observarPerfil`)
- Modify: `src/hooks/useAuth.ts` (pasa a leer del contexto; mantiene su API `{ user, loading, logout }` para no tocar los 4 componentes que lo usan)
- Modify: `src/main.tsx` (envolver `<App />` con `<AuthProvider>`)
- Test: `src/__tests__/AuthProvider.test.tsx`; ajustar `src/__tests__/useAuth.test.tsx`

**Interfaces:**
- Produces:
  - `type Perfil = { nombre: string; rol: string; familyId: string }`
  - `type EstadoPerfil = { tipo: 'cargando' } | { tipo: 'sin-documento' } | { tipo: 'listo'; perfil: Perfil }`
  - `type Sesion = { tipo: 'cargando' } | { tipo: 'anonimo' } | { tipo: 'autenticado'; user: User; perfil: EstadoPerfil; altaEnCurso: boolean }`
  - `useSesion(): Sesion & { iniciarAlta(): void; terminarAlta(): void; cerrarSesion(): Promise<void> }`
  - `observarPerfil(uid: string, alCambiar: (e: EstadoPerfil) => void): () => void` en `usersService.ts` (usa `onSnapshot` de `usuarios/{uid}`; documento inexistente → `sin-documento`).

- [ ] **Step 1: Tests que fallan** (mock de `firebase/auth` `onAuthStateChanged` y de `observarPerfil`):
  - `empiezaCargando` → `tipo === 'cargando'`.
  - `sinUsuarioEsAnonimo`.
  - `conUsuarioEsAutenticadoConPerfilCargando`, y al emitir `observarPerfil` `listo` → `perfil.tipo === 'listo'` con su `familyId`.
  - `elPerfilLlegaDespuesDelAlta`: emite `sin-documento` y luego `listo` → termina en `listo` (la carrera, resuelta por el dato).
  - `cambiarDeCuentaCancelaLaSuscripcion` (Review Focus 3): usuario A → usuario B → la función de baja de A se llamó y el perfil vuelve a `cargando` antes de mostrar el de B.
  - `iniciarAlta` / `terminarAlta` cambian `altaEnCurso`.
- [ ] **Step 2:** `npx vitest run src/__tests__/AuthProvider.test.tsx` → falla por aserción.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `npx vitest run` + lint + typecheck → verde.
- [ ] **Step 5: Commit** `feat(auth): un solo AuthProvider observa la sesion y el perfil en vivo para que el panel no lea un usuario que aun no existe`

### Task 5: el alta y el panel usan la sesión

**Files:**
- Modify: `src/App.tsx` (`useSesion` en vez de `useAuthState`)
- Modify: `src/components/auth/Signup.tsx` (`iniciarAlta()` antes de `createUserWithEmailAndPassword`, `terminarAlta()` en `finally`)
- Modify: `src/components/dashboard/Dashboard.tsx` (la familia sale de `sesion.perfil`; se elimina `fetchFamilyId` y su `getDoc` de `usuarios`, `:69-97`)
- Test: `src/__tests__/App.test.tsx` (ajustar mocks), `src/__tests__/Dashboard.sesion.test.tsx`

**Interfaces:**
- Consumes: `useSesion()` de Task 4.

- [ ] **Step 1: Tests que fallan** (`useSesion` mockeado):
  - `altaEnCursoMuestraPreparando`: `perfil sin-documento` + `altaEnCurso true` → texto "Preparando tu cuenta…", **no** aparece "No se encontró".
  - `huerfanaMuestraNoConfigurada` (Review Focus 1): `sin-documento` + `altaEnCurso false` → "Tu cuenta no está configurada".
  - `perfilListoCargaLaFamilia`: `listo` con `familyId "f1"` → el panel pide los hijos de `"f1"` (mock del servicio de hijos llamado con `"f1"`).
  - `App`: sesión `cargando` → "Cargando aplicación..."; `anonimo` en `/faqs` → pantalla de entrada (los dos tests que ya existen, adaptados).
- [ ] **Step 2:** fallan por aserción.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** verificación completa: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run test:rules`, `cd backend && ./mvnw test`.
- [ ] **Step 5: Commit** `fix(alta): el panel espera al perfil en vivo y ya no muestra un error al registrarse`

### Task 6: prueba manual de punta a punta (la hace la dueña con el controlador)

- [ ] Mongo arriba, backend con `FIREBASE_PROJECT_ID` exportado en su terminal, `npm run dev`.
- [ ] `curl -i http://localhost:8080/api/me` → **401** (demo de la sesión).
- [ ] Registrar una cuenta nueva → el panel muestra "Preparando tu cuenta…" un instante y carga, **sin** el error de antes.
- [ ] Pestaña de tareas personalizadas carga (prueba que el token viaja y el servidor lo acepta).
- [ ] Actualizar `MEMORY.md`, `docs/APRENDER-ARQUITECTURA.md` (JWT, JWKS, `iss`/`aud`, resource server, por qué `alg=none` es un ataque) y el log de sesiones.
