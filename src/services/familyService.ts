import { BaseService } from "./baseService";
import type { Family, Child } from "../types/familyTypes";
import type { TasksState } from "../types/taskTypes";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { db } from "../firebase";

interface FamilyWithId extends Omit<Family, 'familyId'> {
  id?: string;
}

// Estructura para guardar datos semanales de puntos
export interface WeeklyTasksData {
  id: string;
  childId: string;
  familyId: string;
  weekStartDate: string; // ISO string de la fecha de inicio de semana
  tasks: TasksState;
  totalPoints: { [key: string]: number };
  weeklyTotal: number;
  lastUpdated: Timestamp;
  updatedBy: string; // userId quien hizo la última actualización
}

export interface ChildPoints {
  childId: string;
  childName: string;
  totalWeeklyPoints: number;
  currentWeekId: string;
  lastActivity: Timestamp;
}

class FamilyService extends BaseService<FamilyWithId> {
  constructor() {
    super("familias");
  }

  async getFamilyById(familyId: string): Promise<Family | null> {
    const family = await this.getById(familyId);
    if (family) {
      return {
        familyId: family.id!,
        miembros: family.miembros
      };
    }
    return null;
  }

  async addFamily(
    userId: string,
    name: string,
    email: string,
    rol: "padre" | "madre" | "tutor"
  ): Promise<Family> {
    const newFamily: Omit<Family, 'familyId'> = {
      miembros: {
        padres: {
          [userId]: {
            nombre: name,
            email: email,
            rol: rol,
          },
        },
        hijos: {},
      },
    };

    const createdFamily = await this.create(newFamily);
    return {
      familyId: createdFamily.id!,
      miembros: newFamily.miembros
    };
  }

  async deleteChildFromFamily(familyId: string, childId: string): Promise<void> {
    const family = await this.getFamilyById(familyId);
    if (!family) {
      throw new Error("Familia no encontrada");
    }

    const hijos = { ...family.miembros.hijos };
    delete hijos[childId];
    await this.update(familyId, { miembros: { ...family.miembros, hijos } });
  }

  async addChildToFamily(familyId: string, child: Child): Promise<void> {
    const family = await this.getFamilyById(familyId);
    if (!family) {
      throw new Error("Familia no encontrada");
    }

    const hijos = { ...family.miembros.hijos, [child.id]: child };
    await this.update(familyId, { miembros: { ...family.miembros, hijos } });
  }

  async updateChildInFamily(familyId: string, childId: string, updatedChild: Child): Promise<void> {
    const family = await this.getFamilyById(familyId);
    if (!family) {
      throw new Error("Familia no encontrada");
    }

    const hijos = { ...family.miembros.hijos, [childId]: updatedChild };
    await this.update(familyId, { miembros: { ...family.miembros, hijos } });
  }

  async getChildNameById(familyId: string, childId: string): Promise<string> {
    const family = await this.getFamilyById(familyId);
    if (!family) {
      throw new Error("Familia no encontrada");
    }

    const child = family.miembros.hijos[childId];
    if (!child) {
      throw new Error("Hijo no encontrado");
    }

    return child.nombre || 'Hijo';
  }

  // ========== NUEVAS FUNCIONES PARA PUNTOS ==========

  // Obtener el ID de la semana actual (formato: YYYY-WW)
  private getCurrentWeekId(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  // Obtener el lunes de la semana actual
  private getWeekStartDate(): string {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday.toISOString().split('T')[0];
  }

  // Guardar el estado completo de la semana
  async saveWeeklyTasks(
    familyId: string,
    childId: string,
    tasks: TasksState,
    totalPoints: { [key: string]: number },
    weeklyTotal: number,
    userId: string
  ): Promise<void> {
    const weekId = this.getCurrentWeekId();
    const docId = `${familyId}_${childId}_${weekId}`;
    
    const weeklyData: WeeklyTasksData = {
      id: docId,
      childId,
      familyId,
      weekStartDate: this.getWeekStartDate(),
      tasks,
      totalPoints,
      weeklyTotal,
      lastUpdated: Timestamp.now(),
      updatedBy: userId
    };

    await setDoc(doc(db, "weeklyTasks", docId), weeklyData);
    
    // También actualizar el resumen del hijo
    await this.updateChildPointsSummary(familyId, childId, weeklyTotal, weekId);
  }

  // Obtener las tareas de la semana actual
  async getWeeklyTasks(
    familyId: string, 
    childId: string
  ): Promise<WeeklyTasksData | null> {
    const weekId = this.getCurrentWeekId();
    const docId = `${familyId}_${childId}_${weekId}`;
    
    const docRef = doc(db, "weeklyTasks", docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as WeeklyTasksData;
    }
    
    return null;
  }

  // Actualizar una tarea específica
  async updateTask(
    familyId: string,
    childId: string,
    dayOfWeek: string,
    taskType: 'diarias' | 'extra',
    taskId: string,
    completed: boolean,
    userId: string
  ): Promise<void> {
    try {
      // Primero obtener el documento actual
      const currentData = await this.getWeeklyTasks(familyId, childId);
      
      if (!currentData) {
        throw new Error("No se encontraron datos de la semana actual");
      }

      // Actualizar la tarea específica
      const updatedTasks = { ...currentData.tasks };
      const taskIndex = updatedTasks[dayOfWeek][taskType].findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        const task = updatedTasks[dayOfWeek][taskType][taskIndex];
        const oldCompleted = task.completada;
        task.completada = completed;
        
        // Recalcular puntos del día
        const pointChange = completed !== oldCompleted 
          ? (completed ? task.puntos : -task.puntos) 
          : 0;
        
        const updatedTotalPoints = { ...currentData.totalPoints };
        updatedTotalPoints[dayOfWeek] = (updatedTotalPoints[dayOfWeek] || 0) + pointChange;
        
        const newWeeklyTotal = currentData.weeklyTotal + pointChange;
        
        // Guardar los cambios
        await this.saveWeeklyTasks(
          familyId, 
          childId, 
          updatedTasks, 
          updatedTotalPoints, 
          newWeeklyTotal, 
          userId
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  // Actualizar resumen de puntos del hijo
  private async updateChildPointsSummary(
    familyId: string,
    childId: string,
    weeklyTotal: number,
    weekId: string
  ): Promise<void> {
    const docRef = doc(db, "childPoints", `${familyId}_${childId}`);
    
    const childPointsData: ChildPoints = {
      childId,
      childName: "", // Se actualizará desde el componente
      totalWeeklyPoints: weeklyTotal,
      currentWeekId: weekId,
      lastActivity: Timestamp.now()
    };

    await setDoc(docRef, childPointsData, { merge: true });
  }

  // Obtener puntos de todos los hijos de una familia
  async getFamilyChildrenPoints(familyId: string): Promise<ChildPoints[]> {
    const q = query(
      collection(db, "childPoints"),
      where("childId", ">=", ""),
      where("childId", "<=", "\uf8ff")
    );
    
    const querySnapshot = await getDocs(q);
    const childrenPoints: ChildPoints[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ChildPoints;
      // Filtrar por familyId (asumiendo que el ID del documento contiene familyId)
      if (doc.id.startsWith(familyId)) {
        childrenPoints.push(data);
      }
    });
    
    return childrenPoints;
  }

  // Suscribirse a cambios en tiempo real de las tareas de un hijo
  subscribeToWeeklyTasks(
    familyId: string,
    childId: string,
    callback: (data: WeeklyTasksData | null) => void
  ): () => void {
    const docRef = doc(db, "weeklyTasks", `${familyId}_${childId}_${this.getCurrentWeekId()}`);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as WeeklyTasksData);
      } else {
        callback(null);
      }
    });
  }

  // Suscribirse a cambios en los puntos de todos los hijos de la familia
  subscribeToFamilyPoints(
    familyId: string,
    callback: (children: ChildPoints[]) => void
  ): () => void {
    const q = query(collection(db, "childPoints"));
    
    return onSnapshot(q, (querySnapshot) => {
      const childrenPoints: ChildPoints[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ChildPoints;
        if (doc.id.startsWith(familyId)) {
          childrenPoints.push(data);
        }
      });
      callback(childrenPoints);
    });
  }

  // Crear datos iniciales para un nuevo hijo
  async initializeChildWeek(
    familyId: string,
    childId: string,
    childName: string,
    initialTasks: TasksState,
    userId: string
  ): Promise<void> {
    const initialTotalPoints: { [key: string]: number } = {};
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    diasSemana.forEach(dia => {
      initialTotalPoints[dia] = 0;
    });
    
    await this.saveWeeklyTasks(familyId, childId, initialTasks, initialTotalPoints, 0, userId);
    
    // Actualizar el nombre del hijo en el resumen
    const docRef = doc(db, "childPoints", `${familyId}_${childId}`);
    await updateDoc(docRef, { childName });
  }
}

const familyService = new FamilyService();

// Exportar todas las funciones necesarias (existentes)
export { familyService };
export const addFamily = familyService.addFamily.bind(familyService);
export const addChildToFamily = familyService.addChildToFamily.bind(familyService);
export const updateChildInFamily = familyService.updateChildInFamily.bind(familyService);
export const deleteChildFromFamily = familyService.deleteChildFromFamily.bind(familyService);
export const getChildNameById = familyService.getChildNameById.bind(familyService);
export const fetchFamilyById = familyService.getFamilyById.bind(familyService);

// Exportar nuevas funciones para puntos
export const saveWeeklyTasks = familyService.saveWeeklyTasks.bind(familyService);
export const getWeeklyTasks = familyService.getWeeklyTasks.bind(familyService);
export const updateTask = familyService.updateTask.bind(familyService);
export const getFamilyChildrenPoints = familyService.getFamilyChildrenPoints.bind(familyService);
export const subscribeToWeeklyTasks = familyService.subscribeToWeeklyTasks.bind(familyService);
export const subscribeToFamilyPoints = familyService.subscribeToFamilyPoints.bind(familyService);
export const initializeChildWeek = familyService.initializeChildWeek.bind(familyService);