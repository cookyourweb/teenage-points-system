// Definir el tipo para una tarea (Task)
export interface Task {
  id: number; // ID único de la tarea
  nombre: string; // Nombre de la tarea
  tipo: 'diarias' | 'extra';
  puntos: number; // Puntos que otorga la tarea
  completada: boolean; // Estado de la tarea (completada o no)
}

// Definir el tipo para el estado de las tareas (TasksState)
export interface TasksState {
  [dia: string]: {
    diarias: Task[]; // Tareas diarias
    extra: Task[]; // Tareas extra
  };
}
