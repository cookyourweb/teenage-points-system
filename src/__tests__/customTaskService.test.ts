import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CustomTask,
  getTasksByFamily,
  getActiveTasksByFamily,
  addCustomTask,
  updateCustomTask,
  deleteCustomTask,
} from '../services/customTaskService';

/**
 * El adaptador HTTP de tareas.
 *
 * Estos tests no prueban Spring Boot: prueban que el frontend habla con la API en
 * los terminos que la API entiende. Son el contrato visto desde este lado.
 *
 * Por eso se comprueba la URL, el metodo y el cuerpo de cada llamada, y no solo que
 * "devuelva algo". Un fallo tipico de estas migraciones es que el codigo funcione
 * contra un mock que acepta cualquier cosa y se rompa contra la API de verdad.
 */

const API = 'http://localhost:8080';

const tareaDeEjemplo: CustomTask = {
  id: 'tarea-1',
  nombre: 'Recoger la habitacion',
  tipo: 'diarias',
  puntos: 10,
  familyId: 'familia-1',
  createdBy: 'padre-1',
  isActive: true,
  description: 'Cama hecha y suelo despejado',
  createdAt: '2026-07-31T10:00:00Z',
  updatedAt: '2026-07-31T10:00:00Z',
};

/** Respuesta con cuerpo JSON, como las que devuelve la API en 200 y 201. */
const respondeCon = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fetchSimulado = vi.fn();

beforeEach(() => {
  fetchSimulado.mockReset();
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('getTasksByFamily', () => {
  it('pide las tareas de una familia y las devuelve', async () => {
    fetchSimulado.mockResolvedValue(respondeCon([tareaDeEjemplo]));

    const tareas = await getTasksByFamily('familia-1');

    const [url] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks?familyId=familia-1`);
    expect(tareas).toEqual([tareaDeEjemplo]);
  });

  it('escapa el familyId en la query', async () => {
    // Sin encodeURIComponent, un id con & o espacios rompe la URL en silencio
    // y la API recibe otra familia, o ninguna.
    fetchSimulado.mockResolvedValue(respondeCon([]));

    await getTasksByFamily('familia con espacio&otra');

    const [url] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks?familyId=familia%20con%20espacio%26otra`);
  });
});

describe('getActiveTasksByFamily', () => {
  it('anade soloActivas para que filtre el servidor', async () => {
    // El filtro va en el servidor y no en el cliente a proposito: traer todas y
    // descartar en el navegador significa mandar por la red datos que no se usan.
    fetchSimulado.mockResolvedValue(respondeCon([tareaDeEjemplo]));

    await getActiveTasksByFamily('familia-1');

    const [url] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks?familyId=familia-1&soloActivas=true`);
  });
});

describe('addCustomTask', () => {
  it('manda un POST con la tarea y devuelve la creada', async () => {
    const { id, createdAt, updatedAt, ...nueva } = tareaDeEjemplo;
    fetchSimulado.mockResolvedValue(respondeCon(tareaDeEjemplo, 201));

    const creada = await addCustomTask(nueva);

    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks`);
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual(nueva);
    // El id y las fechas los pone el servidor, no el cliente.
    expect(creada.id).toBe('tarea-1');
    expect(creada.createdAt).toBe('2026-07-31T10:00:00Z');
    expect(id).toBe('tarea-1');
    expect(createdAt).toBeDefined();
    expect(updatedAt).toBeDefined();
  });
});

describe('updateCustomTask', () => {
  it('manda un PUT a la tarea concreta', async () => {
    fetchSimulado.mockResolvedValue(respondeCon(tareaDeEjemplo));

    await updateCustomTask('tarea-1', tareaDeEjemplo);

    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks/tarea-1`);
    expect(opciones.method).toBe('PUT');
  });
});

describe('deleteCustomTask', () => {
  it('manda un DELETE y no intenta leer cuerpo', async () => {
    // La API responde 204 sin cuerpo. Si el adaptador hiciera .json() aqui,
    // reventaria al parsear una respuesta vacia.
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteCustomTask('tarea-1')).resolves.toBeUndefined();

    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${API}/api/tasks/tarea-1`);
    expect(opciones.method).toBe('DELETE');
  });
});

describe('cuando la API responde con error', () => {
  it('usa el detail del ProblemDetail como mensaje', async () => {
    // La API devuelve RFC 7807. Ese "detail" explica el fallo de verdad; perderlo
    // y lanzar "Failed to fetch" deja a quien depura sin la unica pista util.
    fetchSimulado.mockResolvedValue(
      respondeCon({ title: 'Bad Request', detail: 'los puntos no pueden ser negativos' }, 400),
    );

    await expect(updateCustomTask('tarea-1', tareaDeEjemplo)).rejects.toThrow(
      'los puntos no pueden ser negativos',
    );
  });

  it('no se queda callado si el cuerpo del error no es JSON', async () => {
    fetchSimulado.mockResolvedValue(new Response('502 Bad Gateway', { status: 502 }));

    await expect(getTasksByFamily('familia-1')).rejects.toThrow(/502/);
  });
});
