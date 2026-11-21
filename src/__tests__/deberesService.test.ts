import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../services/http', async (original) => ({
  ...(await original<typeof import('../services/http')>()),
  apiFetch,
}));

import { ErrorHttp } from '../services/http';
import {
  aDeberNuevo,
  getDeberes,
  getUltimaImportacion,
  guardarImportacion,
} from '../services/deberesService';
import type { Deber, ItemImportado } from '../types/deberTypes';

const item = (n: number, extra: Partial<ItemImportado> = {}): ItemImportado => ({
  linea: n,
  tipo: 'ENTREGA',
  asignatura: 'Lengua',
  fecha: '2027-03-01',
  titulo: `Deber ${n}`,
  enlace: `https://classroom.google.com/c/EJEMPLO${n}/a/EJEMPLO${n}/details`,
  detalle: '',
  estado: null,
  imprimir: false,
  examen: null,
  ...extra,
});

const guardado = (extra: Partial<Deber> = {}): Deber => ({
  id: 'd1',
  familyId: 'fA',
  hijoId: 'leo',
  tipo: 'ENTREGA',
  asignatura: 'Lengua',
  titulo: 'Deber 1',
  enlace: 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO1/details',
  clave: 'k',
  imprimir: false,
  isActive: true,
  ...extra,
});

const llamadas = (metodo?: string) =>
  apiFetch.mock.calls.filter(([, op]) => (op?.method ?? 'GET') === (metodo ?? 'GET'));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

describe('deberesService', () => {
  it('rutasEscapadas', async () => {
    apiFetch.mockResolvedValue([]);
    await getDeberes('f A', 'leo/1', true);
    expect(apiFetch).toHaveBeenCalledWith('/api/familias/f%20A/hijos/leo%2F1/deberes?soloActivos=true');
  });

  it('nuevoEsPostYCambioEsPut', async () => {
    await guardarImportacion('fA', 'leo', [{ item: item(1) }, { item: item(2), guardado: guardado({ id: 'd1' }) }]);
    const posts = llamadas('POST');
    const puts = llamadas('PUT').map(([r]) => r);
    expect(posts.map(([r]) => r)).toEqual(['/api/familias/fA/hijos/leo/deberes']);
    expect(puts).toEqual([
      '/api/familias/fA/hijos/leo/deberes/d1',
      '/api/familias/fA/hijos/leo/importaciones-deberes',
    ]);
    expect(puts.at(-1)).toBe('/api/familias/fA/hijos/leo/importaciones-deberes');
  });

  it('sinDecisionesSoloRegistraLaImportacion', async () => {
    const r = await guardarImportacion('fA', 'leo', []);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/familias/fA/hijos/leo/importaciones-deberes', { method: 'PUT' });
    expect(r).toEqual({ guardados: 0, fallidos: [] });
  });

  it('sesentaDeberesSonSesentaPeticionesBajoElTope', async () => {
    let pendientes = 0;
    let maximo = 0;
    apiFetch.mockImplementation(async () => {
      pendientes++;
      maximo = Math.max(maximo, pendientes);
      await new Promise((r) => setTimeout(r, 0));
      pendientes--;
      return {};
    });
    const largo = (n: number) => '€'.repeat(n);
    const enlaceLargo = `https://classroom.google.com/c/${'€'.repeat(400)}`.slice(0, 500);
    const decisiones = Array.from({ length: 60 }, (_, i) => ({
      item: item(i, {
        asignatura: largo(60),
        titulo: largo(120),
        detalle: largo(500),
        enlace: enlaceLargo,
        examen: enlaceLargo,
        estado: 'PENDIENTE',
      }),
    }));
    await guardarImportacion('fA', 'leo', decisiones);
    const deDeber = llamadas('POST');
    expect(deDeber).toHaveLength(60);
    for (const [, op] of deDeber) {
      expect(new TextEncoder().encode(op.body as string).length).toBeLessThan(16384);
    }
    expect(maximo).toBeGreaterThan(1);
    expect(maximo).toBeLessThanOrEqual(4);
  });

  it('unFalloNoParaElResto', async () => {
    const d = [item(1), item(2), item(3)].map((i) => ({ item: i }));
    apiFetch
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ErrorHttp(409, 'x', 'Deber repetido'))
      .mockResolvedValueOnce({});
    const r = await guardarImportacion('fA', 'leo', d);
    expect(r).toEqual({
      guardados: 2,
      fallidos: [{ item: d[1].item, motivo: 'Ya estaba guardado: vuelve a importar para ver el cambio' }],
    });
    expect(llamadas('PUT')).toHaveLength(0);
  });

  it('otroErrorUsaSuMensaje', async () => {
    apiFetch.mockRejectedValueOnce(new ErrorHttp(400, 'el titulo es obligatorio'));
    const r = await guardarImportacion('fA', 'leo', [{ item: item(1) }]);
    expect(r.fallidos[0].motivo).toBe('el titulo es obligatorio');
  });

  it('elCuerpoSiempreLlevaImprimirEIsActiveYNuncaClave', async () => {
    await guardarImportacion('fA', 'leo', [{ item: item(1) }]);
    const cuerpo = JSON.parse(llamadas('POST')[0][1].body as string);
    expect(cuerpo.imprimir).toBe(false);
    expect(cuerpo.isActive).toBe(true);
    for (const prohibido of ['clave', 'puntos', 'id', 'familyId', 'hijoId', 'createdBy']) {
      expect(cuerpo).not.toHaveProperty(prohibido);
    }
    expect(cuerpo).not.toHaveProperty('fecha', null);
  });

  it('fechaNullSinCampo', () => {
    expect(aDeberNuevo(item(1, { fecha: null }))).not.toHaveProperty('fecha');
    expect(aDeberNuevo(item(1)).fecha).toBe('2027-03-01');
  });

  it('unCambioNoDesarchiva', () => {
    expect(aDeberNuevo(item(1), guardado({ isActive: false })).isActive).toBe(false);
    expect(aDeberNuevo(item(1)).isActive).toBe(true);
  });

  it('ultimaImportacionVacia', async () => {
    apiFetch.mockResolvedValue({});
    expect(await getUltimaImportacion('fA', 'leo')).toBeUndefined();
    apiFetch.mockResolvedValue({ en: '2027-03-01T10:00:00Z' });
    expect(await getUltimaImportacion('fA', 'leo')).toBe('2027-03-01T10:00:00Z');
  });
});
