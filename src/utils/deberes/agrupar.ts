import type { Deber } from '../../types/deberTypes';
import type { DeberNuevo } from '../../services/deberesService';

export interface DiaDeDeberes {
  fecha: string | null;
  deberes: { deber: Deber; materiales: Deber[] }[];
}

/**
 * Fechas ascendentes y «sin fecha» al final (nunca se descarta nada). El MATERIAL no es
 * fila propia: cuelga del EXAMEN cuyo `enlace` es su `examen`; si ese examen no esta, va aparte.
 */
export function agruparPorFecha(deberes: Deber[]): { dias: DiaDeDeberes[]; materialSinExamen: Deber[] } {
  const examenes = new Set(deberes.filter((d) => d.tipo === 'EXAMEN').map((d) => d.enlace));
  const materialDe = (examen: Deber) => deberes.filter((d) => d.tipo === 'MATERIAL' && d.examen === examen.enlace);
  const materialSinExamen = deberes.filter((d) => d.tipo === 'MATERIAL' && !(d.examen && examenes.has(d.examen)));

  const porFecha = new Map<string | null, DiaDeDeberes>();
  for (const deber of deberes) {
    if (deber.tipo === 'MATERIAL') continue;
    const fecha = deber.fecha ?? null;
    const dia = porFecha.get(fecha) ?? { fecha, deberes: [] };
    dia.deberes.push({ deber, materiales: deber.tipo === 'EXAMEN' ? materialDe(deber) : [] });
    porFecha.set(fecha, dia);
  }

  const dias = [...porFecha.values()].sort((a, b) => {
    if (a.fecha === b.fecha) return 0;
    if (a.fecha === null) return 1;
    if (b.fecha === null) return -1;
    return a.fecha < b.fecha ? -1 : 1;
  });
  return { dias, materialSinExamen };
}

/** El mismo deber, archivado: el cuerpo de la API sin lo que calcula el servidor. */
export function archivado(deber: Deber): DeberNuevo {
  const { id: _id, familyId: _f, hijoId: _h, clave: _c, createdBy: _b, createdAt: _ca, updatedAt: _u, ...resto } = deber;
  return { ...resto, isActive: false };
}
