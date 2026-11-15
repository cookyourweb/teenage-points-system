import type { Auth } from 'firebase-admin/auth'
import { FieldPath, type Firestore, type Query } from 'firebase-admin/firestore'

// Limites de la API: 500 operaciones por lote de Firestore, 30 valores en un
// `in`, 100 uid por getUsers y 1000 por deleteUsers.
const LOTE_FIRESTORE = 500
const MAX_IN = 30
const LOTE_GET_USERS = 100
const LOTE_DELETE_USERS = 1000

const trozos = <T>(xs: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}

// `select()` sin campos: solo necesitamos los ids, no los datos personales.
const ids = async (q: Query): Promise<string[]> => (await q.select().get()).docs.map((d) => d.id)

export const idsPorFamilyId = (db: Firestore, coleccion: string, familyId: string) =>
  ids(db.collection(coleccion).where('familyId', '==', familyId))

// Documentos de `coleccion` cuyo campo `childId` esta en `hijos`. `soloSinFamilyId`
// se queda con los que NO tienen familyId (canjes antiguos): los que si lo
// tienen ya llegan por familyId, y uno con OTRA familyId no es nuestro.
export async function idsPorHijos(
  db: Firestore,
  coleccion: string,
  hijos: string[],
  soloSinFamilyId: boolean,
): Promise<string[]> {
  const out: string[] = []
  for (const grupo of trozos(hijos, MAX_IN)) {
    const snap = await db.collection(coleccion).where('childId', 'in', grupo).select('familyId').get()
    for (const d of snap.docs) if (!soloSinFamilyId || d.get('familyId') === undefined) out.push(d.id)
  }
  return out
}

// childPoints tiene id `${familyId}_${childId}`: rango de ids [F_, F`) donde
// '`' es el caracter siguiente a '_'.
export const idsChildPoints = (db: Firestore, familyId: string) =>
  ids(
    db
      .collection('childPoints')
      .where(FieldPath.documentId(), '>=', `${familyId}_`)
      .where(FieldPath.documentId(), '<', `${familyId}\``),
  )

// familyId de cada usuario existente; los que no tienen doc se omiten.
export async function familyIdsDeUsuarios(db: Firestore, uids: string[]): Promise<Map<string, string | undefined>> {
  const out = new Map<string, string | undefined>()
  for (const grupo of trozos(uids, LOTE_FIRESTORE)) {
    const docs = await db.getAll(...grupo.map((u) => db.collection('usuarios').doc(u)), { fieldMask: ['familyId'] })
    for (const d of docs) if (d.exists) out.set(d.id, d.get('familyId'))
  }
  return out
}

// Borra en lotes de <= 500 y devuelve cuantos documentos existian: comprobar
// antes de borrar es lo que hace que un reintento informe 0 en vez de repetir
// el recuento (borrar un doc inexistente "funciona" en Firestore).
export async function borrarDocumentos(db: Firestore, coleccion: string, idsABorrar: string[]): Promise<number> {
  let borrados = 0
  for (const grupo of trozos(idsABorrar, LOTE_FIRESTORE)) {
    const refs = grupo.map((id) => db.collection(coleccion).doc(id))
    const existentes = (await db.getAll(...refs, { fieldMask: [] })).filter((d) => d.exists)
    if (existentes.length === 0) continue
    const lote = db.batch()
    for (const d of existentes) lote.delete(d.ref)
    await lote.commit()
    borrados += existentes.length
  }
  return borrados
}

// Un uid sin cuenta (p. ej. un hijo que solo tiene doc en `usuarios`) no es un
// error: el objetivo, que la cuenta no exista, ya esta cumplido.
const esNoExiste = (code: unknown) => code === 'auth/user-not-found'

// Borra cuentas de Auth y devuelve cuantas existian y se borraron. Cualquier
// fallo que no sea "no existe" corta la baja con un error.
export async function borrarCuentas(auth: Auth, uids: string[]): Promise<number> {
  const existentes: string[] = []
  for (const grupo of trozos(uids, LOTE_GET_USERS)) {
    const { users } = await auth.getUsers(grupo.map((uid) => ({ uid })))
    existentes.push(...users.map((u) => u.uid))
  }
  let borradas = 0
  for (const grupo of trozos(existentes, LOTE_DELETE_USERS)) {
    const r = await auth.deleteUsers(grupo)
    const fallos = r.errors.filter((e) => !esNoExiste((e.error as { code?: unknown }).code))
    if (fallos.length > 0) {
      const detalle = fallos.map((e) => `${grupo[e.index]}: ${e.error.code}`).join(', ')
      throw new Error(`No se pudieron borrar ${fallos.length} cuentas de Auth: ${detalle}`)
    }
    borradas += grupo.length - r.errors.length
  }
  return borradas
}
