/**
 * El perfil del padre — el paso UNO del metodo.
 *
 * El metodo empieza por el padre: conocerse a si mismo y cambiar la mirada
 * hacia el hijo, ANTES de mirar al hijo. Por eso la pantalla de configuracion
 * pregunta del padre y no del hijo. El por que y el como de cada paso viven
 * en Firestore (coleccion `categorias`); este modulo guarda SOLO la
 * estructura: los cinco pasos y su orden.
 *
 * Repo publico + metodo de Vicent Gines Romero: no copiar texto del metodo aca
 * (ver NOTICE.md). El contenido viaja al prompt en tiempo de ejecucion.
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
