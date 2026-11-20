export type TipoDeber = 'EXAMEN' | 'ENTREGA' | 'MATERIAL' | 'AVISO';
export type EstadoEntrega = 'PENDIENTE' | 'ENTREGADA' | 'ATRASADA';

/** Topes iguales en front y back: el texto pegado es de fuera. */
export const TOPES = {
  asignatura: 60,
  titulo: 120,
  detalle: 500,
  enlace: 500,
  texto: 200_000,
  lineas: 300,
} as const;
