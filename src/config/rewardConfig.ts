import type { Task } from "../types/taskTypes";
import type { Privilege } from "../types/privilegeTypes";

const lunesTasks = {
  diarias: [
    { 
      id: '1',
      nombre: 'Hacer la cama',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '2',
      nombre: 'Poner la ropa doblada en el armario',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    },
    { 
      id: '3',
      nombre: 'Mantener el armario ordenado',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    },
    { 
      id: '4',
      nombre: 'Llevar la ropa sucia al cesto del baño',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '5',
      nombre: 'Recoger y llevar los platos a la cocina',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '6',
      nombre: 'Enjuagar y colocar los platos en el lavaplatos',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '7',
      nombre: 'Dejar las sartenes en agua con jabón si las usa',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '8',
      nombre: 'Limpiar las sartenes si solo él las usó',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    },
    { 
      id: '9',
      nombre: 'Preguntar antes de tomar comida',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    },
    { 
      id: '10',
      nombre: 'Compartir la habitación sin pelear',
      tipo: 'diarias' as const,
      puntos: 5,
      completada: false,
      childId: ''
    },
    { 
      id: '11',
      nombre: 'Controlar el tono de voz y esperar antes de hablar',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    },
    { 
      id: '12',
      nombre: 'Completar los deberes escolares',
      tipo: 'diarias' as const,
      puntos: 10,
      completada: false,
      childId: ''
    }
  ],
  extra: [
    { 
      id: '13',
      nombre: 'Pasar el aspirador',
      tipo: 'extra' as const,
      puntos: 15,
      completada: false,
      childId: ''
    },
    { 
      id: '14',
      nombre: 'Fregar el suelo',
      tipo: 'extra' as const,
      puntos: 20,
      completada: false,
      childId: ''
    },
    { 
      id: '15',
      nombre: 'Limpiar el polvo',
      tipo: 'extra' as const,
      puntos: 10,
      completada: false,
      childId: ''
    }
  ]
};

export const initialTasks: Record<string, { diarias: Task[]; extra: Task[] }> = {
  Lunes: lunesTasks,
  Martes: { ...lunesTasks },
  Miércoles: { ...lunesTasks },
  Jueves: { ...lunesTasks },
  Viernes: { ...lunesTasks },
  Sábado: { ...lunesTasks },
  Domingo: { ...lunesTasks }
};

export const initialPrivileges: Privilege[] = [
  { 
    id: '1',
    name: '30 minutos de televisión/juegos',
    points: 30,
    description: '',
    unlocked: false
  },
  { 
    id: '2',
    name: '1 hora de televisión/juegos',
    points: 50,
    description: '',
    unlocked: false
  },
  { 
    id: '3',
    name: 'Elegir postre especial',
    points: 40,
    description: '',
    unlocked: false
  },
  { 
    id: '4',
    name: 'Tiempo extra antes de dormir (30min)',
    points: 45,
    description: '',
    unlocked: false
  },
  { 
    id: '5',
    name: 'Salida al parque',
    points: 60,
    description: '',
    unlocked: false
  },
  { 
    id: '6',
    name: 'Invitar a un amigo',
    points: 80,
    description: '',
    unlocked: false
  },
  { 
    id: '7',
    name: 'Elegir película para ver en familia',
    points: 70,
    description: '',
    unlocked: false
  },
  { 
    id: '8',
    name: 'Ir al cine',
    points: 100,
    description: '',
    unlocked: false
  },
  { 
    id: '9',
    name: 'Comprar juguete pequeño',
    points: 150,
    description: '',
    unlocked: false
  },
  { 
    id: '10',
    name: 'Día de actividad especial',
    points: 200,
    description: '',
    unlocked: false
  }
];
