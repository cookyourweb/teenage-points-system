// Definir el tipo para un hijo (Child)
export interface Child {
  id: string; // ID único del hijo
  nombre: string; // Nombre del hijo
  edad: number; // Edad del hijo
  tiposAdolescente: string[]; // Tipos de adolescente (puede ser un array de strings)
  rewardLink: string; // Enlace al sistema de puntos del hijo
}

// Definir el tipo para la familia (Family)
export interface Family {
  familyId: string; // ID único de la familia
  miembros: {
    padres: Record<string, { nombre: string; email: string; rol: string }>; // Padres de la familia
    hijos: Record<string, Child>; // Hijos de la familia
  };
  invitaciones?: Record<string, { email: string; status: string }>; // Invitaciones pendientes
}


