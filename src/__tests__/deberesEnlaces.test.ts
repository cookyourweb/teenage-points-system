import { describe, it, expect } from 'vitest';
import {
  esEnlaceSeguro,
  claveDeEnlace,
  esPortadaDeClassroom,
  claveDeDeber,
} from '../utils/deberes/enlaces';

const E1 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details';
const VIDEO = 'https://www.youtube.com/watch?v=EJEMPLO5';
const CLAVE_MATERIAL =
  'MATERIAL https://www.youtube.com/watch?v=EJEMPLO5 https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details';

// La misma lista la copia Task 6 en Java.
const MALOS = [
  'javascript:alert(1)',
  'JAVASCRIPT:alert(1)',
  'http://classroom.google.com/c/EJEMPLO1',
  'data:text/html,hola',
  'https://usuario:clave@ejemplo.com/',
  'https://exa mple.com/',
  'https://localhost/',
  'https://127.0.0.1/',
  'https://[::1]/',
  '//ejemplo.com/x',
  'https://ejemplo.com/\u202Eexe',
  'https://ejemplo.com/\u0007',
  'https://ejemplo.com/' + 'a'.repeat(500),
  'https://localhost./',
  'https://foo.localhost./',
  'https://a..b/',
  'https://.com/',
  'https:ejemplo.com',
  'https:/ejemplo.com',
  'https:\\\\ejemplo.com/x',
  'https://ejemplo.com/\u007F',
  'https://ejemplo.com/\tx',
  'https://ejemplo.com/\nx',
];

describe('enlaces de deberes', () => {
  it('soloHttps', () => {
    expect(esEnlaceSeguro(E1)).toBe(true);
    for (const malo of MALOS) expect(esEnlaceSeguro(malo), malo).toBe(false);
  });

  it('quitaLaCuentaDeLaRuta', () => {
    const a = 'https://classroom.google.com/u/0/c/EJEMPLO1/a/EJEMPLO2/details';
    const b = 'https://Classroom.Google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details/?authuser=1#x';
    expect(claveDeEnlace(a)).toBe(E1);
    expect(claveDeEnlace(b)).toBe(claveDeEnlace(a));
  });

  it('noTocaElQueryDeOtrosSitios', () => {
    expect(claveDeEnlace(VIDEO)).toBe(VIDEO);
  });

  it('laPortadaNoEsUnEnlace', () => {
    expect(esPortadaDeClassroom('https://classroom.google.com/')).toBe(true);
    expect(esPortadaDeClassroom('https://classroom.google.com/u/2/h')).toBe(true);
    expect(esPortadaDeClassroom(E1)).toBe(false);
  });

  it('laClaveDelMaterialLlevaSuExamen', () => {
    expect(claveDeDeber({ tipo: 'EXAMEN', enlace: E1 })).toBe(E1);
    expect(claveDeDeber({ tipo: 'MATERIAL', enlace: VIDEO, examen: E1 })).toBe(CLAVE_MATERIAL);
  });

  it('claveDeDeberCanonicaSuEnlaceYSuExamen', () => {
    const E1_CUENTA = 'https://Classroom.Google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details/?authuser=1#x';
    expect(claveDeDeber({ tipo: 'EXAMEN', enlace: E1_CUENTA })).toBe(E1);
    expect(claveDeDeber({ tipo: 'MATERIAL', enlace: VIDEO, examen: E1_CUENTA })).toBe(CLAVE_MATERIAL);
  });
});
