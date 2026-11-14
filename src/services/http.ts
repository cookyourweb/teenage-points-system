// src/services/http.ts
//
// El unico sitio del frontend que llama a fetch( contra la API.
//
// La API de Java exige "Authorization: Bearer <token de Firebase>" en /api/**.
// Si cada servicio montara su propia peticion, bastaria que uno se olvidara de la
// cabecera para tener una pantalla que falla con 401 solo a veces. Aqui se hace una
// vez, y arquitectura.test.ts vigila que nadie mas use fetch(.
import { auth } from '../firebase';

/** Base de la API. En local no hace falta configurar nada. */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** Error de la API con su codigo HTTP, para que quien llama pueda decidir por status. */
export class ErrorHttp extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ErrorHttp';
    this.status = status;
  }
}

/**
 * Convierte una respuesta con error en un ErrorHttp con el motivo de verdad.
 *
 * La API devuelve ProblemDetail (RFC 7807). Y el orden de lectura importa:
 *
 * En un 400 de validacion, "detail" es generico ("hay campos que no cumplen las
 * reglas") y el motivo real esta en "campos", una propiedad por campo que falla.
 * Quedarse con el detail es ensenarle a quien rellena el formulario un mensaje
 * que no le dice que arreglar.
 *
 * En un 404 no hay "campos", y ahi el detail SI es el mensaje bueno.
 *
 * Por eso se mira primero campos y despues detail, y no al reves.
 */
const errorDesde = async (respuesta: Response): Promise<ErrorHttp> => {
  const cuerpo = await respuesta.text();

  try {
    const problema = JSON.parse(cuerpo);

    const porCampo = problema.campos;
    if (porCampo && typeof porCampo === 'object') {
      const motivos = Object.values(porCampo).filter(Boolean);
      // Se muestran todos, no solo el primero: si fallan tres campos y solo
      // se ensena uno, se corrige, se reenvia y vuelve a fallar. Tres veces.
      if (motivos.length > 0) return new ErrorHttp(respuesta.status, motivos.join('. '));
    }

    const motivo = problema.detail ?? problema.title;
    if (motivo) return new ErrorHttp(respuesta.status, motivo);
  } catch {
    // No era JSON: un 502 de un proxy, o la API caida. Se usa el texto tal cual.
  }

  return new ErrorHttp(respuesta.status, cuerpo || `${respuesta.status} ${respuesta.statusText}`);
};

/**
 * Una sola vuelta: pide el token y manda la peticion.
 *
 * El token NO se guarda en ningun sitio: se pide a Firebase en cada llamada.
 * Firebase ya lo cachea y lo renueva solo cuando va a caducar; una copia nuestra
 * seria una segunda fuente de verdad que tarde o temprano estaria caducada.
 * `renovar` fuerza a Firebase a emitir uno nuevo en vez de devolver el de cache.
 */
const enviar = async (ruta: string, opciones: RequestInit, renovar: boolean): Promise<Response> => {
  const usuario = auth.currentUser;
  const token = usuario ? await usuario.getIdToken(renovar) : null;

  return fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...opciones.headers,
      // Sin sesion no se manda cabecera: el servidor contestara 401 y ya.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

/** Una llamada a la API. Centraliza token, cabeceras, errores y el 204 sin cuerpo. */
export const apiFetch = async <T>(ruta: string, opciones: RequestInit = {}): Promise<T> => {
  let respuesta = await enviar(ruta, opciones, false);

  // Un 401 con sesion suele ser un token caducado que Firebase aun no habia
  // renovado. Se reintenta UNA vez con uno nuevo; si vuelve a dar 401, el problema
  // no es el token y seguir insistiendo solo haria bucles. Sin sesion no hay nada
  // que renovar, asi que tampoco se reintenta.
  if (respuesta.status === 401 && auth.currentUser) {
    respuesta = await enviar(ruta, opciones, true);
  }

  if (!respuesta.ok) throw await errorDesde(respuesta);

  // DELETE responde 204 sin cuerpo. Intentar parsearlo reventaria.
  if (respuesta.status === 204) return undefined as T;

  return respuesta.json() as Promise<T>;
};
