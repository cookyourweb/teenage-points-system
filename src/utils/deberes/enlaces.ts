import { TOPES, type TipoDeber } from '../../types/deberTypes';

const HOST_CLASSROOM = 'classroom.google.com';
// Espacios, control (U+0000-U+001F, U+007F) y de dirección (U+202A-202E, U+2066-2069).
// eslint-disable-next-line no-control-regex
const PROHIBIDOS = /[\s\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/;

function analizar(texto: string): URL | null {
  try {
    return new URL(texto);
  } catch {
    return null;
  }
}

/** Solo https, sin usuario/clave, con host de dominio (no IP ni localhost), sin espacios/control/dirección, ≤ tope. */
export function esEnlaceSeguro(texto: string): boolean {
  if (texto.length === 0 || texto.length > TOPES.enlace) return false;
  if (PROHIBIDOS.test(texto)) return false;
  if (!/^https:\/\//i.test(texto)) return false;
  // java.net.URI (la clave del back) no lee estos caracteres, que WHATWG deja crudos: se avisa aquí.
  if (/[|^{}`<>"\\]/.test(texto)) return false;
  if (/%(?![0-9A-Fa-f]{2})/.test(texto)) return false;
  const url = analizar(texto);
  if (!url || url.protocol !== 'https:') return false;
  if (url.username !== '' || url.password !== '') return false;
  const host = url.hostname;
  if (host.endsWith('.')) return false; // `ejemplo.com.` es el mismo sitio con otra grafía: no se acepta
  if (!host.includes('.') || host.split('.').some((etiqueta) => etiqueta === '')) return false;
  if (host.startsWith('[')) return false;
  if (/^[\d.]+$/.test(host)) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  // Java solo lee [ ] en el query, no en la ruta.
  if (/[[\]]/.test(url.pathname)) return false;
  // Gramática de hostname de java.net.URI: sin `_`, sin etiqueta que termine en `-`, TLD que no empieza por dígito.
  if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$/.test(host)) return false;
  // El query de Classroom se reserializa y el back no admite %XX ahí (ver EnlaceSeguroValidator).
  // Se mira el query YA reserializado: `!~():,/;@$` crudos salen como %21, %7E...
  if (host === HOST_CLASSROOM) {
    url.searchParams.delete('authuser');
    if (url.search.includes('%') || /(^\?|&)=/.test(url.search)) return false; // %XX o parámetro sin nombre
  }
  return true;
}

/** Quita el prefijo de cuenta `/u/<n>` de la ruta de Classroom. */
function rutaSinCuenta(ruta: string): string {
  return ruta.replace(/^\/u\/\d+(?=\/|$)/, '');
}

/** Forma canónica del enlace; asume esEnlaceSeguro. */
export function claveDeEnlace(enlace: string): string {
  const url = analizar(enlace);
  if (!url) return enlace;
  url.hash = '';
  if (url.hostname === HOST_CLASSROOM) {
    url.pathname = rutaSinCuenta(url.pathname).replace(/\/+$/, '') || '/';
    url.searchParams.delete('authuser');
    const base = `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
    return `${base}${url.search}`;
  }
  return url.href;
}

/** La portada de Classroom (inicio) no apunta a ningún deber concreto. */
export function esPortadaDeClassroom(enlace: string): boolean {
  const url = analizar(enlace);
  if (!url || url.hostname !== HOST_CLASSROOM) return false;
  const ruta = rutaSinCuenta(url.pathname).replace(/\/+$/, '');
  return ruta === '' || ruta === '/h';
}

/** Clave única del deber; el MATERIAL lleva también su examen (los enlaces no tienen espacios). */
export function claveDeDeber(d: { tipo: TipoDeber; enlace: string; examen?: string | null }): string {
  const enlace = claveDeEnlace(d.enlace);
  if (d.tipo === 'MATERIAL') return `MATERIAL ${enlace} ${d.examen ? claveDeEnlace(d.examen) : ''}`;
  return enlace;
}
