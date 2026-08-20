import { describe, expect, it } from 'vitest';

import { idDeLaSemana, rangoDeLaSemana } from '../utils/semana';

/**
 * El identificador de la semana, que decide DONDE SE GUARDAN LOS DATOS.
 *
 * La ruta es `/weeklyTasks/{familyId}_{childId}_{weekId}`, asi que si el
 * `weekId` cambia, se escribe en otro documento.
 *
 * EL FALLO QUE HABIA en familyService, medido dia a dia sobre una semana real:
 *
 *   lunes 17-ago a sabado 22-ago  ->  2026-W34
 *   DOMINGO 23-ago                ->  2026-W35   <-- otra semana
 *
 * No era solo que se viera mal: **el domingo escribia en OTRO documento**. Se
 * marcaban tareas el domingo, se guardaban en W35, y el lunes se volvia a W34
 * y habian desaparecido. Y el domingo es el dia que mas se repasa la semana.
 *
 * La causa: la formula usaba `getDay()`, que devuelve 0 para el domingo, y lo
 * trataba como el primer dia de la semana siguiente en vez de como el ultimo
 * de la que termina.
 */

describe('el id NO cambia a mitad de semana', () => {
  it('los siete dias de una semana dan el MISMO id', () => {
    // Es la propiedad que importa: si el id cambia, los datos se parten.
    const lunes = new Date(2026, 7, 17);
    const ids = new Set(
      Array.from({ length: 7 }, (_, i) => {
        const dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);
        return idDeLaSemana(dia);
      }),
    );

    expect([...ids]).toHaveLength(1);
  });

  it('el DOMINGO sigue en la semana que termina', () => {
    // El caso concreto que estaba roto.
    expect(idDeLaSemana(new Date(2026, 7, 23))).toBe(idDeLaSemana(new Date(2026, 7, 17)));
  });

  it('el lunes siguiente SI cambia de id', () => {
    expect(idDeLaSemana(new Date(2026, 7, 24))).not.toBe(idDeLaSemana(new Date(2026, 7, 23)));
  });
});

describe('el id es el de la semana ISO, que es el estandar', () => {
  it('tiene el formato AAAA-Wnn', () => {
    expect(idDeLaSemana(new Date(2026, 7, 20))).toMatch(/^\d{4}-W\d{2}$/);
  });

  it.each([
    // Casos comprobables contra el calendario ISO 8601
    [new Date(2026, 0, 1), '2026-W01'], // jueves 1 de enero de 2026
    [new Date(2026, 7, 20), '2026-W34'], // jueves 20 de agosto
    [new Date(2027, 0, 4), '2027-W01'], // lunes 4 de enero de 2027
  ])('%s es %s', (fecha, esperado) => {
    expect(idDeLaSemana(fecha)).toBe(esperado);
  });

  it('los primeros dias de enero pueden pertenecer al año ANTERIOR', () => {
    // 1 de enero de 2027 es viernes: por ISO 8601 pertenece a la semana 53 de
    // 2026, porque esa semana tiene mas dias en 2026 que en 2027. Es la trampa
    // clasica del calculo de semanas, y por eso el AÑO del id sale del calculo
    // y no de `fecha.getFullYear()`.
    expect(idDeLaSemana(new Date(2027, 0, 1))).toBe('2026-W53');
  });
});

describe('el id concuerda con lo que se le enseña al usuario', () => {
  it('el lunes del rango cae dentro de la semana del id', () => {
    // Si el texto dice "Semana del 17 al 23" y el id apunta a otra semana,
    // el usuario ve una cosa y se guarda otra. Tienen que ir juntos.
    const domingo = new Date(2026, 7, 23);
    const { lunes } = rangoDeLaSemana(domingo);

    expect(idDeLaSemana(lunes)).toBe(idDeLaSemana(domingo));
  });
});
