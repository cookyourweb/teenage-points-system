import type { Adulto, Inventario, Paso, PlanBaja } from './tipos'
import { COLECCIONES_PERMITIDAS } from './plan'
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import type { Db } from 'mongodb'
import {
  borrarCuentas,
  borrarDocumentos,
  familyIdsDeUsuarios,
  idsChildPoints,
  idsPorFamilyId,
  idsPorHijos,
} from './firebase'
import { borrarPorIds, idsPorFamilia, uidsConOtraFamilia } from './mongo'

export type Fuentes = { firestore: Firestore; auth: Auth; mongo: Db }

// Constancia de lo hecho: sin datos personales, solo la familia, la fecha y
// cuantos documentos se borraron por `fuente.coleccion`.
export type Resumen = { familyId: string; fecha: string; recuentos: Record<string, number> }

// Lee de las tres fuentes SOLO ids y rellena el Inventario de la tarea 1.
// `enOtraFamilia` se calcula para todos los uid de la familia (padres de
// `miembros.padres` y usuarios con familyId == F): tiene membresia en Mongo
// de otra familia, o su `usuarios.familyId` es otro.
export async function leerInventario(familyId: string, { firestore, mongo }: Fuentes): Promise<Inventario> {
  const f = (c: string) => idsPorFamilyId(firestore, c, familyId)

  const familiaDoc = await firestore.collection('familias').doc(familyId).get()
  const usuariosPorFamilia = await f('usuarios')

  let familia: Inventario['familia'] = null
  let hijos: string[] = []
  if (familiaDoc.exists) {
    const miembros = familiaDoc.get('miembros') ?? {}
    hijos = Object.keys(miembros.hijos ?? {})
    familia = { adultos: [], hijos }
    familia.adultos = Object.keys(miembros.padres ?? {}).map((uid) => ({ uid, enOtraFamilia: false }))
  }

  const uids = [...new Set([...(familia?.adultos.map((a) => a.uid) ?? []), ...usuariosPorFamilia])]
  const [membresiaAjena, familyIds] = await Promise.all([
    uidsConOtraFamilia(mongo, uids, familyId),
    familyIdsDeUsuarios(firestore, uids),
  ])
  const enOtra = (uid: string): Adulto => {
    const fid = familyIds.get(uid)
    return { uid, enOtraFamilia: membresiaAjena.has(uid) || (fid !== undefined && fid !== familyId) }
  }
  if (familia) familia.adultos = familia.adultos.map((a) => enOtra(a.uid))

  return {
    familyId,
    familia,
    mongo: {
      tasks: await idsPorFamilia(mongo, 'tasks', familyId),
      membresias: await idsPorFamilia(mongo, 'membresias', familyId),
    },
    firestore: {
      weeklyTasks: await f('weeklyTasks'),
      privileges: await f('privileges'),
      privilegeHistory: await f('privilegeHistory'),
      privilegeHistoryPorHijo: await idsPorHijos(firestore, 'privilegeHistory', hijos, true),
      invitaciones: await f('invitaciones'),
      childPoints: await idsChildPoints(firestore, familyId),
      tasks: await idsPorHijos(firestore, 'tasks', hijos, false),
      usuariosPorFamilia: usuariosPorFamilia.map(enOtra),
    },
  }
}

// Ejecuta los pasos del plan EN ORDEN, sin reordenar (el orden es lo que
// permite reanudar tras un fallo). Antes de borrar nada valida todo el plan
// contra la lista blanca: defensa en profundidad por si un plan mal formado
// llegara a apuntar al catalogo comun.
export async function ejecutar(
  plan: PlanBaja,
  { firestore, auth, mongo }: Fuentes,
  ahora: () => Date = () => new Date(),
  // Aviso opcional tras cada paso terminado: el CLI lo usa para informar que
  // pasos se completaron si algo falla a mitad, sin duplicar esta logica.
  alCompletar?: (paso: Paso, borrados: number) => void,
): Promise<Resumen> {
  for (const paso of plan.pasos) {
    if (!(COLECCIONES_PERMITIDAS[paso.fuente] as readonly string[] | undefined)?.includes(paso.coleccion)) {
      throw new Error(`Coleccion no permitida, no se borra nada: ${paso.fuente}/${paso.coleccion}`)
    }
  }

  const recuentos: Record<string, number> = {}
  for (const paso of plan.pasos) {
    const clave = `${paso.fuente}.${paso.coleccion}`
    const borrados =
      paso.fuente === 'mongo'
        ? await borrarPorIds(mongo, paso.coleccion, paso.ids, plan.familyId)
        : paso.fuente === 'auth'
          ? await borrarCuentas(auth, paso.ids)
          : await borrarDocumentos(firestore, paso.coleccion, paso.ids)
    recuentos[clave] = borrados
    alCompletar?.(paso, borrados)
  }

  return { familyId: plan.familyId, fecha: ahora().toISOString(), recuentos }
}
