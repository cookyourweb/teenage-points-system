// src/services/authService.ts
//
// Operaciones de cuenta contra Firebase Auth. Como el resto de services/, es el
// unico sitio donde se toca el proveedor: las pantallas piden y reciben texto.
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export const MENSAJES_RECUPERACION = {
  // Es el MISMO texto exista o no la cuenta: si cambiara, cualquiera podria
  // averiguar que correos estan registrados probando uno tras otro.
  enviado:
    'Si hay una cuenta con ese correo, te hemos enviado un enlace para cambiar la contraseña. Mira también en spam.',
  correoInvalido: 'Escribe tu correo arriba y vuelve a pulsar.',
  demasiadosCorreos: 'Has pedido demasiados correos. Espera unos minutos y vuelve a intentarlo.',
  sinConexion: 'No hay conexión. Revisa internet y vuelve a intentarlo.',
  generico: 'No hemos podido enviar el correo. Inténtalo de nuevo.',
} as const;

/** Comprobacion minima de forma (algo@dominio.tld); la de verdad la hace Firebase. */
export const correoValido = (correo: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

/** Traduce un error de Firebase a texto para la persona. Nunca devuelve el texto crudo. */
export const mensajeDeErrorDeRecuperacion = (error: unknown): string => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return MENSAJES_RECUPERACION.correoInvalido;
    case 'auth/too-many-requests':
      return MENSAJES_RECUPERACION.demasiadosCorreos;
    case 'auth/network-request-failed':
      return MENSAJES_RECUPERACION.sinConexion;
    default:
      return MENSAJES_RECUPERACION.generico;
  }
};

/**
 * Pide a Firebase el correo para cambiar la contraseña. `user-not-found` cuenta
 * como exito (anti-enumeracion); el resto de errores se propagan.
 */
export const pedirCambioDeContrasena = async (correo: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, correo.trim());
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'auth/user-not-found') {
      return;
    }
    throw error;
  }
};
