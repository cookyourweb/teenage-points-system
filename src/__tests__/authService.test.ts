import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  MENSAJES_RECUPERACION as M,
  correoValido,
  mensajeDeErrorDeRecuperacion,
  pedirCambioDeContrasena,
} from '../services/authService';

vi.mock('../firebase', () => ({ auth: { id: 'auth-falso' }, db: {} }));
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn() }));

describe('correoValido', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['sin-arroba', false],
    ['a@b', false],
    ['a b@c.com', false],
    ['ana@correo.com', true],
    ['  ana@correo.com  ', true],
  ])('%j -> %s', (correo, esperado) => {
    expect(correoValido(correo)).toBe(esperado);
  });
});

describe('mensajeDeErrorDeRecuperacion', () => {
  it.each([
    ['auth/too-many-requests', 'Has pedido demasiados correos. Espera unos minutos y vuelve a intentarlo.'],
    ['auth/network-request-failed', 'No hay conexión. Revisa internet y vuelve a intentarlo.'],
    ['auth/invalid-email', 'Escribe tu correo arriba y vuelve a pulsar.'],
    ['auth/lo-que-sea', 'No hemos podido enviar el correo. Inténtalo de nuevo.'],
  ])('%s', (code, texto) => {
    expect(mensajeDeErrorDeRecuperacion({ code, message: 'Firebase: raw (' + code + ')' })).toBe(texto);
  });

  it('un valor que no es un error de Firebase da el genérico, sin filtrar su texto', () => {
    expect(mensajeDeErrorDeRecuperacion(new Error('secreto interno'))).toBe(M.generico);
    expect(mensajeDeErrorDeRecuperacion('texto suelto')).toBe(M.generico);
    expect(mensajeDeErrorDeRecuperacion(null)).toBe(M.generico);
  });
});

describe('pedirCambioDeContrasena', () => {
  beforeEach(() => vi.clearAllMocks());

  it('llama a sendPasswordResetEmail con auth y el correo sin espacios', async () => {
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
    await pedirCambioDeContrasena('  ana@correo.com ');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({ id: 'auth-falso' }, 'ana@correo.com');
  });

  it('auth/user-not-found se trata como éxito (anti-enumeración)', async () => {
    vi.mocked(sendPasswordResetEmail).mockRejectedValue({ code: 'auth/user-not-found' });
    await expect(pedirCambioDeContrasena('x@y.com')).resolves.toBeUndefined();
  });

  it('el resto de errores se propagan para que la pantalla los traduzca', async () => {
    const error = { code: 'auth/too-many-requests' };
    vi.mocked(sendPasswordResetEmail).mockRejectedValue(error);
    await expect(pedirCambioDeContrasena('x@y.com')).rejects.toBe(error);
  });
});
