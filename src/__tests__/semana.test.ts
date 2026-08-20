import { describe, expect, it } from 'vitest';

import { rangoDeLaSemana, textoDeLaSemana } from '../utils/semana';

/**
 * El calculo de la semana.
 *
 * Sale de que en la pantalla de puntos NO se veia de que semana eran los datos.
 * En su lugar habia esto, escrito a mano en el JSX:
 *
 *     Datos guardados en: /weeklyTasks/{familyId}_{childId}_[semana]
 *
 * O sea, la ruta interna de Firestore enseñada al usuario, y "[semana]" como
 * texto fijo que no resolvia nada. Era un comentario de desarrollo que se colo
 * a la interfaz.
 *
 * Se saca a un modulo propio porque `familyService` ya tenia estas cuentas,
 * pero PRIVADAS: la interfaz no podia usarlas y por eso nadie las uso.
 *
 * La semana empieza en LUNES, que es como se cuenta en España.
 */

describe('rangoDeLaSemana encuentra el lunes y el domingo', () => {
  it('un miercoles devuelve el lunes anterior y el domingo siguiente', () => {
    // Miercoles 20 de agosto de 2026
    const { lunes, domingo } = rangoDeLaSemana(new Date(2026, 7, 20));

    expect(lunes.getDate()).toBe(17);
    expect(domingo.getDate()).toBe(23);
  });

  it('un lunes se devuelve a si mismo', () => {
    const { lunes } = rangoDeLaSemana(new Date(2026, 7, 17));

    expect(lunes.getDate()).toBe(17);
  });

  it('EL DOMINGO cae en la semana que TERMINA, no en la que empieza', () => {
    // Este es el caso que fallaba en familyService: con `getDay() - 1`, un
    // domingo (getDay() === 0) da +1 dia, o sea el LUNES SIGUIENTE. El domingo
    // veia la semana que todavia no ha empezado y sus tareas salian vacias.
    const { lunes, domingo } = rangoDeLaSemana(new Date(2026, 7, 23));

    expect(lunes.getDate()).toBe(17);
    expect(domingo.getDate()).toBe(23);
  });

  it('cruza el cambio de mes sin romperse', () => {
    // Martes 1 de septiembre de 2026: su lunes es del 31 de agosto
    const { lunes } = rangoDeLaSemana(new Date(2026, 8, 1));

    expect(lunes.getMonth()).toBe(7);
    expect(lunes.getDate()).toBe(31);
  });

  it('la hora no cuenta: el lunes empieza a las cero', () => {
    const { lunes } = rangoDeLaSemana(new Date(2026, 7, 20, 23, 59));

    expect(lunes.getHours()).toBe(0);
    expect(lunes.getMinutes()).toBe(0);
  });
});

describe('textoDeLaSemana lo dice en cristiano', () => {
  it('dentro del mismo mes no repite el mes', () => {
    expect(textoDeLaSemana(new Date(2026, 7, 20))).toBe('Semana del 17 al 23 de agosto');
  });

  it('a caballo entre dos meses los nombra los dos', () => {
    // Del lunes 31 de agosto al domingo 6 de septiembre
    expect(textoDeLaSemana(new Date(2026, 8, 1))).toBe(
      'Semana del 31 de agosto al 6 de septiembre',
    );
  });

  it('a caballo entre dos años dice el año', () => {
    // Del lunes 28 de diciembre de 2026 al domingo 3 de enero de 2027
    expect(textoDeLaSemana(new Date(2026, 11, 30))).toBe(
      'Semana del 28 de diciembre de 2026 al 3 de enero de 2027',
    );
  });
});
