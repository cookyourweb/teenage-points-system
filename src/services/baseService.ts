import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  DocumentData,
  WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase";

export class BaseService<T extends DocumentData & { id?: string }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  async getAll(): Promise<T[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as T);
    } catch (error) {
      console.error(`Error fetching ${this.collectionName}:`, error);
      throw new Error(`Failed to fetch ${this.collectionName}`);
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw new Error(`Failed to get ${this.collectionName}`);
    }
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), item as WithFieldValue<T>);
      return { id: docRef.id, ...item } as T;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw new Error(`Failed to create ${this.collectionName}`);
    }
  }

  async update(id: string, item: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, item as Partial<WithFieldValue<DocumentData>>);
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw new Error(`Failed to update ${this.collectionName}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw new Error(`Failed to delete ${this.collectionName}`);
    }
  }
}
