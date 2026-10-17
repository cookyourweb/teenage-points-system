/**
 * El perfil del padre — el paso UNO del metodo.
 *
 * El Metodo dice: primero el padre se diagnostica a si mismo ("tengo que
 * conocerme yo para no pagarlo con mi hijo"), despues se mira al hijo. Este
 * modulo guarda SOLO la estructura de eso: los cinco pasos y su orden.
 *
 * El TEXTO de cada paso y su explicacion viven en Firestore (coleccion
 * `categorias`), no aca: el repo es publico y el metodo es de Vicent Gines
 * Romero (ver NOTICE.md). Aca no hay ni una frase del metodo, solo nombres.
 *
 * La regla de este modulo: el resumen es EXPLICABLE. Cada paso del resumen
 * cita la respuesta literal que lo produjo. Si no la hay, no existe la
 * conclusion — un perfil a medias no se rellena con generalidades.
 */

/** Los cinco pasos del metodo, en su orden. Solo nombres, el contenido esta en Firestore. */
export const PASOS_EFERA = ['error', 'foco', 'estrategia', 'rol', 'accion'] as const;

export type PasoEf = (typeof PASOS_EFERA)[number];

/** Lo que la pantalla del cuestionario entrega: hasta una respuesta por paso. */
export type RespuestasPerfilPadre = Partial<Record<PasoEf, string>>;

export interface PasoDelPerfil {
  paso: PasoEf;
  respuesta: string;
}

export interface PerfilPadreResumido {
  completo: boolean;
  /** Los pasos con respuesta, siempre en orden E-F-E-R-A. */
  respondidos: PasoEf[];
  /** Lo que falta responder, en el mismo orden. */
  faltantes: PasoEf[];
  /** Cada paso con su respuesta literal. Sin respuesta, no aparece. */
  pasos: PasoDelPerfil[];
}

/** La respuesta vale si tiene algo aparte de espacios. */
function responde(respuesta: string | undefined): respuesta is string {
  return (respuesta ?? '').trim() !== '';
}

export function resumirPerfilPadre(
  respuestas: RespuestasPerfilPadre = {},
): PerfilPadreResumido {
  const respondidos = PASOS_EFERA.filter((paso) => responde(respuestas[paso]));

  return {
    completo: respondidos.length === PASOS_EFERA.length,
    respondidos,
    faltantes: PASOS_EFERA.filter((paso) => !respondidos.includes(paso)),
    pasos: respondidos.map((paso) => ({ paso, respuesta: respuestas[paso]!.trim() })),
  };
}
