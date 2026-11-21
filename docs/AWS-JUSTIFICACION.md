# Por qué esta app necesita AWS y una capa de datos

> Fase 0 del trabajo en AWS. Aquí no se crea nada en AWS: solo se mide el hueco
> del producto que justifica todo lo demás. Medido el 10-nov-2026 sobre `develop`.

## El hueco: el histórico existe y nadie lo lee

Cada semana, por cada hijo, se guarda un documento nuevo en Firestore:
`weeklyTasks/{familyId}_{childId}_{weekId}` (`src/services/familyService.ts:168`).

Pero **todas** las lecturas piden solo la semana en curso:

| Lectura | Dónde | Qué semana |
|---|---|---|
| `getWeeklyTasks` | `familyService.ts:198` | `getCurrentWeekId()` |
| `subscribeToWeeklyTasks` | `familyService.ts:311` | `getCurrentWeekId()` |
| resumen `childPoints` | `familyService.ts:269` | se **pisa** cada semana (`merge`) |

Comprobado con `rg 'weeklyTasks|getWeeklyTasks|weekId' src`: ningún componente
lee una semana pasada. El padre no puede ver si su hijo mejora, qué tareas
cuestan más ni cuándo se rompe la racha.

## La necesidad de producto: "Evolución"

Un panel con cuatro indicadores por hijo y semana:

1. Tareas completadas por semana.
2. Puntos por hijo.
3. Racha de semanas cumpliendo.
4. Tasa de cumplimiento (completadas / asignadas).

## Por qué AWS para eso

| Necesidad | Servicio | Por qué |
|---|---|---|
| Sacar el histórico de la base operativa | Lambda + EventBridge (diario) → S3 | La analítica no carga Firestore ni la app (separar OLTP de analítica) |
| Consultar con SQL | Glue + Athena | SQL sobre S3, sin servidor, se paga por consulta (céntimos) |
| Mostrarlo | Endpoint de KPIs + panel Angular aparte | El panel es de análisis; la app principal sigue en React |
| Desplegar la API | Docker → ECR → ECS/EC2, OIDC, Secrets Manager | Sin claves largas ni secretos en el código |

Orden elegido: **primero los datos**, después el despliegue de la API. Es lo que
justifica AWS y no depende de migrar nada.

## Decisiones

- **La fuente es Firestore `weeklyTasks`, no Mongo**: los puntos viven ahí. Migrar
  `weeklyTasks` a Mongo antes (`docs/MIGRACION-A-JAVA.md`) retrasaría el panel.
- **Datos de menores (RGPD)**: a S3/Athena solo llegan IDs seudonimizados (hash),
  nunca nombres. Lo que no hace falta para un KPI no sale de la base operativa.
- **El contenido del método (`categorias`) queda fuera** de la analítica.
- **Límites**: 5 €/mes con alertas al 80 % y al 100 %, región de la UE. En el repo
  no van IDs de cuenta, ARNs completos ni claves.

## Encontrado de paso (fuera de este alcance)

`getFamilyChildrenPoints` y `subscribeToFamilyPoints` (`familyService.ts:289`,
`:328`) bajan **toda** la colección `childPoints` y filtran por familia en el
navegador. Cada familia descarga los puntos de las demás. Queda pendiente.

## En 60 segundos (entrevista)

> *The app stored one document per child per week, but only ever showed the
> current one, so the history was dead data. I built a daily Lambda that exports
> it, pseudonymised, to S3, catalogued it with Glue, defined the KPIs as SQL views
> in Athena, and exposed them to an Angular dashboard. Analytics never touches the
> operational database, and it costs cents per month.*
