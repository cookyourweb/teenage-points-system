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

/** Un deber leído del texto pegado; `enlace` y `examen` ya salen en forma canónica. */
export interface ItemImportado {
  linea: number;
  tipo: TipoDeber;
  asignatura: string;
  fecha: string | null;
  titulo: string;
  enlace: string;
  detalle: string;
  estado: EstadoEntrega | null;
  imprimir: boolean;
  examen: string | null;
}

export interface Duda {
  linea: number;
  asignatura: string;
  titulo: string;
  detalle: string;
  enlace: string | null;
}

export interface Cobertura {
  asignatura: string;
  examenes: number;
  entregas: number;
  material: number;
  avisos: number;
  dudas: number;
}

/** `texto`: la línea cruda, cortada a 80 caracteres. */
export interface ErrorDeLinea {
  linea: number;
  motivo: string;
  texto: string;
}

export interface ResultadoImportacion {
  items: ItemImportado[];
  dudas: Duda[];
  cobertura: Cobertura[];
  errores: ErrorDeLinea[];
  avisos: string[];
  completa: boolean;
}
