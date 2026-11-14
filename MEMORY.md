# MEMORY.md — teenage-points-system

> ≤50 líneas, sin claves ni datos personales (repo público). Log completo:
> `memoria/index.html` + `memoria/sesiones-teenage-points.json`.

## Estado actual

- `develop`: sesión 2 en local (`a5d1f59`, sin push). 💚 **338/338 tests** + **26/26 reglas** + **32 backend** (lint/typecheck 0).
- **Reglas de Firestore desplegadas 14-nov** (producción == `firestore.rules`, verificado): alta limitada (nadie se hace admin ni entra en familia ajena), `categorias` pide sesión (HTTP 403 sin ella), `privileges` por familia y `privilegeHistory` append-only. Diseño y orden S0-S6: `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` §8.
- Backend: `./mvnw test` verde sin Mongo (11 tests); la traza `ConnectException` del log es ruido, no fallo.
- Plan coach: traspaso en `.opencode/plan/sesion-2026-10-17-coach-acuerdos.md` (**gitignored**: lleva contenido del método).
- Iteración 0: ✅ `NOTICE.md` (`0b85f1f`); ⏳ limpieza de `categorias`. Iteración 1 empezada: ✅ `src/utils/perfilPadre.ts` + test (`d3b6fa4`, `aa27b1b`).
- Riesgo declarado: `ChildView`/`RewardTracker`/`TaskManagement` sin tests propios.

## Decisiones y por qué

- **AGENTS.md en dos piezas**: OpenCode carga lo anidado solo al tocar esa carpeta.
- **`ci.yml` completo, sin atajos**: sin `--passWithNoTests` ni `continue-on-error`.
- **`MEMORY.md` lleva el resumen; el log completo vive en `memoria/index.html`**: una sola verdad por cosa.
- **Coach**: modelo aditivo (no lo hace → no gana, jamás pierde); acuerdos padre-hijo; **nivel de confianza NUNCA baja**; `Task.java` intocable (el acuerdo crea la tarea por el POST existente); proveedor **Claude**; el nivel sube por **acuerdo mutuo** con datos que solo informan, no deciden.
- **Derechos**: el método **Efera** (Error-Foco-Estrategia-Rol-Acción) y los 5 colores son de **Vicent Ginés Romero**; licencia de alumna = uso personal, no comercializable → el método vive en **Firestore, nunca en el repo** (ni en planes versionados). Los **5 colores ya están** en `child.tiposAdolescente` (`AddEditChild.tsx:152`).
- **AWS** (`docs/AWS-JUSTIFICACION.md`): solo **Always Free o céntimos** (sin créditos ni free plan); API en Docker→ECR→**Lambda con imagen** (ECS 24/7 rompe los 5 €); datos de Firestore `weeklyTasks` con IDs seudonimizados.

## Ojo — errores ya pagados (no repites)

- `tsc --noEmit` a secas = **no-op** → solo `npm run typecheck`.
- El backend arranca con Mongo caído y no se reconecta: levantar Mongo después = reiniciar backend.
- **`categorias` ya NO se lee sin sesión** (reglas 14-nov): el REST con la key de `.env` da 403. Contenido sucio (duplicados/typos): limpiar antes de dárselo al LLM.
- **Leer las reglas desplegadas**: la consola pide MFA (pendiente de la dueña); la CLI `firebase` logueada sí lee por la API de Rules (solo lectura).
- **La API exige `FIREBASE_PROJECT_ID`** en su terminal (sin default; vacía no arranca). Errores de Spring tras `denyAll` → hay que permitir el despacho ERROR (si no, todo sale 403); MockMvc no lo ve, test con RANDOM_PORT.
- **Este archivo envejece**: si un commit cambia el estado y no toca `MEMORY.md`, el próximo agente arranca con datos falsos (19-oct propuso rehacer `NOTICE.md`). Contrastar con `git log` antes de proponer.

## Próximos pasos

1. **Sesión 3 (propiedad)**: `Membresia` + `requireMember` en `task/` (hoy cualquier cuenta lee tareas de otra familia por la API). Sesión 2 ✅ (14-nov, probada en local: 401 sin token, 200 con token, alta sin error). Límites: `/child-view` sin sesión ya no ve tareas personalizadas (se retira en S6); `useUserRole` sigue en 4 componentes. Abiertos: `redeemPrivilege` no se llama desde la UI (los canjes no se registran); privilegios viejos sin `familyId` ya no se ven.
2. AWS fase 1 ⏳: cuenta propia **Ready Set Build** (plan gratuito, 0 $, eu-north-1; `hello.cookyourweb` es miembro invitado, NO usuario IAM). AWS CLI instalado. **Bloqueado** hasta que AWS verifique la cuenta (≤2 días): después `aws login` (elegir la sesión existente) y CloudShell. Pendientes de la dueña: MFA, correo de recuperación y teléfono. **Nunca** "Plan de actualización". Detalle: engram `aws/cuenta-elegida`.
3. CI avisa deprecaciones: `actions/setup-java@v4`→v5 y acciones en Node 20; login sin `h1` y título "Vite + React + TS"; pantallas autenticadas sin auditar (falta usuario de prueba).
4. Plan coach: limpieza de `categorias` (con OK de la dueña) y seguir iteración 1 (perfil del padre: cuestionario + guardado).
5. Migrar dominios restantes a Java (`docs/MIGRACION-A-JAVA.md`) y rol admin (`docs/PENDIENTES-ADMIN.md`).

## Sesiones

| Fecha | Tema | Min |
|---|---|---|
| 2026-11-14 | Sesión 1 reglas: desplegadas, privilegios arreglados, carrera del alta | 180 |
| 2026-11-13 | AWS fase 1: plan gratuito, CLI; esperando la verificación | 104 |
| 2026-11-12 | Push con CI verde, hook salvavidas arreglado, cuenta AWS propia | 37 |
| 2026-11-11 | /doctor, 12 puntos de tu-vuelta-al-sol, traza del hook | 67 |

**Total: 9 sesiones · 1089 min** (la tabla muestra las 4 últimas; la cuenta verificable: `memoria/sesiones-teenage-points.json`)
