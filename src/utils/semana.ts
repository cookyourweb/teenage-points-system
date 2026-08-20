/**
 * El calculo de la semana, en un sitio.
 *
 * Sale de que en la pantalla de puntos NO se veia de que semana eran los datos.
 * En su lugar habia esto, escrito a mano en el JSX:
 *
 *     Datos guardados en: /weeklyTasks/{familyId}_{childId}_[semana]
 *
 * O sea, la ruta interna de Firestore enseñada al usuario, y `[semana]` como
 * texto fijo que no resolvia nada. Un comentario de desarrollo que se colo a la
 * interfaz.
 *
 * `familyService` ya tenia estas cuentas, pero PRIVADAS: la interfaz no podia
 * usarlas, y por eso nadie las uso. Aqui son publicas y estan probadas.
 *
 * La semana empieza en LUNES, que es como se cuenta en España.
 */

/** El lunes y el domingo de la semana en la que cae una fecha. */
export function rangoDeLaSemana(fecha: Date = new Date()): { lunes: Date; domingo: Date } {
  const lunes = new Date(fecha);

  // getDay() devuelve 0 para domingo y 1 para lunes. Restar `getDay() - 1` sin
  // mas manda el DOMINGO al lunes SIGUIENTE, asi que ese dia se veria la semana
  // que aun no ha empezado y las tareas saldrian vacias. El `|| 7` lo arregla:
  // el domingo cuenta como septimo dia de la semana que TERMINA.
  const diaDeLaSemana = lunes.getDay() || 7;
  lunes.setDate(lunes.getDate() - (diaDeLaSemana - 1));
  lunes.setHours(0, 0, 0, 0);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  return { lunes, domingo };
}

const MES = new Intl.DateTimeFormat('es-ES', { month: 'long' });

/**
 * La semana dicha en cristiano: "Semana del 17 al 23 de agosto".
 *
 * Se repite lo justo. El mes solo aparece dos veces si la semana cruza de mes,
 * y el año solo si cruza de año.
 */
export function textoDeLaSemana(fecha: Date = new Date()): string {
  const { lunes, domingo } = rangoDeLaSemana(fecha);

  const mismoAnio = lunes.getFullYear() === domingo.getFullYear();
  const mismoMes = mismoAnio && lunes.getMonth() === domingo.getMonth();

  if (mismoMes) {
    return `Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${MES.format(domingo)}`;
  }

  const inicio = mismoAnio
    ? `${lunes.getDate()} de ${MES.format(lunes)}`
    : `${lunes.getDate()} de ${MES.format(lunes)} de ${lunes.getFullYear()}`;

  const fin = mismoAnio
    ? `${domingo.getDate()} de ${MES.format(domingo)}`
    : `${domingo.getDate()} de ${MES.format(domingo)} de ${domingo.getFullYear()}`;

  return `Semana del ${inicio} al ${fin}`;
}

/**
 * La fecha en formato de maquina, para el atributo `dateTime` de `<time>`.
 * Se construye a mano y no con toISOString(), que convierte a UTC y puede
 * cambiar el dia.
 */
export function comoAtributoFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * El identificador de la semana, en formato ISO 8601: `2026-W34`.
 *
 * DECIDE DONDE SE GUARDAN LOS DATOS: la ruta es
 * `/weeklyTasks/{familyId}_{childId}_{weekId}`. Si este valor cambia a mitad
 * de semana, se escribe en otro documento y lo anterior se pierde de vista.
 *
 * Y eso es exactamente lo que pasaba. La version que habia en `familyService`
 * daba, medido dia a dia:
 *
 *     lunes 17-ago a sabado 22-ago  ->  2026-W34
 *     DOMINGO 23-ago                ->  2026-W35   <-- otra semana
 *
 * O sea: lo que se marcaba el domingo se guardaba en la semana siguiente, y el
 * lunes habia desaparecido. El domingo es el dia que mas se repasa la semana.
 *
 * Se usa la definicion ISO 8601 porque es la que ya se usa en España y la que
 * resuelve los bordes sin inventar reglas: la semana 1 de un año es la que
 * contiene su primer jueves.
 */
export function idDeLaSemana(fecha: Date = new Date()): string {
  // Se trabaja sobre el JUEVES de la semana. Es el truco de ISO 8601: el jueves
  // siempre cae en el año al que pertenece la semana, asi que resuelve solo el
  // caso de enero, donde los primeros dias pueden ser del año anterior.
  const jueves = new Date(fecha);
  jueves.setHours(0, 0, 0, 0);
  jueves.setDate(jueves.getDate() + 3 - ((jueves.getDay() + 6) % 7));

  const primerJueves = new Date(jueves.getFullYear(), 0, 4);
  primerJueves.setDate(primerJueves.getDate() + 3 - ((primerJueves.getDay() + 6) % 7));

  const semanasDeDiferencia = Math.round(
    (jueves.getTime() - primerJueves.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  return `${jueves.getFullYear()}-W${String(semanasDeDiferencia + 1).padStart(2, '0')}`;
}
