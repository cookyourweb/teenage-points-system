import { describe, it, expect } from 'vitest';
import { compararConGuardados, necesitaImportar, hoyEnMadrid } from '../utils/deberes/comparar';
import type { Deber, ItemImportado } from '../types/deberTypes';

const E1 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details';
const E2 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO12/details';
const E3 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO13/details';
const E6 = 'https://classroom.google.com/c/EJEMPLO1/p/EJEMPLO16';
const OTRO = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO14/details';
const CLAVE_MATERIAL = `MATERIAL https://www.youtube.com/watch?v=EJEMPLO5 ${E1}`;
const hoy = '2027-03-09';

const item = (over: Partial<ItemImportado> = {}): ItemImportado => ({
  linea: 2,
  tipo: 'EXAMEN',
  asignatura: 'Matemáticas',
  fecha: '2027-03-15',
  titulo: 'Examen del tema 4',
  enlace: E1,
  detalle: '',
  estado: null,
  imprimir: false,
  examen: null,
  ...over,
});

const guardado = (over: Partial<Deber> = {}): Deber => ({
  id: 'g1',
  familyId: 'fA',
  hijoId: 'Leo',
  tipo: 'EXAMEN',
  asignatura: 'Matemáticas',
  fecha: '2027-03-15',
  titulo: 'Examen del tema 4',
  enlace: E1,
  clave: E1,
  imprimir: false,
  isActive: true,
  ...over,
});

describe('compararConGuardados', () => {
  it('clasificaNuevoIgualYCambio', () => {
    const r = compararConGuardados(
      [item(), item({ enlace: OTRO }), item({ enlace: E3, titulo: 'Nuevo título' })],
      [guardado(), guardado({ id: 'g3', enlace: E3, clave: E3 })],
      { completa: true, hoy },
    );
    expect(r.nuevos.map((i) => i.enlace)).toEqual([OTRO]);
    expect(r.iguales).toHaveLength(1);
    expect(r.cambiados.map((c) => [c.guardado.id, c.cambios[0]?.campo])).toEqual([['g3', 'titulo']]);
  });

  it('cambiaLaFechaSaleComoCambio', () => {
    const r = compararConGuardados([item({ fecha: '2027-03-17' })], [guardado({ fecha: '2027-03-15' })], { completa: true, hoy });
    expect(r.cambiados).toHaveLength(1);
    expect(r.cambiados[0]?.cambios).toEqual([{ campo: 'fecha', antes: '2027-03-15', despues: '2027-03-17' }]);
  });

  it('espaciosDistintosNoSonCambio', () => {
    // un guardado antiguo o editado a mano con espacios de más; comparar normaliza los dos lados
    expect(
      compararConGuardados([item({ titulo: 'Examen del tema 4' })], [guardado({ titulo: '  Examen   del tema 4 ' })], { completa: true, hoy }).iguales,
    ).toHaveLength(1);
  });

  it('quitarLaFechaEsUnCambio', () => {
    const r = compararConGuardados([item({ fecha: null })], [guardado({ fecha: '2027-03-15' })], { completa: true, hoy });
    expect(r.cambiados).toHaveLength(1);
    expect(r.cambiados[0]?.cambios).toEqual([{ campo: 'fecha', antes: '2027-03-15', despues: '' }]);
  });

  it('unDeberArchivadoNoVuelveComoNuevo', () => {
    const igual = compararConGuardados([item()], [guardado({ isActive: false })], { completa: true, hoy });
    expect(igual.nuevos).toEqual([]);
    expect(igual.iguales).toHaveLength(1);
    const cambio = compararConGuardados([item({ fecha: '2027-03-17' })], [guardado({ isActive: false })], { completa: true, hoy });
    expect(cambio.nuevos).toEqual([]);
    expect(cambio.cambiados).toHaveLength(1);
    expect(cambio.cambiados[0]?.guardado.isActive).toBe(false);
  });

  it('yaNoApareceSoloEnLaVentanaYActivos', () => {
    const r = compararConGuardados(
      [],
      [
        guardado({ id: 'g1', fecha: '2027-03-02' }), // hoy-7: dentro
        guardado({ id: 'g2', fecha: '2027-03-01', clave: E2 }), // hoy-8: fuera, la receta ya no lo mira
        guardado({ id: 'g3', isActive: false, clave: E3 }), // archivado: no avisa
        guardado({ id: 'g5', tipo: 'MATERIAL', clave: CLAVE_MATERIAL }), // material: nunca avisa
        guardado({ id: 'g6', tipo: 'AVISO', clave: E6 }), // aviso: nunca avisa
      ],
      { completa: true, hoy },
    );
    expect(r.yaNoAparecen.map((d) => d.id)).toEqual(['g1']);
  });

  it('sinFechaCuentaParaYaNoAparece', () => {
    expect(compararConGuardados([], [guardado({ id: 'g4', fecha: undefined })], { completa: true, hoy }).yaNoAparecen).toHaveLength(1);
  });

  it('listaCortadaNoAvisaDeDesaparecidos', () => {
    // Guarda (verde desde el principio): con el stub vacío ya pasa; protege contra avisar con una pegada cortada.
    expect(compararConGuardados([], [guardado()], { completa: false, hoy }).yaNoAparecen).toEqual([]);
  });

  it('unaLineaConErrorNoCuentaComoQueYaNoAparece', () => {
    const entrega = guardado({ id: 'g8', tipo: 'ENTREGA', clave: E2, enlace: E2, fecha: '2027-03-10' });
    const sinMarca = compararConGuardados([], [entrega], { completa: true, hoy });
    expect(sinMarca.yaNoAparecen).toHaveLength(1);
    const conMarca = compararConGuardados([], [entrega], { completa: true, hoy, clavesConError: [E2] });
    expect(conMarca.yaNoAparecen).toEqual([]);
  });

  it('entregaActivaTambienAvisa', () => {
    const r = compararConGuardados([], [guardado({ id: 'g7', tipo: 'ENTREGA', clave: E2, fecha: '2027-03-10' })], { completa: true, hoy });
    expect(r.yaNoAparecen.map((d) => d.id)).toEqual(['g7']);
  });
});

describe('necesitaImportar', () => {
  it('necesitaImportar', () => {
    const ahora = new Date('2027-03-09T20:00:00Z');
    expect(necesitaImportar(undefined, ahora)).toBe(true);
    expect(necesitaImportar('2027-03-08T21:00:00Z', ahora)).toBe(false); // 23 h
    expect(necesitaImportar('2027-03-08T19:59:00Z', ahora)).toBe(true); // > 24 h
  });
});

describe('hoyEnMadrid', () => {
  it('hoyEsLaFechaDeMadrid', () => {
    expect(hoyEnMadrid(new Date('2027-03-08T23:30:00Z'))).toBe('2027-03-09'); // 00:30 en Madrid (CET)
    expect(hoyEnMadrid(new Date('2027-07-01T22:30:00Z'))).toBe('2027-07-02'); // 00:30 en Madrid (CEST)
  });
});
