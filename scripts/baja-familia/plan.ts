import { FamiliaNoEncontrada, type Fuente, type Inventario, type Paso, type PlanBaja } from './tipos'

// Quita repetidos conservando el orden de aparicion: un mismo documento
// puede llegar por dos vias (p. ej. un canje con familyId Y con childId de
// un hijo de F) y borrarlo dos veces seria ruido en el resumen.
const unicos = (ids: string[]): string[] => [...new Set(ids)]

// Lista blanca de lo unico que el script puede borrar, por fuente. El
// adaptador de la tarea 2 la usa para negarse a tocar cualquier otra
// coleccion (en particular el catalogo comun: tareas, recompensas, categorias).
export const COLECCIONES_PERMITIDAS = {
  mongo: ['tasks', 'membresias'],
  firestore: [
    'weeklyTasks',
    'privileges',
    'privilegeHistory',
    'invitaciones',
    'childPoints',
    'tasks',
    'usuarios',
    'familias',
  ],
  auth: ['usuarios'],
} as const satisfies Record<Fuente, readonly string[]>

// Cuantas cuentas se CONSERVAN por pertenecer a otra familia (solo el recuento,
// nunca los uid: la salida del CLI acaba en un fichero). Un uid que sale como
// padre y como usuario cuenta una vez.
export function contarCuentasConservadas(inv: Inventario): number {
  const cuentas = [...(inv.familia?.adultos ?? []), ...inv.firestore.usuariosPorFamilia]
  return new Set(cuentas.filter((c) => c.enOtraFamilia).map((c) => c.uid)).size
}

// Decide QUE se borra y en QUE orden, sin tocar la red.
//
// El orden importa porque el script debe poder reanudarse tras un fallo:
//  1. Mongo y datos de Firestore primero (lo mas facil de repetir).
//  2. Auth despues, y ANTES de `usuarios` y `familias`: de esos dos
//     documentos se sacan los uid de las cuentas; si cayeran antes, un
//     reintento ya no sabria que cuentas eran de esta familia.
//  3. `usuarios` y por ultimo `familias`: es el ancla. Mientras exista,
//     reejecutar encuentra la familia y termina lo que falte; si se
//     borrara antes que Auth, un fallo entre ambos dejaria cuentas
//     huerfanas para siempre (FamiliaNoEncontrada).
//
// Nunca se planifica nada fuera de COLECCIONES_PERMITIDAS: el catalogo
// comun (`tareas`, `recompensas`, `categorias`) es de todas las familias.
export function planificarBaja(inv: Inventario): PlanBaja {
  if (inv.familia === null) throw new FamiliaNoEncontrada(inv.familyId)

  // Cuentas de la familia: padres de `miembros.padres` mas cualquier uid
  // de `usuarios` con familyId == F. Quien tambien esta en otra familia
  // conserva su cuenta y su `usuarios`: borrarlos dejaria a esa otra
  // familia sin su padre/madre.
  const cuentas = [...inv.familia.adultos, ...inv.firestore.usuariosPorFamilia]
  const conservados = new Set(cuentas.filter((c) => c.enOtraFamilia).map((c) => c.uid))
  const propias = unicos(cuentas.map((c) => c.uid)).filter((uid) => !conservados.has(uid))

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
    { fuente: 'auth', coleccion: 'usuarios', ids: propias },
    { fuente: 'firestore', coleccion: 'usuarios', ids: propias },
    { fuente: 'firestore', coleccion: 'familias', ids: [inv.familyId] },
  ]

  return { pasos }
}
