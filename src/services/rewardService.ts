import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Task } from "../types/taskTypes";
import { Privilege } from "../types/privilegeTypes";

export interface RewardConfig {
  tareas: Task[];
  privilegios: Privilege[];
  puntosTotales: number;
}

// Función reutilizable para obtener la referencia de un hijo
const getChildRef = (familyId: string, childId: string) =>
  doc(db, "familias", familyId, "hijos", childId);

// Función reutilizable para obtener los datos de un hijo
const getChildData = async (familyId: string, childId: string) => {
  const childRef = getChildRef(familyId, childId);
  const childSnap = await getDoc(childRef);
  if (!childSnap.exists()) throw new Error("Hijo no encontrado");
  return { childRef, data: childSnap.data() };
};

// Obtener la configuración para un hijo
export const fetchRewardConfig = async (
  familyId: string,
  childId: string
): Promise<RewardConfig> => {
  const { data } = await getChildData(familyId, childId);
  return {
    tareas: data.rewardConfig?.tareas || [],
    privilegios: data.rewardConfig?.privilegios || [],
    puntosTotales: data.rewardConfig?.puntosTotales || 0,
  };
};

// Actualizar tareas o privilegios de un hijo
const updateChildReward = async (
  familyId: string,
  childId: string,
  updates: Partial<RewardConfig>
) => {
  const { childRef } = await getChildData(familyId, childId);
  await updateDoc(childRef, { "rewardConfig": updates });
};

// Alternar el estado de una tarea
export const toggleTarea = async (
  familyId: string,
  childId: string,
  tareaId: string,
  completada: boolean
): Promise<void> => {
  const { data } = await getChildData(familyId, childId);
  const tareas = data.rewardConfig?.tareas || [];
  const tareaIndex = tareas.findIndex((t: Task) => t.id === tareaId);
  if (tareaIndex === -1) throw new Error("Tarea no encontrada");

  tareas[tareaIndex].completed = completada;

  const puntosTotales = tareas.reduce(
    (total: number, tarea: Task) =>
      total + (tarea.completed ? tarea.points : 0),
    0
  );

  await updateChildReward(familyId, childId, { tareas, puntosTotales });
};

// Agregar nueva tarea
export const addTarea = async (
  familyId: string,
  childId: string,
  nuevaTarea: Task
): Promise<void> => {
  const { data } = await getChildData(familyId, childId);
  const tareas = [...(data.rewardConfig?.tareas || []), nuevaTarea];
  await updateChildReward(familyId, childId, { tareas });
};

// Eliminar tarea
export const deleteTarea = async (
  familyId: string,
  childId: string,
  tareaId: string
): Promise<void> => {
  const { data } = await getChildData(familyId, childId);
  const tareas = (data.rewardConfig?.tareas || []).filter(
    (t: Task) => t.id !== tareaId
  );
  await updateChildReward(familyId, childId, { tareas });
};

// Canjear privilegio
export const canjearPrivilegio = async (
  familyId: string,
  childId: string,
  privilegioId: string,
  fecha: string
): Promise<void> => {
  const { data } = await getChildData(familyId, childId);
  const privilegios = data.rewardConfig?.privilegios || [];
  const puntosTotales = data.rewardConfig?.puntosTotales || 0;

  const privIndex = privilegios.findIndex(
    (p: Privilege) => p.id === privilegioId
  );
  if (privIndex === -1) throw new Error("Privilegio no encontrado");

  const privilegio = privilegios[privIndex];
  if (puntosTotales < privilegio.points)
    throw new Error("No hay puntos suficientes");

  privilegio.history = privilegio.history || [];
  privilegio.history.push({ dateUnlocked: fecha, unlockedBy: childId });

  privilegios[privIndex] = privilegio;

  await updateChildReward(familyId, childId, {
    privilegios,
    puntosTotales: puntosTotales - privilegio.points,
  });
};
