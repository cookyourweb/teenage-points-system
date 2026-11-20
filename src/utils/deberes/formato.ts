import {
  TOPES,
  type Cobertura,
  type Duda,
  type ErrorDeLinea,
  type EstadoEntrega,
  type ItemImportado,
  type ResultadoImportacion,
  type TipoDeber,
} from '../../types/deberTypes';
import { claveDeDeber, claveDeEnlace, esEnlaceSeguro, esPortadaDeClassroom } from './enlaces';

const CABECERA = /^=== DEBERES v(\d+) ===$/i;
const FIN = /^=== FIN ===$/i;
const TIPOS_DE_ITEM: readonly string[] = ['EXAMEN', 'ENTREGA', 'MATERIAL', 'AVISO'];
const ESTADOS: readonly string[] = ['PENDIENTE', 'ENTREGADA', 'ATRASADA'];
const COLUMNAS_ITEM = 9;
const COLUMNAS_COBERTURA = 7;
const AYUDA_PIPE = '(¿hay un | dentro de un texto?)';
// Control (U+0000-U+001F, U+007F) y dirección (U+202A-202E, U+2066-2069): igual que el servidor.
// eslint-disable-next-line no-control-regex
const CONTROL_O_DIRECCION = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/;

const limpiar = (campo: string): string => campo.replace(/\s+/g, ' ').trim();

function vacio(avisos: string[], errores: ErrorDeLinea[], motivo: string): ResultadoImportacion {
  return {
    items: [],
    dudas: [],
    cobertura: [],
    errores: [...errores, { linea: 0, motivo, texto: '' }],
    avisos,
    completa: false,
    clavesConError: [],
  };
}

interface Reglas {
  sujeto: string;
  falta: string;
  tope: number;
  obligatorio: boolean;
}

/** Devuelve el motivo del fallo o null. Nunca recorta: lo que pasa del tope es error. */
function validarTexto(valor: string, r: Reglas): string | null {
  if (CONTROL_O_DIRECCION.test(valor)) return `${r.sujeto} tiene caracteres de control o de dirección`;
  if (valor.length > r.tope) return `${r.sujeto} pasa de ${r.tope} caracteres`;
  if (r.obligatorio && valor === '') return r.falta;
  return null;
}

function validarFecha(valor: string): string | null {
  if (valor === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return `La fecha ${valor.slice(0, 20)} no tiene el formato aaaa-mm-dd`;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  const existe = f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
  return existe ? null : `La fecha ${valor} no existe`;
}

function validarEnlace(valor: string, sujeto: string, falta: string): string | null {
  if (valor === '') return falta;
  if (valor.length > TOPES.enlace) return `${sujeto} pasa de ${TOPES.enlace} caracteres`;
  if (!esEnlaceSeguro(valor)) return `${sujeto} no es https:// seguro`;
  if (esPortadaDeClassroom(valor)) return `${sujeto} es la portada de Classroom: falta el del deber`;
  return null;
}

type LineaLeida = { ok: true; item: ItemImportado } | { ok: true; duda: Duda } | { ok: false; motivo: string };

function leerItem(c: string[], tipo: TipoDeber, linea: number): LineaLeida {
  const [, asignatura, fecha, titulo, enlace, detalle, estado, imprimir, examen] = c;
  const fallo =
    validarTexto(asignatura, {
      sujeto: 'La asignatura',
      falta: 'Falta la asignatura',
      tope: TOPES.asignatura,
      obligatorio: true,
    }) ??
    validarFecha(fecha) ??
    validarTexto(titulo, {
      sujeto: 'El título',
      falta: 'Falta el título',
      tope: TOPES.titulo,
      obligatorio: true,
    }) ??
    validarEnlace(enlace, 'El enlace', 'Falta el enlace') ??
    validarTexto(detalle, {
      sujeto: 'El detalle',
      falta: '',
      tope: TOPES.detalle,
      obligatorio: false,
    });
  if (fallo) return { ok: false, motivo: fallo };

  let estadoLeido: EstadoEntrega | null = null;
  let imprimirLeido = false;
  if (tipo === 'ENTREGA') {
    const e = estado.toUpperCase();
    if (!ESTADOS.includes(e))
      return {
        ok: false,
        motivo: 'El estado debe ser PENDIENTE, ENTREGADA o ATRASADA',
      };
    const i = imprimir.toUpperCase();
    if (i !== 'SI' && i !== 'NO') return { ok: false, motivo: 'IMPRIMIR debe ser SI o NO' };
    estadoLeido = e as EstadoEntrega;
    imprimirLeido = i === 'SI';
  }

  let examenLeido: string | null = null;
  if (tipo === 'MATERIAL' && examen !== '') {
    const motivo = validarEnlace(examen, 'El enlace del examen', '');
    if (motivo) return { ok: false, motivo };
    examenLeido = claveDeEnlace(examen);
  }

  return {
    ok: true,
    item: {
      linea,
      tipo,
      asignatura,
      fecha: fecha === '' ? null : fecha,
      titulo,
      enlace: claveDeEnlace(enlace),
      detalle,
      estado: estadoLeido,
      imprimir: imprimirLeido,
      examen: examenLeido,
    },
  };
}

/** Clave de una línea de ítem con error si sus enlaces se pueden leer; null si no. */
function claveDeLineaConError(c: string[], tipo: TipoDeber): string | null {
  const [, , , , enlace, , , , examen] = c;
  if (validarEnlace(enlace, '', 'falta') !== null) return null;
  if (tipo === 'MATERIAL' && examen !== '' && validarEnlace(examen, '', '') !== null) return null;
  return claveDeDeber({ tipo, enlace, examen: tipo === 'MATERIAL' && examen !== '' ? examen : null });
}

function leerDuda(c: string[], linea: number): LineaLeida {
  const [, asignatura, , titulo, enlace, detalle] = c;
  const fallo =
    validarTexto(asignatura, {
      sujeto: 'La asignatura',
      falta: 'Falta la asignatura',
      tope: TOPES.asignatura,
      obligatorio: true,
    }) ??
    validarTexto(titulo, {
      sujeto: 'El título',
      falta: '',
      tope: TOPES.titulo,
      obligatorio: false,
    }) ??
    validarTexto(detalle, {
      sujeto: 'El detalle',
      falta: '',
      tope: TOPES.detalle,
      obligatorio: false,
    }) ??
    (enlace === '' ? null : validarEnlace(enlace, 'El enlace', ''));
  if (fallo) return { ok: false, motivo: fallo };
  return {
    ok: true,
    duda: {
      linea,
      asignatura,
      titulo,
      detalle,
      enlace: enlace === '' ? null : claveDeEnlace(enlace),
    },
  };
}

function leerCobertura(c: string[]): { ok: true; cobertura: Cobertura } | { ok: false; motivo: string } {
  const asignatura = c[1];
  const fallo = validarTexto(asignatura, {
    sujeto: 'La asignatura',
    falta: 'Falta la asignatura',
    tope: TOPES.asignatura,
    obligatorio: true,
  });
  if (fallo) return { ok: false, motivo: fallo };
  const cifras = c.slice(2);
  if (!cifras.every((n) => /^\d{1,6}$/.test(n)))
    return {
      ok: false,
      motivo: 'Los contadores de la cobertura deben ser enteros',
    };
  const [examenes, entregas, material, avisos, dudas] = cifras.map(Number);
  return {
    ok: true,
    cobertura: { asignatura, examenes, entregas, material, avisos, dudas },
  };
}

export function parsearDeberes(texto: string): ResultadoImportacion {
  if (texto.length > TOPES.texto) return vacio([], [], `La lista pasa de ${TOPES.texto} caracteres`);

  const lineas = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const inicio = lineas.findIndex((l) => CABECERA.test(limpiar(l)));
  if (inicio === -1) return vacio([], [], 'No encuentro la línea === DEBERES v1 ===');
  const version = CABECERA.exec(limpiar(lineas[inicio]))![1];
  if (version !== '1') return vacio([], [], `Esta app lee la versión v1 y la lista es v${version}`);

  let fin = lineas.findIndex((l, n) => n > inicio && FIN.test(limpiar(l)));
  const completa = fin !== -1;
  if (!completa) fin = lineas.length;

  const datos: number[] = [];
  for (let n = inicio + 1; n < fin; n++) {
    const t = lineas[n].trim();
    if (t !== '' && !t.startsWith('#')) datos.push(n);
  }
  if (datos.length > TOPES.lineas) return vacio([], [], `La lista pasa de ${TOPES.lineas} líneas de datos`);

  const items: ItemImportado[] = [];
  const dudas: Duda[] = [];
  const cobertura: Cobertura[] = [];
  const errores: ErrorDeLinea[] = [];
  const avisos: string[] = [];
  const clavesConError: string[] = [];
  const clavesVistas = new Map<string, number>();

  for (const n of datos) {
    const linea = n + 1;
    const cruda = lineas[n];
    const error = (motivo: string) => errores.push({ linea, motivo, texto: cruda.trim().slice(0, 80) });
    const c = cruda.split('|').map(limpiar);
    const tipo = c[0].toUpperCase();

    if (tipo === 'COBERTURA') {
      if (c.length !== COLUMNAS_COBERTURA) {
        error(`Tiene ${c.length} columnas y deben ser ${COLUMNAS_COBERTURA} ${AYUDA_PIPE}`);
        continue;
      }
      const r = leerCobertura(c);
      if (!r.ok) error(r.motivo);
      else if (cobertura.some((x) => x.asignatura === r.cobertura.asignatura))
        error(`Repite la cobertura de ${r.cobertura.asignatura}`);
      else cobertura.push(r.cobertura);
      continue;
    }

    if (tipo !== 'DUDA' && !TIPOS_DE_ITEM.includes(tipo)) {
      error(`El tipo ${tipo.slice(0, 20)} no existe`);
      continue;
    }
    if (c.length !== COLUMNAS_ITEM) {
      error(`Tiene ${c.length} columnas y deben ser ${COLUMNAS_ITEM} ${AYUDA_PIPE}`);
      continue;
    }

    const r = tipo === 'DUDA' ? leerDuda(c, linea) : leerItem(c, tipo as TipoDeber, linea);
    if (!r.ok) {
      error(r.motivo);
      if (tipo !== 'DUDA') {
        const clave = claveDeLineaConError(c, tipo as TipoDeber);
        if (clave !== null) clavesConError.push(clave);
      }
    } else if ('duda' in r) {
      dudas.push(r.duda);
    } else {
      const clave = claveDeDeber(r.item);
      const previa = clavesVistas.get(clave);
      if (previa !== undefined) {
        error(`Repite el deber de la línea ${previa}`);
      } else {
        clavesVistas.set(clave, linea);
        items.push(r.item);
      }
    }
  }

  if (!completa) avisos.push('La lista está cortada: falta === FIN ===');

  const examenes = new Set(items.filter((i) => i.tipo === 'EXAMEN').map((i) => i.enlace));
  for (const i of items) {
    if (i.tipo === 'MATERIAL' && i.examen !== null && !examenes.has(i.examen)) {
      avisos.push(`Línea ${i.linea}: el examen de este material no está en la lista`);
    }
  }

  const etiquetas = [
    ['examenes', 'EXAMEN', 'exámenes'],
    ['entregas', 'ENTREGA', 'entregas'],
    ['material', 'MATERIAL', 'material'],
    ['avisos', 'AVISO', 'avisos'],
  ] as const;
  for (const cob of cobertura) {
    const propios = items.filter((i) => i.asignatura === cob.asignatura);
    for (const [campo, tipo, nombre] of etiquetas) {
      const llegaron = propios.filter((i) => i.tipo === tipo).length;
      if (cob[campo] !== llegaron)
        avisos.push(`${cob.asignatura}: la cobertura dice ${cob[campo]} ${nombre} y llegaron ${llegaron}`);
    }
    const dudasLlegadas = dudas.filter((d) => d.asignatura === cob.asignatura).length;
    if (cob.dudas !== dudasLlegadas)
      avisos.push(`${cob.asignatura}: la cobertura dice ${cob.dudas} dudas y llegaron ${dudasLlegadas}`);
  }
  const conCobertura = new Set(cobertura.map((c) => c.asignatura));
  const vistas = new Set<string>();
  for (const a of [...items, ...dudas].sort((x, y) => x.linea - y.linea).map((x) => x.asignatura)) {
    if (!conCobertura.has(a) && !vistas.has(a)) {
      vistas.add(a);
      avisos.push(`Falta la línea de cobertura de ${a}`);
    }
  }

  return { items, dudas, cobertura, errores, avisos, completa, clavesConError };
}
