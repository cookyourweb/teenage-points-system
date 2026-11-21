import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock de firebase: el test no debe arrancar Firebase de verdad ni pedir tokens a
// Google. Lo unico que importa aqui es QUE le pide apiFetch al usuario actual.
const { getIdToken, auth } = vi.hoisted(() => {
  const getIdToken = vi.fn();
  return { getIdToken, auth: { currentUser: { getIdToken } as { getIdToken: typeof getIdToken } | null } };
});
vi.mock('../firebase', () => ({ auth, db: {} }));

import { ErrorHttp, apiFetch } from '../services/http';

const API = 'http://localhost:8080';
const fetchSimulado = vi.fn();

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const cabecera = (llamada: number, nombre: string) => {
  const [, opciones] = fetchSimulado.mock.calls[llamada];
  return (opciones.headers as Record<string, string>)[nombre];
};

beforeEach(() => {
  fetchSimulado.mockReset();
  getIdToken.mockReset();
  auth.currentUser = { getIdToken };
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('apiFetch', () => {
  it('ponElToken: manda el token de Firebase como Bearer', async () => {
    getIdToken.mockResolvedValue('tok-1');
    fetchSimulado.mockResolvedValue(json({ ok: true }));

    await apiFetch('/api/x');

    expect(fetchSimulado.mock.calls[0][0]).toBe(`${API}/api/x`);
    expect(cabecera(0, 'Authorization')).toBe('Bearer tok-1');
    expect(cabecera(0, 'Content-Type')).toBe('application/json');
  });

  it('sinSesionNoMandaAuthorization', async () => {
    auth.currentUser = null;
    fetchSimulado.mockResolvedValue(json({ ok: true }));

    await apiFetch('/api/x');

    expect(cabecera(0, 'Authorization')).toBeUndefined();
  });

  it('reintentaUnaVezCon401: renueva el token y repite', async () => {
    // Un token caducado da 401; getIdToken(true) fuerza uno nuevo a Firebase.
    getIdToken.mockResolvedValueOnce('viejo').mockResolvedValueOnce('nuevo');
    fetchSimulado
      .mockResolvedValueOnce(json({ detail: 'caducado' }, 401))
      .mockResolvedValueOnce(json({ ok: 1 }));

    const resultado = await apiFetch('/api/x');

    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
    expect(cabecera(1, 'Authorization')).toBe('Bearer nuevo');
    expect(resultado).toEqual({ ok: 1 });
  });

  it('noReintentaDosVeces', async () => {
    getIdToken.mockResolvedValue('tok');
    fetchSimulado.mockImplementation(async () => json({ detail: 'no' }, 401));

    const fallo = await apiFetch('/api/x').catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorHttp);
    expect(fallo.status).toBe(401);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it('errorConTipo: usa el detail del problem+json', async () => {
    getIdToken.mockResolvedValue('tok');
    fetchSimulado.mockResolvedValue(json({ detail: 'no existe' }, 404));

    const fallo = await apiFetch('/api/x').catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorHttp);
    expect(fallo.status).toBe(404);
    expect(fallo.message).toBe('no existe');
  });

  it('conservaElTituloDelProblema: el title identifica el tipo de 404', async () => {
    getIdToken.mockResolvedValue('tok');
    fetchSimulado.mockResolvedValue(json({ title: 'Familia no encontrada', detail: 'no hay familia' }, 404));

    const fallo = await apiFetch('/api/x').catch((e) => e);

    expect(fallo.titulo).toBe('Familia no encontrada');
    expect(fallo.message).toBe('no hay familia');
  });

  it('204SinCuerpo', async () => {
    getIdToken.mockResolvedValue('tok');
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await apiFetch('/api/x', { method: 'DELETE' })).toBeUndefined();
  });

  describe('429 demasiadas peticiones', () => {
    const limitado = (retryAfter?: string) =>
      new Response(
        JSON.stringify({ title: 'Demasiadas peticiones', detail: 'has hecho demasiadas peticiones seguidas; espera un poco' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...(retryAfter ? { 'Retry-After': retryAfter } : {}) },
        },
      );

    const falla429 = async (retryAfter?: string) => {
      getIdToken.mockResolvedValue('tok');
      fetchSimulado.mockImplementation(async () => limitado(retryAfter));
      return apiFetch('/api/ia/perfil', { method: 'POST' }).catch((e) => e);
    };

    it('lee Retry-After y dice cuantos minutos esperar', async () => {
      const fallo = await falla429('300');

      expect(fallo).toBeInstanceOf(ErrorHttp);
      expect(fallo.status).toBe(429);
      expect(fallo.reintentarEnSegundos).toBe(300);
      expect(fallo.message).toContain('5 minutos');
    });

    it('redondea hacia arriba y usa el singular', async () => {
      expect((await falla429('61')).message).toContain('2 minutos');
      const uno = await falla429('30');
      expect(uno.message).toContain('1 minuto.');
      expect(uno.message).not.toContain('1 minutos');
    });

    it.each([undefined, 'abc', '0', '-5', '1.5', 'Wed, 21 Oct 2026 07:28:00 GMT'])(
      'sin Retry-After valido (%s) no inventa el numero',
      async (cabecera) => {
        const fallo = await falla429(cabecera);

        expect(fallo.reintentarEnSegundos).toBeUndefined();
        expect(fallo.message).toContain('unos minutos');
      },
    );

    it('no reintenta solo: fetch se llama una vez', async () => {
      await falla429('300');

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });
  });
});
