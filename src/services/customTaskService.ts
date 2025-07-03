// src/services/customTaskService.ts - SOLUCIÓN TEMPORAL
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

// Obtener tareas por familia - SIMPLIFICADO TEMPORALMENTE
export const getTasksByFamily = async (familyId: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    // Consulta simplificada sin múltiples orderBy
    const q = query(
      tasksCollection, 
      where("familyId", "==", familyId)
    );
    const querySnapshot = await getDocs(q);
    
    const tasks = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
    
    // Ordenar en el cliente mientras se construye el índice
    return tasks.sort((a, b) => {
      // Primero por tipo
      if (a.tipo !== b.tipo) {
        return a.tipo.localeCompare(b.tipo);
      }
      // Luego por fecha de creación (más recientes primero)
      const aTime = a.createdAt?.toDate().getTime() || 0;
      const bTime = b.createdAt?.toDate().getTime() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching family tasks:", error);
    throw new Error("Failed to fetch family tasks");
  }
};

// ✅ FUNCIÓN TEMPORAL: Obtener tareas activas por familia 
export const getActiveTasksByFamily = async (familyId: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    
    // ✅ CONSULTA SIMPLIFICADA - Solo usar where, sin orderBy múltiple
    const q = query(
      tasksCollection, 
      where("familyId", "==", familyId),
      where("isActive", "==", true)
      // ❌ Temporalmente removemos los orderBy para evitar el error de índice
    );
    
    const querySnapshot = await getDocs(q);
    
    const tasks = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
    
    // ✅ ORDENAR EN EL CLIENTE (mientras se construye el índice)
    return tasks.sort((a, b) => {
      // Primero ordenar por tipo: 'diarias' antes que 'extra'
      if (a.tipo !== b.tipo) {
        return a.tipo.localeCompare(b.tipo);
      }
      
      // Dentro del mismo tipo, ordenar por fecha de creación (más recientes primero)
      const aTime = a.createdAt?.toDate().getTime() || 0;
      const bTime = b.createdAt?.toDate().getTime() || 0;
      return bTime - aTime;
    });
    
  } catch (error) {
    console.error("Error fetching active family tasks:", error);
    
    // ✅ FALLBACK: Si hay error, devolver array vacío para evitar crashes
    console.warn("🔄 Devolviendo array vacío mientras se construye el índice de Firebase");
    return [];
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

// Obtener tareas creadas por un usuario específico - SIMPLIFICADO TEMPORALMENTE
export const getTasksByCreator = async (createdBy: string): Promise<CustomTask[]> => {
  try {
    const tasksCollection = collection(db, "customTasks");
    // Consulta simplificada
    const q = query(
      tasksCollection, 
      where("createdBy", "==", createdBy)
    );
    const querySnapshot = await getDocs(q);
    
    const tasks = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CustomTask[];
    
    // Ordenar en el cliente
    return tasks.sort((a, b) => {
      const aTime = a.createdAt?.toDate().getTime() || 0;
      const bTime = b.createdAt?.toDate().getTime() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching tasks by creator:", error);
    throw new Error("Failed to fetch tasks by creator");
  }
};