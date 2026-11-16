# MEMORY.md — teenage-points-system

> ≤50 líneas, sin claves ni datos personales (repo público). Log completo:
> `memoria/index.html` + `memoria/sesiones-teenage-points.json`.

## Estado actual

- `develop`: sesión 4 cerrada y subida (16-nov). 💚 **426 tests front** + **27/27 reglas** + **122 backend** (lint/typecheck 0; los de integración usan Docker).
- **Sesión 4 (colores)**: el hijo es una **mezcla**; `ia/TipoService` (puro) da nada/algo/mucho por color; cada adulto guarda sus colores + principal en Mongo (`eleccionesTipo`, `requireMember`); pantalla en chat guiado. Contenido **[FICTICIO]**: el real sale del curso de Vicent. Plan: `docs/superpowers/plans/2026-11-15-sesion-4-tipo.md`.
- **Reglas de Firestore desplegadas 14-nov** (producción == `firestore.rules`, verificado): alta limitada (nadie se hace admin ni entra en familia ajena), `categorias` pide sesión (HTTP 403 sin ella), `privileges` por familia y `privilegeHistory` append-only. Diseño y orden S0-S6: `docs/superpowers/specs/2026-11-13-arquitectura-front-back-design.md` §8.
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

1. **Contenido real del test de colores** (bloquea el adaptador de Firestore): la dueña recupera el curso de Vicent y escribe las afirmaciones; van en una colección **solo servidor** (NO `categorias`, legible por cualquiera con sesión); **antes** decidir el límite: con 10 peticiones a `POST /api/ia/tipo/perfil` se deduce qué afirmación apunta a qué color. Luego **sesiones 5-6** (IA directa + aceptar, demo) y **sesión 7: coach con LangGraph en Python**, servicio interno detrás de `ModeloPort` (spec §8; lo piden las ofertas). Falta **"¿Olvidaste tu contraseña?"** en el login. Sesiones 2-3 ✅: token verificado, membresías y 404 entre familias. **Script de baja** (`npm run baja:familia`, ensayo por defecto; `docs/BAJA-DE-FAMILIA.md`): falta su ensayo real con `gcloud auth application-default login` sobre una familia de prueba. Cuentas anónimas cerradas en API y reglas (16-nov; falta desplegar reglas y apagar el proveedor en la consola). Deuda: sin revocación de membresías (invitaciones). Límites: `/child-view` sin sesión ya no ve tareas personalizadas (se retira en S6); `useUserRole` sigue en 4 componentes. Abiertos: `redeemPrivilege` no se llama desde la UI (los canjes no se registran); privilegios viejos sin `familyId` ya no se ven.
2. AWS fase 1 ⏳: cuenta propia **Ready Set Build** (plan gratuito, 0 $, eu-north-1; la cuenta de la dueña es miembro invitado, NO usuario IAM). AWS CLI instalado. **Bloqueado** hasta que AWS verifique la cuenta (≤2 días): después `aws login` (elegir la sesión existente) y CloudShell. Pendientes de la dueña: MFA, correo de recuperación y teléfono. **Nunca** "Plan de actualización". Detalle: engram `aws/cuenta-elegida`.
3. CI avisa deprecaciones: `actions/setup-java@v4`→v5 y acciones en Node 20; login sin `h1` y título "Vite + React + TS"; pantallas autenticadas sin auditar (falta usuario de prueba).
4. Plan coach: limpieza de `categorias` (con OK de la dueña) y seguir iteración 1 (perfil del padre: cuestionario + guardado).
5. Migrar dominios restantes a Java (`docs/MIGRACION-A-JAVA.md`) y rol admin (`docs/PENDIENTES-ADMIN.md`).

## Sesiones

| Fecha | Tema | Min |
|---|---|---|
| 2026-11-16 | Sesión 4 cerrada: chat guiado, foco accesible, revisión final | 290 |
| 2026-11-15 | Script de baja (RGPD); sesión 4: perfil de colores | 434 |
| 2026-11-14 | Sesiones 1-3: reglas, token verificado, membresías | 330 |
| 2026-11-13 | AWS fase 1: plan gratuito, CLI; esperando la verificación | 104 |

**Total: 11 sesiones · 1963 min** (la tabla muestra las 4 últimas; la cuenta verificable: `memoria/sesiones-teenage-points.json`)
