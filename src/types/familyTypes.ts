export interface AdolescentType {
  id: string; // ID único del tipo de adolescente (ejemplo: "verde", "rojo")
  nombre: string; // Nombre del tipo
  descripcion: string; // Descripción del tipo
  faqLink: string; // Enlace a las FAQs relacionadas
}

export interface Child {
  id: string; // ID único del hijo
  nombre: string; // Nombre del hijo
  edad: number; // Edad del hijo
  tiposAdolescente: string[]; // ID(s) del tipo de adolescente (relación con `Pregunta.id`)
  email?: string; // Email opcional
  telefono?: string; // Teléfono opcional
  rewardLink?: string; // Enlace al 'reward tracker'
  infoAdicional?: string; // Información adicional
  preguntas?: string[]; // Cambiado a un array de preguntas
  soluciones?: string; // Soluciones relacionadas
}

export interface Parent {
  id: string; // ID único del padre/madre/tutor
  nombre: string; // Nombre del padre/madre/tutor
  email?: string; // Email del padre/madre/tutor (opcional)
  telefono?: string; // Teléfono del padre/madre/tutor (opcional)
  rol: "padre" | "madre" | "tutor"; // Rol del usuario en la familia
}

export interface Family {
  familyId: string; // ID único de la familia
  miembros: {
    padres: Record<string, Parent>; // Registro de padres, clave por ID
    hijos: Record<string, Child>; // Registro de hijos, clave por ID
  };
}

export interface AddEditChildProps {
  childToEdit?: Child; // Hijo a editar (opcional)
  familyId: string; // ID de la familia
  adolescentTypes: AdolescentType[]; // Lista de tipos de adolescentes
  onClose: () => void; // Función para cerrar el formulario
  onSave: (child: Child) => Promise<void>; // Función para guardar los cambios
  onCancel: () => void; // Función para cancelar la acción
}
