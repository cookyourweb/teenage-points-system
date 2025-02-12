//rewardService.ts
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Reward } from "../types/rewardTypes";

// Obtener todos los recompensas
export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const rewardsCollection = collection(db, "recompensas");
    const querySnapshot = await getDocs(rewardsCollection);
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "Sin Nombre",
        description: data.description || "",
        points: data.points || 0,
        unlocked: data.unlocked || false,
      } as Reward;
    });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    throw new Error("Failed to fetch rewards");
  }
};

// Agregar una nueva recompensa
export const addReward = async (reward: Reward): Promise<Reward> => {
  try {
    const rewardsCollection = collection(db, "recompensas");
    const docRef = await addDoc(rewardsCollection, reward);
    return { ...reward, id: docRef.id };
  } catch (error) {
    console.error("Error adding reward:", error);
    throw new Error("Failed to add reward");
  }
};

// Actualizar una recompensa
export const updateReward = async (id: string, updatedReward: Partial<Reward>): Promise<void> => {
  try {
    const rewardDocRef = doc(db, "recompensas", id);
    await updateDoc(rewardDocRef, updatedReward);
  } catch (error) {
    console.error("Error updating reward:", error);
    throw new Error("Failed to update reward");
  }
};

// Eliminar una recompensa
export const deleteReward = async (id: string): Promise<void> => {
  try {
    const rewardDocRef = doc(db, "recompensas", id);
    await deleteDoc(rewardDocRef);
  } catch (error) {
    console.error("Error deleting reward:", error);
    throw new Error("Failed to delete reward");
  }
};
