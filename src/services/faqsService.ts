//faqsServvicee.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Categoria, Pregunta, Solucion } from "../types/faqsTypes";

// Obtener todas las categorías
export const fetchCategorias = async (): Promise<Categoria[]> => {
  const categoriasCollection = collection(db, "categorias");
  const querySnapshot = await getDocs(categoriasCollection);

  return querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      titulo: data.titulo || "Sin Título",
      definicion: data.definicion || "",
      preguntas: data.preguntas || [],
    } as Categoria;
  });
};

// Obtener una categoría por su título
export const fetchCategoriaByTitulo = async (
  titulo: string
): Promise<Categoria | null> => {
  const categorias = await fetchCategorias();
  return categorias.find((categoria) => categoria.titulo === titulo) || null;
};

// Agregar una nueva categoría
export const addCategoria = async (
  titulo: string,
  definicion: string
): Promise<Categoria> => {
  const categoriasCollection = collection(db, "categorias");
  const nuevaCategoria = {
    titulo,
    definicion,
    preguntas: [],
  };
  const docRef = await addDoc(categoriasCollection, nuevaCategoria);
  return {
    id: docRef.id,
    titulo,
    definicion,
    preguntas: [],
  };
};

// Actualizar una categoría
export const updateCategoria = async (
  id: string,
  categoria: Partial<Categoria>
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", id);
  await updateDoc(categoriaDocRef, categoria);
};

// Eliminar una categoría
export const deleteCategoria = async (categoriaId: string): Promise<void> => {
  const categoriaDoc = doc(db, "categorias", categoriaId);
  await deleteDoc(categoriaDoc);
};

// Agregar una nueva pregunta a una categoría
export const addPregunta = async (
  categoriaId: string,
  pregunta: Pregunta
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];
  preguntas.push(pregunta);
  await updateDoc(categoriaDocRef, { preguntas });
};

// Actualizar una pregunta
export const updatePregunta = async (
  categoriaId: string,
  preguntaId: string,
  updatedPregunta: Partial<Pregunta>
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];

  const preguntaIndex = preguntas.findIndex((p: Pregunta) => p.id === preguntaId);
  if (preguntaIndex === -1) throw new Error("Pregunta no encontrada");

  preguntas[preguntaIndex] = { ...preguntas[preguntaIndex], ...updatedPregunta };
  await updateDoc(categoriaDocRef, { preguntas });
};

// Eliminar una pregunta de una categoría
export const deletePregunta = async (
  categoriaId: string,
  preguntaId: string
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];
  const updatedPreguntas = preguntas.filter((p: Pregunta) => p.id !== preguntaId);

  await updateDoc(categoriaDocRef, { preguntas: updatedPreguntas });
};

// Agregar una nueva solución a una pregunta
export const addSolucion = async (
  categoriaId: string,
  preguntaId: string,
  solucion: Solucion
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];
  const preguntaIndex = preguntas.findIndex((p: Pregunta) => p.id === preguntaId);
  if (preguntaIndex === -1) throw new Error("Pregunta no encontrada");

  preguntas[preguntaIndex].soluciones.push(solucion);
  await updateDoc(categoriaDocRef, { preguntas });
};

// Actualizar una solución
export const updateSolucion = async (
  categoriaId: string,
  preguntaId: string,
  solucionId: string,
  nuevoTexto: string
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];
  const preguntaIndex = preguntas.findIndex((p: Pregunta) => p.id === preguntaId);
  if (preguntaIndex === -1) throw new Error("Pregunta no encontrada");

  const soluciones = preguntas[preguntaIndex].soluciones || [];
  const solucionIndex = soluciones.findIndex((s: Solucion) => s.id === solucionId);
  if (solucionIndex === -1) throw new Error("Solución no encontrada");

  soluciones[solucionIndex].texto = nuevoTexto;
  preguntas[preguntaIndex].soluciones = soluciones;
  await updateDoc(categoriaDocRef, { preguntas });
};

// Eliminar una solución
export const deleteSolucion = async (
  categoriaId: string,
  preguntaId: string,
  solucionId: string
): Promise<void> => {
  const categoriaDocRef = doc(db, "categorias", categoriaId);
  const categoriaSnapshot = await getDoc(categoriaDocRef);
  if (!categoriaSnapshot.exists()) throw new Error("Categoría no encontrada");

  const categoriaData = categoriaSnapshot.data();
  const preguntas = categoriaData.preguntas || [];
  const preguntaIndex = preguntas.findIndex((p: Pregunta) => p.id === preguntaId);
  if (preguntaIndex === -1) throw new Error("Pregunta no encontrada");

  const soluciones = preguntas[preguntaIndex].soluciones || [];
  const updatedSoluciones = soluciones.filter((s: Solucion) => s.id !== solucionId);

  preguntas[preguntaIndex].soluciones = updatedSoluciones;
  await updateDoc(categoriaDocRef, { preguntas });
};
