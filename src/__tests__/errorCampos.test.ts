import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '../services/http';

vi.mock('../firebase', () => ({ auth: { currentUser: null }, db: {} }));

// Pasa por el errorDesde REAL (sin mockear http.ts): lo que el adulto lee es lo
// que sale de aqui, asi que "campos" tiene que llegar como {campo: motivo}.
const responde400 = (cuerpo: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: 400 })),
  );

describe('errores 400 de /api/ia con campos como objeto', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('respuestasSinResponderSeLeenEnCastellano', async () => {
    responde400({
      title: 'Respuestas invalidas',
      detail: 'faltan respuestas o hay ids desconocidos',
      campos: { a02: 'sin responder', zz: 'no existe' },
    });

    await expect(apiFetch('/api/ia/tipo/perfil', { method: 'POST' })).rejects.toMatchObject({
      status: 400,
      message: 'sin responder. no existe',
    });
  });

  it('laEleccionInvalidaMuestraSuMotivo', async () => {
    responde400({
      title: 'Eleccion invalida',
      campos: { principal: 'tiene que estar entre los colores marcados' },
    });

    await expect(apiFetch('/x', { method: 'PUT' })).rejects.toMatchObject({
      message: 'tiene que estar entre los colores marcados',
    });
  });
});
