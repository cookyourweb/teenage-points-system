import { describe, expect, it } from 'vitest';

import { PASOS_EFERA, resumirPerfilPadre } from '../utils/perfilPadre';

/**
 * El perfil del padre: el paso UNO del metodo.
 *
 * El padre se diagnostica a si mismo antes de tocar al hijo: "tengo que
 * conocerme yo para no pagarlo con mi hijo". Esta funcion pura es la parte
 * mecanica de eso: tomar las respuestas de los cinco pasos y devolver un
 * resumen EXPЛИCABLE — cada conclusion cita la respuesta que la produjo.
 *
 * Las tres reglas del metodo que este test fija:
 *   - Perfil parcial: se devuelven solo los pasos respondidos, sin inventar.
 *   - Sin respuestas: sin conclusiones. Un perfil vacio no es un perfil.
 *   - Respondio en desorden o con espacios de mas: no importa, el orden del
 *     resumen es siempre E-F-E-R-A.
 */

describe('resumirPerfilPadre', () => {
  it('un perfil parcial devuelve solo lo respondido, sin inventar', () => {
    const perfil = resumirPerfilPadre({
      error: 'Le repito las cosas mil veces',
      foco: 'Que levante su ropa del piso',
    });

    expect(perfil.completo).toBe(false);
    expect(perfil.respondidos).toEqual(['error', 'foco']);
    expect(perfil.faltantes).toEqual(['estrategia', 'rol', 'accion']);
    expect(perfil.pasos).toEqual([
      { paso: 'error', respuesta: 'Le repito las cosas mil veces' },
      { paso: 'foco', respuesta: 'Que levante su ropa del piso' },
    ]);
  });

  it('con los cinco pasos queda completo y cita cada respuesta', () => {
    const perfil = resumirPerfilPadre({
      rol: 'Es mi casa',
      error: 'No pongo limite',
      accion: 'Me desanim',
      foco: 'Claridad en lo que si quiero',
      estrategia: 'Aguantar la escalada',
    });

    expect(perfil.completo).toBe(true);
    expect(perfil.faltantes).toEqual([]);
    // El orden del resumen es EFERA aunque haya respondido desordenado.
    expect(perfil.pasos.map((paso) => paso.paso)).toEqual([...PASOS_EFERA]);
  });

  it('sin respuestas no genera ninguna conclusion', () => {
    const perfil = resumirPerfilPadre({});

    expect(perfil.completo).toBe(false);
    expect(perfil.pasos).toEqual([]);
    expect(perfil.faltantes).toEqual([...PASOS_EFERA]);
  });

  it('las respuestas en blanco o de espacios no cuentan', () => {
    const perfil = resumirPerfilPadre({
      error: '   ',
      foco: 'No pongo la mesa',
    });

    expect(perfil.completo).toBe(false);
    expect(perfil.respondidos).toEqual(['foco']);
    expect(perfil.faltantes).toContain('error');
  });

  it('recorta los espacios de mas de la respuesta', () => {
    const perfil = resumirPerfilPadre({ rol: '  Seguir la estrategia sin ceder  ' });

    expect(perfil.pasos[0]?.respuesta).toBe('Seguir la estrategia sin ceder');
  });
});
