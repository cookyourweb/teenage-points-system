// Tipos del script de baja de una familia (RGPD: borrar todos sus datos).
// Son puros: ni red ni SDKs, para que el plan se pueda probar entero.

export type Fuente = 'mongo' | 'firestore' | 'auth'

export type Paso = {
  fuente: Fuente
  coleccion: string
  ids: string[]
}

// `familyId` va explicito en el plan (no se deduce del ancla): lo usan los
// adaptadores para acotar cada borrado a la familia, ademas de los ids.
export type PlanBaja = { familyId: string; pasos: Paso[] }

// Una cuenta (uid) de la familia y si cuelga de OTRA familia. Vale para
// los padres de `miembros.padres` Y para cada uid de `usuarios` con
// familyId == F. La tarea 2 calcula `enOtraFamilia` para todos ellos:
// membresia en Mongo de otra familia, o usuarios.familyId distinto de F.
export type Adulto = {
  uid: string
  enOtraFamilia: boolean
}

// Lo que los adaptadores leen de las fuentes. Todo son ids (strings),
// nunca documentos: el plan no necesita datos personales.
export type Inventario = {
  familyId: string
  // null = el documento familias/F no existe
  familia: {
    adultos: Adulto[]
    // ids de miembros.hijos (el mapa esta indexado por id de hijo). El
    // adaptador los usa para buscar privilegeHistory antiguos (sin familyId)
    // y tasks de Firestore por childId.
    hijos: string[]
  } | null
  mongo: {
    tasks: string[]
    membresias: string[]
  }
  firestore: {
    weeklyTasks: string[]
    privileges: string[]
    // con familyId
    privilegeHistory: string[]
    // canjes antiguos sin familyId, hallados por childId in hijos
    privilegeHistoryPorHijo: string[]
    invitaciones: string[]
    // ids que empiezan por `F_`
    childPoints: string[]
    // tasks de Firestore halladas por childId in hijos
    tasks: string[]
    // usuarios con familyId == F, cada uno con su enOtraFamilia
    usuariosPorFamilia: Adulto[]
  }
}

export class FamiliaNoEncontrada extends Error {
  constructor(familyId: string) {
    super(`Familia no encontrada: ${familyId}`)
    this.name = 'FamiliaNoEncontrada'
  }
}
