# Baja de una familia (RGPD)

Script de administración que borra **todos los datos de una familia** en
MongoDB, Firestore y Firebase Auth. Lo ejecuta la dueña del proyecto en su
máquina; no forma parte de la app.

## Cuándo usarlo

Cuando una familia pide la baja. El RGPD obliga a borrar sus datos en un plazo
de **un mes** desde la solicitud: anotá la fecha de la petición.

## Antes de empezar

1. Credenciales: el script usa *Application Default Credentials*, **sin fichero
   de clave**. Una sola vez (lo hace la dueña, con su cuenta de Google):
   `gcloud auth application-default login`
2. Variables de entorno (obligatorias, no hay valores por defecto):
   - `FIREBASE_PROJECT_ID`: el proyecto de Firebase.
   - `MONGODB_URI`: la URI de Mongo (con la base de datos incluida).

   Si apuntan a un emulador se respetan `FIRESTORE_EMULATOR_HOST` y
   `FIREBASE_AUTH_EMULATOR_HOST`.

## Uso

```bash
# 1. ENSAYO (por defecto): lista cuántos documentos borraría, no borra nada
npm run baja:familia -- --familia <idDeLaFamilia>

# 2. Revisá los recuentos y, solo si son los esperados, borrá de verdad
npm run baja:familia -- --familia <idDeLaFamilia> --confirmar
```

Salida del ensayo (solo recuentos; nunca emails, nombres ni uid):

```
mongo/tasks: 2
firestore/childPoints: 1
...
ENSAYO: no se ha borrado nada. Repite con --confirmar para borrar.
```

Con `--confirmar` el script muestra el proyecto y la familia a los que apunta
(si el proyecto no empieza por `demo-` y no hay emulador, avisa de que es
**producción**), borra y termina con una constancia.

Códigos de salida: `0` bien, `1` familia inexistente o fallo, `2` uso
incorrecto o faltan variables.

## Errores y depuración

Por defecto los errores solo muestran su nombre y `code`, porque el mensaje de
los SDK puede incluir uid, emails o hosts. Para ver el detalle completo,
ejecutá con `DEBUG_BAJA=1` (cuidado: no pegues esa salida en sitios públicos).

## Constancia

Al terminar imprime fecha, `familyId` y recuentos por colección, sin datos
personales. **Guardala fuera del repo** (el repo es público) como prueba de
que se cumplió el plazo.

## Qué borra (y en qué orden)

1. Mongo: `tasks`, `membresias` de la familia.
2. Firestore: `weeklyTasks`, `privileges`, `privilegeHistory` (también los
   canjes antiguos sin `familyId`, hallados por los hijos), `invitaciones`,
   `childPoints` (ids `<familia>_...`) y `tasks` de los hijos.
3. Firebase Auth: las cuentas de los adultos de la familia.
4. Firestore `usuarios` de esas cuentas.
5. Firestore `familias/<id>`, **el último**: es el ancla para reanudar.

Un adulto que también pertenece a **otra** familia conserva su cuenta de Auth y
su documento de `usuarios`.

## Qué NO borra

El **catálogo común** (`tareas`, `recompensas`, `categorias`), que es de todas
las familias. El script se niega a tocar cualquier colección fuera de su lista
blanca (`COLECCIONES_PERMITIDAS` en `scripts/baja-familia/plan.ts`).

## Si falla a mitad

Informa qué pasos se completaron y sale con código distinto de 0. **Volvé a
ejecutar el mismo comando**: es idempotente y termina lo que falte (gracias al
orden, `familias` sigue existiendo hasta el final).
