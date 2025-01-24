//faqTypes.ts
export interface Solucion {
  id: string;
  texto: string;
}

export interface Pregunta {
  id: string;
  titulo: string;
  definicion: string;
  soluciones: Solucion[];
}

export interface Categoria {
  id: string;
  titulo: string;
  definicion: string;
  preguntas: Pregunta[];
}
