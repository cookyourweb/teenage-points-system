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
  'https://classroom.google.com./',
  'https://classroom.google.com./u/0/c/EJEMPLO/a/EJEMPLO1',
  'https://ejemplo.com./x',
];

// Espejo de EnlaceSeguroValidatorTest (Java): lo canónico que el front acepta, el back lo acepta.
const BUENOS_DEL_FRONT = [
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?q=a%20b&authuser=0',
  "https://ejemplo.com/l'eau.pdf",
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details',
  'https://www.youtube.com/watch?v=EJEMPLO5',
  'https://docs.google.com/document/d/abc_DEF-1/edit?usp=sharing',
  'https://drive.google.com/file/d/abc/view#x',
  'https://xn--espaa-rta.example.com/a',
  'https://ejemplo.com/x?ids[]=1',
];
// java.net.URI no los lee, o el query de Classroom lleva %XX que el back no admite: se avisan en la vista previa.
const MALOS_PARA_EL_BACK = [
  'https://ejemplo.com/a|b',
  'https://ejemplo.com/x?a=b|c',
  'https://ejemplo.com/x?a=b^c',
  'https://ejemplo.com/x?a={b}',
  // Java los rechaza y el front los daba por buenos (revision final B).
  'https://ejemplo.com/100%',
  'https://ejemplo.com/x%zz',
  'https://ejemplo.com/x?a=b\\c',
  'https://ejemplo.com/a[b]',
  'https://ej_x.ejemplo.com/a',
  'https://ejemplo-.com/a',
  'https://ejemplo.123/a',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?=x',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?a=1&=x',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?q=a%2Fb',
  // JS los reserializa a %21, %7E, %28, %3A: el back no admite %XX en Classroom.
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?x=a!b',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?x=a~b',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?x=(a)',
  'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?x=a:b',
];

describe('enlaces de deberes', () => {
  it('loCanonicoDelFrontLoAceptaElBack', () => {
    for (const bueno of BUENOS_DEL_FRONT) expect(esEnlaceSeguro(bueno), bueno).toBe(true);
    expect(claveDeEnlace(BUENOS_DEL_FRONT[0])).toBe(
      'https://classroom.google.com/c/EJEMPLO/a/EJEMPLO/details?q=a+b',
    );
    for (const malo of MALOS_PARA_EL_BACK) expect(esEnlaceSeguro(malo), malo).toBe(false);
  });

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
