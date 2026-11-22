import { describe, expect, it } from 'vitest';

import type { Deber } from '../types/deberTypes';
import { agruparPorFecha } from '../utils/deberes/agrupar';

const deber = (id: string, extra: Partial<Deber> = {}): Deber => ({
  id,
  familyId: 'fA',
  hijoId: 'leo',
  tipo: 'ENTREGA',
  asignatura: 'Lengua',
  titulo: `Deber ${id}`,
  enlace: `https://classroom.google.com/c/EJEMPLO/a/${id}/details`,
  clave: `clave-${id}`,
  imprimir: false,
  isActive: true,
  ...extra,
});

describe('agruparPorFecha', () => {
  it('ordenaPorFecha / sinFechaVaAlFinal: fechas ascendentes y el sin fecha al final', () => {
    const { dias } = agruparPorFecha([
      deber('a', { fecha: '2027-03-10' }),
      deber('b'),
      deber('c', { fecha: '2027-03-08' }),
    ]);
    expect(dias.map((d) => d.fecha)).toEqual(['2027-03-08', '2027-03-10', null]);
  });

  it('materialColgadoDeSuExamen: no hay fila propia', () => {
    const examen = deber('e1', { tipo: 'EXAMEN', fecha: '2027-03-12' });
    const material = deber('m1', { tipo: 'MATERIAL', examen: examen.enlace, fecha: '2027-03-05' });
    const { dias, materialSinExamen } = agruparPorFecha([material, examen]);
    expect(dias).toHaveLength(1);
    expect(dias[0].deberes).toHaveLength(1);
    expect(dias[0].deberes[0].materiales).toEqual([material]);
    expect(materialSinExamen).toEqual([]);
  });

  it('materialSinExamenVaASuGrupo: el examen no esta en la lista', () => {
    const material = deber('m1', { tipo: 'MATERIAL', examen: 'https://classroom.google.com/c/EJEMPLO/a/zz/details' });
    const { dias, materialSinExamen } = agruparPorFecha([material]);
    expect(dias).toEqual([]);
    expect(materialSinExamen).toEqual([material]);
  });
});
