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

/** Un deber guardado, tal como lo devuelve la API. */
export interface Deber {
  id: string;
  familyId: string;
  hijoId: string;
  tipo: TipoDeber;
  asignatura: string;
  fecha?: string;
  titulo: string;
  enlace: string;
  clave: string;
  detalle?: string;
  estado?: EstadoEntrega;
  imprimir: boolean;
  examen?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CampoComparado = 'asignatura' | 'fecha' | 'titulo' | 'detalle' | 'estado' | 'imprimir';

export interface Cambio {
  campo: CampoComparado;
  antes: string;
  despues: string;
}

/** `guardado.isActive === false` se muestra como «Archivado». */
export interface Comparacion {
  nuevos: ItemImportado[];
  cambiados: { item: ItemImportado; guardado: Deber; cambios: Cambio[] }[];
  iguales: ItemImportado[];
  yaNoAparecen: Deber[];
}
