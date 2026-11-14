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
