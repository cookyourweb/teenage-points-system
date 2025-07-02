// src/services/customTasksService.ts
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { db } from "../firebase";

export interface CustomTask {
  id?: string;
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  familyId: string;
  createdBy: string;
  isActive: boolean;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Obtener todas las tareas personalizadas
export const fetchCustomTasks = async (): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    const q = query(tasksCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
  } catch (error) {
    console.error("Error fetching custom tasks:", error);
    throw new Error("Failed to fetch custom tasks");
  }
};

// Obtener tareas por familia
export const getTasksByFamily = async (familyId: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    const q = query(
      tasksCollection, 
      where("familyId", "==", familyId),
      orderBy("tipo", "asc"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
  } catch (error) {
    console.error("Error fetching family tasks:", error);
    throw new Error("Failed to fetch family tasks");
  }
};

// Obtener tareas activas por familia
export const getActiveTasksByFamily = async (familyId: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    const q = query(
      tasksCollection, 
      where("familyId", "==", familyId),
      where("isActive", "==", true),
      orderBy("tipo", "asc"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
  } catch (error) {
    console.error("Error fetching active family tasks:", error);
    throw new Error("Failed to fetch active family tasks");
  }
};

// Agregar una nueva tarea personalizada
export const addCustomTask = async (task: Omit<CustomTask, 'id'>): Promise<CustomTask> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    const taskData = {
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(tasksCollection, taskData);
    
    return {
      id: docRef.id,
      ...taskData
    } as CustomTask;
  } catch (error) {
    console.error("Error adding custom task:", error);
    throw new Error("Failed to add custom task");
  }
};

// Actualizar una tarea personalizada
export const updateCustomTask = async (id: string, updatedTask: Partial<CustomTask>): Promise<void> => {
  try {
    const taskDocRef = doc(db, "customTasks", id);
    const updateData = {
      ...updatedTask,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(taskDocRef, updateData);
  } catch (error) {
    console.error("Error updating custom task:", error);
    throw new Error("Failed to update custom task");
  }
};

// Eliminar una tarea personalizada
export const deleteCustomTask = async (id: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, "customTasks", id);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting custom task:", error);
    throw new Error("Failed to delete custom task");
  }
};

// Obtener una tarea por ID
export const getCustomTaskById = async (id: string): Promise<CustomTask | null> => {
  try {
    const taskDocRef = doc(db, "customTasks", id);
    const docSnap = await getDoc(taskDocRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as CustomTask;
    }
    return null;
  } catch (error) {
    console.error("Error getting custom task:", error);
    throw new Error("Failed to get custom task");
  }
};

// Activar/Desactivar múltiples tareas
export const toggleMultipleTasksStatus = async (taskIds: string[], isActive: boolean): Promise<void> => {
  try {
    const updatePromises = taskIds.map(id => 
      updateCustomTask(id, { isActive, updatedAt: Timestamp.now() })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error toggling multiple tasks status:", error);
    throw new Error("Failed to toggle multiple tasks status");
  }
};

// Obtener tareas creadas por un usuario específico
export const getTasksByCreator = async (createdBy: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    const q = query(
      tasksCollection, 
      where("createdBy", "==", createdBy),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
  } catch (error) {
    console.error("Error fetching tasks by creator:", error);
    throw new Error("Failed to fetch tasks by creator");
  }
};