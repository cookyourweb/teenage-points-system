export interface Task {
  id: string;
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  completada: boolean;
  fechaCompletada?: string;
  childId: string;
}

export interface DiaTareas {
  [dia: string]: {
    diarias: Task[];
    extra: Task[];
  };
}

// Definir el tipo para el estado de las tareas (TasksState)
export interface TasksState {
  [dia: string]: {
    diarias: Task[]; // Tareas diarias
    extra: Task[]; // Tareas extra
  };
}
