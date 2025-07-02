// src/services/tasksPrivilegesService.ts
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { Task } from "../types/taskTypes";
import type { Privilege, PrivilegeHistory } from "../types/privilegeTypes";

class TasksPrivilegesService {
  
  async getChildTasks(childId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, "tasks"), 
        where("childId", "==", childId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Task);
    } catch (error) {
      console.error("Error fetching child tasks:", error);
      throw new Error("Failed to fetch child tasks");
    }
  }

  async getChildPrivileges(childId: string): Promise<Privilege[]> {
    try {
      const q = query(
        collection(db, "privileges"), 
        where("childId", "==", childId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          privilegioId: doc.id,
          name: data.name,
          description: data.description,
          points: data.points,
          unlocked: data.unlocked,
          history: data.history || []
        } as Privilege;
      });
    } catch (error) {
      console.error("Error fetching child privileges:", error);
      throw new Error("Failed to fetch child privileges");
    }
  }

  async getPrivilegeHistory(childId: string): Promise<PrivilegeHistory[]> {
    try {
      const q = query(
        collection(db, "privilegeHistory"), 
        where("childId", "==", childId),
        orderBy("dateUnlocked", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          privilegeName: data.privilegeName,
          dateUnlocked: data.dateUnlocked,
          unlockedBy: data.unlockedBy,
          childId: data.childId
        } as PrivilegeHistory;
      });
    } catch (error) {
      console.error("Error fetching privilege history:", error);
      throw new Error("Failed to fetch privilege history");
    }
  }

  async getAllPrivileges(): Promise<Privilege[]> {
    try {
      const q = query(
        collection(db, "privileges"),
        orderBy("points", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          privilegioId: doc.id,
          name: data.name,
          description: data.description,
          points: data.points,
          unlocked: data.unlocked,
          history: data.history || []
        } as Privilege;
      });
    } catch (error) {
      console.error("Error fetching all privileges:", error);
      throw new Error("Failed to fetch all privileges");
    }
  }
}

// Crear instancia del servicio
const tasksPrivilegesService = new TasksPrivilegesService();

// Exportar el servicio y sus métodos
export { tasksPrivilegesService };
export const getChildTasks = tasksPrivilegesService.getChildTasks.bind(tasksPrivilegesService);
export const getChildPrivileges = tasksPrivilegesService.getChildPrivileges.bind(tasksPrivilegesService);
export const getPrivilegeHistory = tasksPrivilegesService.getPrivilegeHistory.bind(tasksPrivilegesService);
export const getAllPrivileges = tasksPrivilegesService.getAllPrivileges.bind(tasksPrivilegesService);