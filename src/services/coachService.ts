import { apiFetch } from './http';

export type ColorPregunta = { id: string; nombre: string; descripcion: string };
export type Afirmacion = { id: string; texto: string };
export type PreguntasTipo = { colores: ColorPregunta[]; afirmaciones: Afirmacion[] };
export type Frecuencia = 'NUNCA' | 'A_VECES' | 'A_MENUDO';
export type Nivel = 'NADA' | 'ALGO' | 'MUCHO';
export type PerfilColor = { id: string; nombre: string; nivel: Nivel };
export type PerfilTipo = { colores: PerfilColor[] };
export type EleccionTipo = { colores: string[]; principal?: string };
export type EleccionGuardada = EleccionTipo & { elegidaEn: string };
export type EleccionDeAdulto = EleccionGuardada & { uid: string; esMia: boolean };
export type EleccionesTipo = { elecciones: EleccionDeAdulto[]; coinciden: boolean };

const rutaTipo = (familyId: string, hijoId: string) =>
  `/api/familias/${encodeURIComponent(familyId)}/hijos/${encodeURIComponent(hijoId)}/tipo`;

/** Las afirmaciones y los colores, tal como los publica el servidor (ids opacos). */
export const getPreguntasTipo = (): Promise<PreguntasTipo> =>
  apiFetch<PreguntasTipo>('/api/ia/tipo/preguntas');

/** El servidor calcula el nivel de cada color: el navegador no sabe a que color apunta cada afirmacion. */
export const pedirPerfil = (respuestas: Record<string, Frecuencia>): Promise<PerfilTipo> =>
  apiFetch<PerfilTipo>('/api/ia/tipo/perfil', {
    method: 'POST',
    body: JSON.stringify({ respuestas }),
  });

/** Guarda lo que ESTE adulto reconoce en el hijo (vive solo en Mongo). */
export const guardarEleccionTipo = (
  familyId: string,
  hijoId: string,
  eleccion: { colores: string[]; principal: string | null },
): Promise<EleccionGuardada> =>
  apiFetch<EleccionGuardada>(rutaTipo(familyId, hijoId), {
    method: 'PUT',
    body: JSON.stringify(eleccion),
  });

/** Las elecciones de todos los adultos de ese hijo. */
export const getEleccionesTipo = (familyId: string, hijoId: string): Promise<EleccionesTipo> =>
  apiFetch<EleccionesTipo>(rutaTipo(familyId, hijoId));
