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

  it('204SinCuerpo', async () => {
    getIdToken.mockResolvedValue('tok');
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await apiFetch('/api/x', { method: 'DELETE' })).toBeUndefined();
  });
});
