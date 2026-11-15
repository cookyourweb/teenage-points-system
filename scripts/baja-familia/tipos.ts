// Tipos del script de baja de una familia (RGPD: borrar todos sus datos).
// Son puros: ni red ni SDKs, para que el plan se pueda probar entero.

export type Fuente = 'mongo' | 'firestore' | 'auth'

export type Paso = {
  fuente: Fuente
  coleccion: string
  ids: string[]
}

export type PlanBaja = { pasos: Paso[] }

// Un adulto (padre/madre) de la familia y si cuelga de OTRA familia.
// La tarea 2 lo rellena mirando Mongo `membresias` y `usuarios.familyId`.
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
    // ids de miembros.hijos (el mapa esta indexado por id de hijo)
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
    // usuarios con familyId == F
    usuariosPorFamilia: string[]
  }
}

export class FamiliaNoEncontrada extends Error {
  constructor(familyId: string) {
    super(`Familia no encontrada: ${familyId}`)
    this.name = 'FamiliaNoEncontrada'
  }
}
