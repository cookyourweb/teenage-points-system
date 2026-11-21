// src/services/identidadService.ts
//
// Quien es el usuario segun el SERVIDOR. El frontend sabe quien cree ser (Firebase),
// pero lo que cuenta es a quien reconoce la API tras verificar el token.
import { apiFetch } from './http';

export type Yo = {
  uid: string;
  email?: string;
  emailVerificado?: boolean;
  proveedor?: string;
};

/** Pregunta a la API a quien identifica el token que mandamos. */
export const getYo = (): Promise<Yo> => apiFetch<Yo>('/api/me');

export type Membresia = { familyId: string; papel: string };

/**
 * Pide al servidor que cree (o confirme) la membresia de esta cuenta. Sin cuerpo
 * a proposito: el servidor lee la familia en Firestore con el token de la propia
 * cuenta, asi que el navegador no puede declararse de una familia que no es la suya.
 * Es idempotente: repetirla no cambia nada.
 */
export const asegurarMembresia = (): Promise<Membresia> =>
  apiFetch<Membresia>('/api/membresias/yo', { method: 'POST' });
