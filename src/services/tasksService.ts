import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Task } from "../types/taskTypes"; // Importa la interfaz Task correctamente

// Obtener todas las tareas de la colección global de tareas
export const fetchTasks = async (): Promise<Task[]> => {
  const querySnapshot = await getDocs(collection(db, "tareas"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

// Agregar una nueva tarea a la colección global
export const addTask = async (newTask: Task) => {
  await addDoc(collection(db, "tareas"), newTask);
};

// Actualizar una tarea en la colección global
export const updateTask = async (id: string, data: Partial<Task>) => {
  await updateDoc(doc(db, "tareas", id), data);
};

// Eliminar una tarea de la colección global
export const deleteTask = async (id: string) => {
  await deleteDoc(doc(db, "tareas", id));
};
