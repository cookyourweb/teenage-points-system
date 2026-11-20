import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsearDeberes } from '../utils/deberes/formato';

const RECETA = readFileSync(join(__dirname, '../../docs/receta-classroom.md'), 'utf8');
// El único bloque ```text de la receta (el del prompt usa una valla de 4 comillas y no casa).
const EJEMPLO = /\n```text\n([\s\S]*?)\n```/.exec(RECETA)?.[1] ?? '';

const E1 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details';
const E2 = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO12/details';
const EXAMEN_E1 = `EXAMEN | Matemáticas | 2027-03-15 | Examen 1 | ${E1} | | | |`;
const EXAMEN_E2 = `EXAMEN | Matemáticas | 2027-03-16 | Examen 2 | ${E2} | | | |`;
const MATERIAL_VIDEO_DE = (e: string) =>
  `MATERIAL | Matemáticas | | Vídeo | https://www.youtube.com/watch?v=EJEMPLO5 | | | | ${e}`;
const avisoConEnlace = (id: string) =>
  `AVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/${id} | | | |`;
const envuelve = (...lineas: string[]) => ['=== DEBERES v1 ===', ...lineas, '=== FIN ==='].join('\n');

describe('parsearDeberes', () => {
  // Guarda (verde desde el principio): no depende del parser, protege que la receta pública solo lleve datos ficticios.
  it('laRecetaSoloLlevaDatosFicticios', () => {
    expect((RECETA.match(/\d{4}-\d{2}-\d{2}/g) ?? []).every((f) => f.startsWith('2027-'))).toBe(true);
    expect((RECETA.match(/https?:\/\/[^\s`|)]+/g) ?? []).every((u) => u.includes('EJEMPLO'))).toBe(true);
  });

  it('elEjemploDeLaRecetaSeLeeEntero', () => {
    const r = parsearDeberes(EJEMPLO);
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.completa).toBe(true);
    expect(r.items.map((i) => i.tipo)).toEqual(['EXAMEN', 'ENTREGA', 'MATERIAL', 'AVISO']);
    expect(r.items[1]).toMatchObject({
      asignatura: 'Lengua',
      fecha: '2027-03-10',
      estado: 'PENDIENTE',
      imprimir: true,
      examen: null,
    });
    expect(r.items[2].examen).toBe('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details');
    expect(r.dudas).toHaveLength(1);
    expect(r.cobertura).toHaveLength(4);
  });

  it('enlacesSalenNormalizados', () => {
    const r = parsearDeberes(
      envuelve(
        'MATERIAL | Matemáticas | | Ficha | https://classroom.google.com/u/1/c/EJEMPLO1/m/EJEMPLO11/details?authuser=1 | | | | https://classroom.google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details',
      ),
    );
    expect(r.items[0].enlace).toBe('https://classroom.google.com/c/EJEMPLO1/m/EJEMPLO11/details');
    expect(r.items[0].examen).toBe('https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details');
  });

  it('toleraCrlfBomYEspacios', () => {
    const r = parsearDeberes(
      '\uFEFF=== DEBERES v1 ===\r\n  EXAMEN |  Matemáticas  | 2027-03-15 | Examen   del tema 4 | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details | | | |\r\n=== FIN ===\r\n',
    );
    expect(r.errores).toEqual([]);
    expect(r.items[0]).toMatchObject({
      asignatura: 'Matemáticas',
      titulo: 'Examen del tema 4',
      linea: 2,
    });
  });

  it('sinFechaEsValido', () => {
    const r = parsearDeberes(
      envuelve(
        'ENTREGA | Lengua | | Lectura | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO8/details | | PENDIENTE | NO |',
      ),
    );
    expect(r.items[0].fecha).toBeNull();
    expect(r.errores).toEqual([]);
  });

  it('unaLineaMalaNoTumbaElResto', () => {
    const r = parsearDeberes(
      envuelve(
        'EXAMEN | Matemáticas | 2027-02-30 | Mal | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO9/details | | | |',
        'AVISO | Ciencias | | Bata | javascript:alert(1) | | | |',
        'ENTREGA | Lengua | 2027-03-10 | Corta | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | | PENDIENTE | SI',
        'EXAMEN | Historia | 2027-03-20 | Portada | https://classroom.google.com/ | | | |',
        'ENTREGA | Lengua | 2027-03-10 | Bien | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | | PENDIENTE | NO |',
      ),
    );
    expect(r.errores.map((e) => [e.linea, e.motivo])).toEqual([
      [2, 'La fecha 2027-02-30 no existe'],
      [3, 'El enlace no es https:// seguro'],
      [4, 'Tiene 8 columnas y deben ser 9 (¿hay un | dentro de un texto?)'],
      [5, 'El enlace es la portada de Classroom: falta el del deber'],
    ]);
    expect(r.items.map((i) => i.titulo)).toEqual(['Bien']);
  });

  it('caracteresDeControlODireccionSonErrorDeLinea', () => {
    const E = 'https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details';
    const r = parsearDeberes(
      envuelve(
        `EXAMEN | Matemáticas | 2027-03-15 | Examen \u202E1 | ${E} | | | |`,
        `EXAMEN | Matemáticas | 2027-03-15 | Examen 2 | ${E}9 | Trae \u0007 regla | | |`,
        `EXAMEN | Mate\u2066máticas | 2027-03-15 | Examen 3 | ${E}8 | | | |`,
      ),
    );
    expect(r.errores.map((e) => [e.linea, e.motivo])).toEqual([
      [2, 'El título tiene caracteres de control o de dirección'],
      [3, 'El detalle tiene caracteres de control o de dirección'],
      [4, 'La asignatura tiene caracteres de control o de dirección'],
    ]);
    expect(r.items).toEqual([]);
  });

  it('unaDudaConEnlaceInseguroEsErrorDeLinea', () => {
    const r = parsearDeberes(envuelve('DUDA | Ciencias | | ¿Pregunta? | javascript:alert(1) | | | |'));
    expect(r.errores.map((e) => [e.linea, e.motivo])).toEqual([[2, 'El enlace no es https:// seguro']]);
    expect(r.dudas).toEqual([]);
  });

  it('unaLineaConErrorPeroConEnlaceLegibleDejaSuClave', () => {
    const r = parsearDeberes(
      envuelve(
        `ENTREGA | Lengua | 2027-02-30 | Corta | https://classroom.google.com/u/1/c/EJEMPLO3/a/EJEMPLO4/details | | PENDIENTE | SI |`,
        'EXAMEN | Historia | 2027-03-20 | Portada | https://classroom.google.com/ | | | |',
        'AVISO | Ciencias | | Bata | javascript:alert(1) | | | |',
      ),
    );
    expect(r.items).toEqual([]);
    expect(r.errores).toHaveLength(3);
    expect(r.clavesConError).toEqual(['https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details']);
    expect(parsearDeberes(envuelve(EXAMEN_E1)).clavesConError).toEqual([]);
  });

  it('topesComoElServidor', () => {
    const r = parsearDeberes(
      envuelve(`AVISO | Ciencias | | ${'x'.repeat(121)} | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |`),
    );
    expect(r.errores[0].motivo).toBe('El título pasa de 120 caracteres');
  });

  it('enlaceRepetidoEnLaMismaPegada', () => {
    const l = 'AVISO | Ciencias | | Bata | https://classroom.google.com/u/0/c/EJEMPLO6/p/EJEMPLO7 | | | |';
    const r = parsearDeberes(envuelve(l, l.replace('/u/0', '/u/1')));
    expect(r.errores).toEqual([
      {
        linea: 3,
        motivo: 'Repite el deber de la línea 2',
        texto: expect.any(String),
      },
    ]);
  });

  it('mismoMaterialParaDosExamenes', () => {
    const r = parsearDeberes(envuelve(EXAMEN_E1, EXAMEN_E2, MATERIAL_VIDEO_DE(E1), MATERIAL_VIDEO_DE(E2)));
    expect(r.errores).toEqual([]);
    expect(r.items.filter((i) => i.tipo === 'MATERIAL')).toHaveLength(2);
  });

  it('materialConExamenAusenteAvisaYSeQueda', () => {
    const r = parsearDeberes(
      envuelve(
        'MATERIAL | Matemáticas | | Ficha | https://drive.google.com/file/d/EJEMPLO10/view | | | | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO99/details',
      ),
    );
    expect(r.items).toHaveLength(1);
    expect(r.avisos).toContain('Línea 2: el examen de este material no está en la lista');
  });

  it('coberturaQueNoCuadra', () => {
    const r = parsearDeberes(
      envuelve(
        'AVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |',
        'COBERTURA | Ciencias | 0 | 0 | 0 | 2 | 0',
      ),
    );
    expect(r.avisos).toEqual(['Ciencias: la cobertura dice 2 avisos y llegaron 1']);
    expect(
      parsearDeberes(envuelve('AVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |'))
        .avisos,
    ).toEqual(['Falta la línea de cobertura de Ciencias']);
  });

  it('cabeceraFinYVersion', () => {
    expect(parsearDeberes('hola').errores).toEqual([
      {
        linea: 0,
        motivo: 'No encuentro la línea === DEBERES v1 ===',
        texto: '',
      },
    ]);
    expect(parsearDeberes('=== DEBERES v2 ===\n=== FIN ===').errores[0].motivo).toBe(
      'Esta app lee la versión v1 y la lista es v2',
    );
    const cortada = parsearDeberes(
      '=== DEBERES v1 ===\nAVISO | Ciencias | | Bata | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | | | |',
    );
    expect(cortada.completa).toBe(false);
    expect(cortada.items).toHaveLength(1);
    expect(cortada.avisos).toContain('La lista está cortada: falta === FIN ===');
  });

  it('demasiadoLargo', () => {
    expect(parsearDeberes('x'.repeat(200_001)).errores[0].motivo).toBe('La lista pasa de 200000 caracteres');
  });

  it('demasiadasLineas', () => {
    const r = parsearDeberes(envuelve(...Array.from({ length: 301 }, (_, n) => avisoConEnlace(`EJEMPLO${n}`))));
    expect(r.errores).toEqual([{ linea: 0, motivo: 'La lista pasa de 300 líneas de datos', texto: '' }]);
    expect(r.items).toEqual([]);
  });
});
