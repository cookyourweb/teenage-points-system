import { beforeEach, describe, expect, it, vi } from 'vitest';

const { asegurarMembresia } = vi.hoisted(() => ({ asegurarMembresia: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: null }, db: {} }));
vi.mock('../services/identidadService', () => ({ asegurarMembresia }));

import { getTasksByFamily } from '../services/customTaskService';
import { ErrorHttp } from '../services/http';

/**
 * En el primer acceso de una cuenta la membresia aun no existe cuando las pantallas
 * piden las tareas: la API contesta 404 "Familia no encontrada". El servicio la
 * asegura y repite la peticion, sin que los componentes se enteren.
 */

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const familiaNoEncontrada = () =>
  json({ title: 'Familia no encontrada', detail: 'No existe la familia o no eres miembro', status: 404 }, 404);

const fetchSimulado = vi.fn();

beforeEach(() => {
  fetchSimulado.mockReset();
  asegurarMembresia.mockReset();
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('customTaskService ante "Familia no encontrada"', () => {
  it('reintentaTrasAsegurarMembresia: 404 familia, asegura y el reintento da 200', async () => {
    fetchSimulado
      .mockResolvedValueOnce(familiaNoEncontrada())
      .mockResolvedValueOnce(json([{ id: 't1' }]));
    asegurarMembresia.mockResolvedValue({ familyId: 'f1', papel: 'ADULTO' });

    const tareas = await getTasksByFamily('f1');

    expect(tareas).toEqual([{ id: 't1' }]);
    expect(asegurarMembresia).toHaveBeenCalledTimes(1);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it('noReintentaOtros404: "Tarea no encontrada" no dispara asegurar', async () => {
    fetchSimulado.mockResolvedValue(json({ title: 'Tarea no encontrada', detail: 'no existe' }, 404));

    const fallo = await getTasksByFamily('f1').catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorHttp);
    expect(asegurarMembresia).not.toHaveBeenCalled();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('soloUnaVez: 404 y 404 asegura una vez y propaga el error original', async () => {
    fetchSimulado.mockImplementation(async () => familiaNoEncontrada());
    asegurarMembresia.mockResolvedValue({ familyId: 'f1', papel: 'ADULTO' });

    const fallo = await getTasksByFamily('f1').catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorHttp);
    expect(fallo.status).toBe(404);
    expect(fallo.titulo).toBe('Familia no encontrada');
    expect(asegurarMembresia).toHaveBeenCalledTimes(1);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it('concurrentesCompartenUnaLlamada: N peticiones, una sola llamada a /yo', async () => {
    let resolver: (m: unknown) => void = () => {};
    asegurarMembresia.mockReturnValue(new Promise((r) => (resolver = r)));
    let primeras = 0;
    fetchSimulado.mockImplementation(async () => (primeras++ < 3 ? familiaNoEncontrada() : json([])));

    const todas = Promise.all([getTasksByFamily('f1'), getTasksByFamily('f1'), getTasksByFamily('f1')]);
    await vi.waitFor(() => expect(primeras).toBe(3));
    resolver({ familyId: 'f1', papel: 'ADULTO' });

    await expect(todas).resolves.toEqual([[], [], []]);
    expect(asegurarMembresia).toHaveBeenCalledTimes(1);
  });
});
