// src/services/deberesService.ts
//
// Adaptador HTTP de los deberes de un hijo (API de Java, Mongo).
//
// Cada deber va en SU PROPIA peticion y de cuatro en cuatro: la API limita el cuerpo
// a 16 KB y un lote de 60 deberes al maximo de texto no cabria. Un fallo no para al
// resto: se anota y se sigue.
import type { Deber, ItemImportado } from '../types/deberTypes';
import { ErrorHttp, apiFetch } from './http';

/** Lo que se manda de un deber: nada que calcule el servidor (clave, ids, autor, fechas). */
export type DeberNuevo = Omit<Deber, 'id' | 'familyId' | 'hijoId' | 'clave' | 'createdBy' | 'createdAt' | 'updatedAt'>;

/** `item` ya con el titulo/fecha que edito el adulto; `guardado` si ya existia (cambio, no alta). */
export interface Decision {
  item: ItemImportado;
  guardado?: Deber;
}

export interface ResultadoGuardado {
  guardados: number;
  fallidos: { item: ItemImportado; motivo: string }[];
  /** Todo se guardo pero no se pudo anotar la importacion: el aviso de «mas de un dia» seguira. */
  importacionSinRegistrar?: true;
}

const EN_VUELO = 4;
const MOTIVO_409 = 'Ya estaba guardado: vuelve a importar para ver el cambio';

const escapa = encodeURIComponent;
const base = (familyId: string, hijoId: string) => `/api/familias/${escapa(familyId)}/hijos/${escapa(hijoId)}`;

export const getDeberes = (familyId: string, hijoId: string, soloActivos: boolean): Promise<Deber[]> =>
  apiFetch<Deber[]>(`${base(familyId, hijoId)}/deberes${soloActivos ? '?soloActivos=true' : ''}`);

export const crearDeber = (familyId: string, hijoId: string, deber: DeberNuevo): Promise<Deber> =>
  apiFetch<Deber>(`${base(familyId, hijoId)}/deberes`, { method: 'POST', body: JSON.stringify(deber) });

export const actualizarDeber = (familyId: string, hijoId: string, id: string, deber: DeberNuevo): Promise<Deber> =>
  apiFetch<Deber>(`${base(familyId, hijoId)}/deberes/${escapa(id)}`, {
    method: 'PUT',
    body: JSON.stringify(deber),
  });

/** Instante ISO de la ultima importacion; sin ninguna la API devuelve {} y aqui `undefined`. */
export const getUltimaImportacion = async (familyId: string, hijoId: string): Promise<string | undefined> =>
  (await apiFetch<{ en?: string }>(`${base(familyId, hijoId)}/importaciones-deberes`)).en;

export const registrarImportacion = async (familyId: string, hijoId: string): Promise<void> => {
  await apiFetch<unknown>(`${base(familyId, hijoId)}/importaciones-deberes`, { method: 'PUT' });
};

/**
 * Del item importado al cuerpo de la API. `imprimir` e `isActive` van SIEMPRE (el servidor
 * los lee como primitivos: sin ellos, 400). Un cambio conserva `isActive` del guardado
 * (editar no desarchiva); uno nuevo nace activo. Lo vacio se omite, no se manda null.
 */
export const aDeberNuevo = (item: ItemImportado, guardado?: Deber): DeberNuevo => ({
  tipo: item.tipo,
  asignatura: item.asignatura,
  ...(item.fecha ? { fecha: item.fecha } : {}),
  titulo: item.titulo,
  enlace: item.enlace,
  ...(item.detalle ? { detalle: item.detalle } : {}),
  ...(item.estado ? { estado: item.estado } : {}),
  imprimir: item.imprimir,
  ...(item.examen ? { examen: item.examen } : {}),
  isActive: guardado ? guardado.isActive : true,
});

/** Texto fijo en español por estado: el mensaje crudo (HTML de un proxy, «Failed to fetch») nunca se enseña. */
const motivoDe = (error: unknown, esCambio: boolean): string => {
  if (!(error instanceof ErrorHttp)) {
    return error instanceof TypeError
      ? 'No hay conexión. Revisa internet y vuelve a intentarlo.'
      : 'No se ha podido guardar. Inténtalo de nuevo.';
  }
  switch (error.status) {
    case 400:
      return 'Algún dato no cumple los límites. Revísalo y vuelve a guardar.';
    case 401:
    case 403:
      return 'Tu sesión ha caducado. Vuelve a entrar.';
    case 404:
      return 'Ese deber ya no existe.';
    case 409:
      return esCambio ? 'Ese enlace ya lo usa otro deber.' : MOTIVO_409;
    case 413:
      return 'Es demasiado largo para guardarlo.';
    default:
      return 'No se ha podido guardar. Inténtalo de nuevo.';
  }
};

/**
 * Guarda las decisiones de cuatro en cuatro. Solo si TODO salio bien registra la importacion
 * (asi el aviso de «mas de un dia» sigue hasta que una importacion sale limpia); tambien con [].
 */
export const guardarImportacion = async (
  familyId: string,
  hijoId: string,
  decisiones: Decision[],
): Promise<ResultadoGuardado> => {
  const resultado: ResultadoGuardado = { guardados: 0, fallidos: [] };

  for (let i = 0; i < decisiones.length; i += EN_VUELO) {
    const trozo = decisiones.slice(i, i + EN_VUELO);
    const respuestas = await Promise.allSettled(
      trozo.map(({ item, guardado }) =>
        guardado
          ? actualizarDeber(familyId, hijoId, guardado.id, aDeberNuevo(item, guardado))
          : crearDeber(familyId, hijoId, aDeberNuevo(item)),
      ),
    );
    respuestas.forEach((r, j) => {
      if (r.status === 'fulfilled') resultado.guardados++;
      else resultado.fallidos.push({ item: trozo[j].item, motivo: motivoDe(r.reason, Boolean(trozo[j].guardado)) });
    });
  }

  if (resultado.fallidos.length === 0) {
    try {
      await registrarImportacion(familyId, hijoId);
    } catch {
      // Los deberes ya estan guardados: no se tira el resultado, se avisa de que falto anotarla.
      resultado.importacionSinRegistrar = true;
    }
  }
  return resultado;
};
