export interface TaskHistory {
  date: string; // Fecha en que la tarea fue marcada como completada
  completedBy: string; // ID del usuario (hijo) que completó la tarea
  pointsEarned: number; // Puntos obtenidos al completar la tarea
}

export interface Task {
  id: string;
  title: string;
  type: string;
  name: string;
  tipe: string;
  description: string;
  points: number;
  completed: boolean;
  day: string; // Día asociado a la tarea (nuevo campo añadido)
  history?: TaskHistory[]; // Historial de cumplimiento de la tarea
}
export interface TaskHistory {
  date: string; // Fecha en que la tarea fue marcada como completada
  completedBy: string; // ID del usuario (hijo) que completó la tarea
  pointsEarned: number; // Puntos obtenidos al completar la tarea
}




