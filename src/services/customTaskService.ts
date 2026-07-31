// src/services/customTaskService.ts
//
// Adaptador HTTP de tareas.
//
// Este fichero hablaba con Firestore. Ahora habla con la API de Spring Boot, y los
// componentes no se han enterado: siguen llamando a getTasksByFamily, addCustomTask,
// updateCustomTask y deleteCustomTask exactamente igual que antes.
//
// Eso es lo que hace barata esta migracion. Los componentes nunca supieron de donde
// venian los datos; solo conocian estas funciones. El puerto ya estaba construido y
// solo habia que escribir otro adaptador.

/** Base de la API. En local no hace falta configurar nada. */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export interface CustomTask {
  id?: string;
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  familyId: string;
  createdBy: string;
  isActive: boolean;
  description?: string;
  // ISO-8601, como los serializa Jackson. Antes eran Timestamp de Firestore.
  // Las pone el servidor con su reloj: el del navegador puede ir atrasado o
  // en otra zona, y entonces el orden de creacion deja de ser fiable.
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Convierte una respuesta con error en un Error con el motivo de verdad.
 *
 * La API devuelve ProblemDetail (RFC 7807), donde "detail" explica que ha fallado
 * y por que. Tirar eso y lanzar un "Failed to fetch" generico deja a quien depura
 * sin la unica pista util que habia.
 */
const errorDesde = async (respuesta: Response): Promise<Error> => {
  const cuerpo = await respuesta.text();

  try {
    const problema = JSON.parse(cuerpo);
    const motivo = problema.detail ?? problema.title;
    if (motivo) return new Error(motivo);
  } catch {
    // No era JSON: un 502 de un proxy, o la API caida. Se usa el texto tal cual.
  }

  return new Error(cuerpo || `${respuesta.status} ${respuesta.statusText}`);
};

/** Una llamada a la API. Centraliza cabeceras, errores y el 204 sin cuerpo. */
const peticion = async <T>(ruta: string, opciones: RequestInit = {}): Promise<T> => {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  });

  if (!respuesta.ok) throw await errorDesde(respuesta);

  // DELETE responde 204 sin cuerpo. Intentar parsearlo reventaria.
  if (respuesta.status === 204) return undefined as T;

  return respuesta.json() as Promise<T>;
};

// Los ids van escapados: uno con espacios o con & romperia la URL en silencio
// y la peticion acabaria preguntando por otra cosa.
const escapa = encodeURIComponent;

/** Tareas de una familia. */
export const getTasksByFamily = async (familyId: string): Promise<CustomTask[]> =>
  peticion<CustomTask[]>(`/api/tasks?familyId=${escapa(familyId)}`);

/**
 * Solo las tareas activas de una familia.
 *
 * Filtra el servidor, no el navegador: traer todas y descartar aqui significa
 * mandar por la red datos que nadie va a mirar.
 */
export const getActiveTasksByFamily = async (familyId: string): Promise<CustomTask[]> =>
  peticion<CustomTask[]>(`/api/tasks?familyId=${escapa(familyId)}&soloActivas=true`);

/** Una tarea por su id. Devuelve null si no existe, como hacia la version de Firestore. */
export const getCustomTaskById = async (id: string): Promise<CustomTask | null> => {
  try {
    return await peticion<CustomTask>(`/api/tasks/${escapa(id)}`);
  } catch {
    return null;
  }
};

/**
 * Crea una tarea.
 *
 * No se mandan createdAt ni updatedAt: las sella el servidor con su reloj. Y no se
 * manda id: lo asigna Mongo. Que el cliente proponga cualquiera de los tres es como
 * dejar que quien rellena un formulario elija su propio numero de expediente.
 */
export const addCustomTask = async (task: Omit<CustomTask, 'id'>): Promise<CustomTask> =>
  peticion<CustomTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });

/**
 * Actualiza una tarea entera.
 *
 * Es un PUT y no un PATCH a proposito: en el servidor Task es un record inmutable
 * que se reemplaza completo, nunca a trozos. Asi no hay forma de dejarlo a medias.
 * Por eso hay que pasar la tarea entera, no solo el campo que cambia.
 *
 * familyId y createdBy que vengan de aqui se ignoran en el servidor: una tarea no
 * cambia de familia ni de autor.
 */
export const updateCustomTask = async (id: string, task: CustomTask | Omit<CustomTask, 'id'>): Promise<void> => {
  await peticion<CustomTask>(`/api/tasks/${escapa(id)}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
};

/** Borra una tarea. */
export const deleteCustomTask = async (id: string): Promise<void> => {
  await peticion<void>(`/api/tasks/${escapa(id)}`, { method: 'DELETE' });
};

/**
 * Activa o desactiva varias tareas.
 *
 * Lee cada tarea antes de escribirla porque el PUT reemplaza el registro entero:
 * mandar solo { isActive } dejaria el resto de campos vacios y la API responderia
 * 400 por nombre en blanco.
 */
export const toggleMultipleTasksStatus = async (
  taskIds: string[],
  isActive: boolean,
): Promise<void> => {
  await Promise.all(
    taskIds.map(async (id) => {
      const tarea = await getCustomTaskById(id);
      if (!tarea) return;
      await updateCustomTask(id, { ...tarea, isActive });
    }),
  );
};
