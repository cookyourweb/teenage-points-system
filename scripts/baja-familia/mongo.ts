import { ObjectId, type Db, type Document, type Filter } from 'mongodb'

// Spring Data guarda un `@Id String` como ObjectId cuando el texto es un
// ObjectId valido (24 hex) y como texto si no lo es. Para leer, los dos se
// pasan a string; para borrar, se prueban las dos formas, porque un filtro
// solo con strings no encontraria nunca un ObjectId (y al reves).
const aFiltroDeIds = (ids: string[]) => {
  const candidatos: (string | ObjectId)[] = [...ids]
  for (const id of ids) if (ObjectId.isValid(id) && id.length === 24) candidatos.push(new ObjectId(id))
  return { _id: { $in: candidatos } } as Filter<Document>
}

// Ids de los documentos de la familia en una coleccion de Mongo.
export async function idsPorFamilia(db: Db, coleccion: string, familyId: string): Promise<string[]> {
  const docs = await db.collection(coleccion).find({ familyId }, { projection: { _id: 1 } }).toArray()
  return docs.map((d) => String(d._id))
}

// uid de las cuentas que tienen membresia en una familia DISTINTA de la dada:
// esas cuentas no se pueden dar de baja con esta familia.
export async function uidsConOtraFamilia(db: Db, uids: string[], familyId: string): Promise<Set<string>> {
  if (uids.length === 0) return new Set()
  const docs = await db
    .collection('membresias')
    .find({ uid: { $in: uids }, familyId: { $ne: familyId } }, { projection: { uid: 1 } })
    .toArray()
  return new Set(docs.map((d) => String(d.uid)))
}

const LOTE = 1000

// Borra por _id en lotes y devuelve cuantos documentos borro de verdad
// (deletedCount): un reintento sobre lo ya borrado da 0.
export async function borrarPorIds(db: Db, coleccion: string, ids: string[]): Promise<number> {
  let borrados = 0
  for (let i = 0; i < ids.length; i += LOTE) {
    const r = await db.collection(coleccion).deleteMany(aFiltroDeIds(ids.slice(i, i + LOTE)))
    borrados += r.deletedCount
  }
  return borrados
}
