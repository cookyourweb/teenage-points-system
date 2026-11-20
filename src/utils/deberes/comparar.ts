import type { Cambio, CampoComparado, Comparacion, Deber, ItemImportado } from '../../types/deberTypes';
import { claveDeDeber } from './enlaces';

const DIA_MS = 24 * 60 * 60 * 1000;
const VENTANA_DIAS = 7;

const normalizar = (texto: string | null | undefined): string => (texto ?? '').trim().replace(/\s+/g, ' ');

function valoresDelItem(i: ItemImportado): Record<CampoComparado, string> {
  return {
    asignatura: normalizar(i.asignatura),
    fecha: normalizar(i.fecha),
    titulo: normalizar(i.titulo),
    detalle: normalizar(i.detalle),
    estado: normalizar(i.estado),
    imprimir: i.imprimir ? 'sí' : 'no',
  };
}

function valoresDelGuardado(g: Deber): Record<CampoComparado, string> {
  return {
    asignatura: normalizar(g.asignatura),
    fecha: normalizar(g.fecha),
    titulo: normalizar(g.titulo),
    detalle: normalizar(g.detalle),
    estado: normalizar(g.estado),
    imprimir: g.imprimir ? 'sí' : 'no',
  };
}

const CAMPOS: CampoComparado[] = ['asignatura', 'fecha', 'titulo', 'detalle', 'estado', 'imprimir'];

function cambiosEntre(item: ItemImportado, guardado: Deber): Cambio[] {
  const nuevo = valoresDelItem(item);
  const viejo = valoresDelGuardado(guardado);
  return CAMPOS.filter((c) => nuevo[c] !== viejo[c]).map((campo) => ({ campo, antes: viejo[campo], despues: nuevo[campo] }));
}

/** 'aaaa-mm-dd' de hace `dias` días, en aritmética de calendario (sin horas ni zonas). */
function restarDias(fechaIso: string, dias: number): string {
  return new Date(Date.parse(`${fechaIso}T00:00:00Z`) - dias * DIA_MS).toISOString().slice(0, 10);
}

/** Cruza por clave contra TODO lo guardado (archivados incluidos); no borra ni desarchiva nada. */
export function compararConGuardados(
  items: ItemImportado[],
  guardados: Deber[],
  opciones: { completa: boolean; hoy: string },
): Comparacion {
  const porClave = new Map(guardados.map((g) => [g.clave, g]));
  const vistas = new Set<string>();
  const resultado: Comparacion = { nuevos: [], cambiados: [], iguales: [], yaNoAparecen: [] };

  for (const item of items) {
    const clave = claveDeDeber(item);
    vistas.add(clave);
    const guardado = porClave.get(clave);
    if (!guardado) {
      resultado.nuevos.push(item);
      continue;
    }
    const cambios = cambiosEntre(item, guardado);
    if (cambios.length === 0) resultado.iguales.push(item);
    else resultado.cambiados.push({ item, guardado, cambios });
  }

  if (opciones.completa) {
    const desde = restarDias(opciones.hoy, VENTANA_DIAS);
    resultado.yaNoAparecen = guardados.filter(
      (g) =>
        g.isActive &&
        (g.tipo === 'EXAMEN' || g.tipo === 'ENTREGA') &&
        !vistas.has(g.clave) &&
        (!g.fecha || g.fecha >= desde),
    );
  }
  return resultado;
}

/** Hay que importar si nunca se hizo o pasaron más de 24 h desde la última. */
export function necesitaImportar(ultima: string | undefined, ahora: Date): boolean {
  if (!ultima) return true;
  const t = Date.parse(ultima);
  if (Number.isNaN(t)) return true;
  return ahora.getTime() - t > DIA_MS;
}

/** 'aaaa-mm-dd' en Europe/Madrid, no en UTC. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}
