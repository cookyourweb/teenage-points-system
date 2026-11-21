import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({ getIdToken: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: { getIdToken } }, db: {} }));

import {
  getEleccionesTipo,
  getPreguntasTipo,
  guardarEleccionTipo,
  pedirPerfil,
} from '../services/coachService';

const fetchSimulado = vi.fn();

const responde = (cuerpo: unknown) =>
  fetchSimulado.mockResolvedValue(
    new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );

beforeEach(() => {
  fetchSimulado.mockReset();
  getIdToken.mockResolvedValue('tok');
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('coachService', () => {
  it('getPreguntasTipo: GET /api/ia/tipo/preguntas', async () => {
    const preguntas = { colores: [{ id: 'c1', nombre: 'Rojo', descripcion: 'd' }], afirmaciones: [{ id: 'a1', texto: 't' }] };
    responde(preguntas);

    const r = await getPreguntasTipo();

    const [url, op] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/ia/tipo/preguntas');
    expect(op.method ?? 'GET').toBe('GET');
    expect(r).toEqual(preguntas);
  });

  it('pedirPerfil: POST /api/ia/tipo/perfil con { respuestas }', async () => {
    responde({ colores: [{ id: 'c1', nombre: 'Rojo', nivel: 'MUCHO' }] });

    const r = await pedirPerfil({ a1: 'NUNCA', a2: 'A_MENUDO' });

    const [url, op] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/ia/tipo/perfil');
    expect(op.method).toBe('POST');
    expect(JSON.parse(op.body)).toEqual({ respuestas: { a1: 'NUNCA', a2: 'A_MENUDO' } });
    expect(r.colores[0].nivel).toBe('MUCHO');
  });

  it('guardarEleccionTipo: PUT /api/familias/{f}/hijos/{h}/tipo con { colores, principal }', async () => {
    responde({ colores: ['c1'], elegidaEn: '2026-11-15T10:00:00Z' });

    await guardarEleccionTipo('fam 1', 'hijo/1', { colores: ['c1', 'c2'], principal: null });

    const [url, op] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/familias/fam%201/hijos/hijo%2F1/tipo');
    expect(op.method).toBe('PUT');
    expect(JSON.parse(op.body)).toEqual({ colores: ['c1', 'c2'], principal: null });
  });

  it('getEleccionesTipo: GET en la misma ruta', async () => {
    const cuerpo = { elecciones: [], coinciden: true };
    responde(cuerpo);

    const r = await getEleccionesTipo('f1', 'h1');

    const [url, op] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/familias/f1/hijos/h1/tipo');
    expect(op.method ?? 'GET').toBe('GET');
    expect(r).toEqual(cuerpo);
  });
});
