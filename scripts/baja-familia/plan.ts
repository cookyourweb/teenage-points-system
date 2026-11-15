import { FamiliaNoEncontrada, type Inventario, type Paso, type PlanBaja } from './tipos'

// Quita repetidos conservando el orden de aparicion: un mismo documento
// puede llegar por dos vias (p. ej. un canje con familyId Y con childId de
// un hijo de F) y borrarlo dos veces seria ruido en el resumen.
const unicos = (ids: string[]): string[] => [...new Set(ids)]

// Decide QUE se borra y en QUE orden, sin tocar la red.
//
// El orden importa porque el script debe poder reanudarse tras un fallo:
//  1. Mongo y datos de Firestore primero (lo mas facil de repetir).
//  2. `usuarios` y `familias` despues: mientras existan, una nueva
//     ejecucion aun puede encontrar a la familia y a sus hijos.
//  3. Auth al final: borrar una cuenta es irreversible y, sin `familias`,
//     ya no se podria recalcular que cuentas eran de esta familia.
//
// Nunca se planifica nada sobre el catalogo comun (`tareas`, `recompensas`,
// `categorias`): es de todas las familias, no de esta.
export function planificarBaja(inv: Inventario): PlanBaja {
  if (inv.familia === null) throw new FamiliaNoEncontrada(inv.familyId)

  // Un adulto que tambien esta en otra familia conserva su cuenta y su
  // `usuarios`: borrarlos dejaria a esa otra familia sin su padre/madre.
  const propios = inv.familia.adultos.filter((a) => !a.enOtraFamilia).map((a) => a.uid)
  const conservados = new Set(inv.familia.adultos.filter((a) => a.enOtraFamilia).map((a) => a.uid))

  // childPoints se identifica por el prefijo `F_` del id; si un adaptador
  // devolviera otro id, mejor no borrarlo que borrar datos de otra familia.
  const prefijo = `${inv.familyId}_`

  const f = inv.firestore
  const pasos: Paso[] = [
    { fuente: 'mongo', coleccion: 'tasks', ids: unicos(inv.mongo.tasks) },
    { fuente: 'mongo', coleccion: 'membresias', ids: unicos(inv.mongo.membresias) },
    { fuente: 'firestore', coleccion: 'weeklyTasks', ids: unicos(f.weeklyTasks) },
    { fuente: 'firestore', coleccion: 'privileges', ids: unicos(f.privileges) },
    {
      fuente: 'firestore',
      coleccion: 'privilegeHistory',
      ids: unicos([...f.privilegeHistory, ...f.privilegeHistoryPorHijo]),
    },
    { fuente: 'firestore', coleccion: 'invitaciones', ids: unicos(f.invitaciones) },
    {
      fuente: 'firestore',
      coleccion: 'childPoints',
      ids: unicos(f.childPoints.filter((id) => id.startsWith(prefijo))),
    },
    { fuente: 'firestore', coleccion: 'tasks', ids: unicos(f.tasks) },
    {
      fuente: 'firestore',
      coleccion: 'usuarios',
      ids: unicos([...propios, ...f.usuariosPorFamilia]).filter((id) => !conservados.has(id)),
    },
    { fuente: 'firestore', coleccion: 'familias', ids: [inv.familyId] },
    { fuente: 'auth', coleccion: 'usuarios', ids: unicos(propios) },
  ]

  return { pasos }
}
