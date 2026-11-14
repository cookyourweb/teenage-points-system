import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({ getIdToken: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: { getIdToken } }, db: {} }));

import { getYo } from '../services/identidadService';

const fetchSimulado = vi.fn();

beforeEach(() => {
  fetchSimulado.mockReset();
  getIdToken.mockResolvedValue('tok');
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('getYo', () => {
  it('pide GET /api/me y devuelve quien reconoce el servidor', async () => {
    const yo = { uid: 'u1', email: 'a@b.c', emailVerificado: true, proveedor: 'password' };
    fetchSimulado.mockResolvedValue(
      new Response(JSON.stringify(yo), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const resultado = await getYo();

    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/me');
    expect(opciones.method ?? 'GET').toBe('GET');
    expect(resultado).toEqual(yo);
  });
});
