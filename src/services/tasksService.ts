//taskService.ts
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Task } from "../types/taskTypes";

// Obtener todas las tareas
export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const tasksCollection = collection(db, "tareas");
    const querySnapshot = await getDocs(tasksCollection);
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const task: Task = {
        id: parseInt(docSnap.id, 10),
        nombre: data.nombre || "Sin Nombre",
        tipo: data.tipo || 'diarias', // Ensure tipo is provided
        puntos: typeof data.puntos === 'number' ? data.puntos : parseFloat(data.puntos) || 0, // Ensure puntos is a number
        completada: data.completada || false,
      };
      return task;
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw new Error("Failed to fetch tasks");
  }
};

// Agregar una nueva tarea
export const addTask = async (task: Task): Promise<Task> => {
  try {
    const tasksCollection = collection(db, "tareas");
    const docRef = await addDoc(tasksCollection, task);
    return { ...task, id: parseInt(docRef.id, 10) };
  } catch (error) {
    console.error("Error adding task:", error);
    throw new Error("Failed to add task");
  }
};

// Actualizar una tarea
export const updateTask = async (id: string, updatedTask: Partial<Task>): Promise<void> => {
  try {
    const taskDocRef = doc(db, "tareas", id);
    await updateDoc(taskDocRef, updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }
};

// Eliminar una tarea
export const deleteTask = async (id: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, "tareas", id);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
};
