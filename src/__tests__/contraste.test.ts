import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Contraste de TODOS los estados, en los dos modos.
 *
 * Existe por una frase de Vero: "el hover siempre tiene que poder leerse".
 *
 * Y existe porque no se cumplia. El hover de accion en modo oscuro estaba en
 * 2,84:1, por debajo incluso del minimo de 3:1 para interfaz. La causa era
 * conceptual, no un despiste: en modo oscuro el hover se iba a un tono MAS
 * OSCURO, que es lo correcto sobre fondo claro y lo contrario de lo que hace
 * falta sobre fondo oscuro.
 *
 * La leccion que este fichero congela: un boton no es un color, son cinco
 * estados. Reposo, hover, foco, activo y deshabilitado. Cada uno se disena y
 * cada uno se mide.
 *
 * Umbrales de WCAG 2.2 nivel AA:
 *   4,5:1  texto normal (1.4.3)
 *   3:1    texto grande y limites de componentes de interfaz (1.4.11)
 *
 * Lo deshabilitado NO se mide: 1.4.3 excluye expresamente los controles
 * inactivos. Un boton deshabilitado que contrasta poco esta comunicando
 * justamente que no se puede pulsar.
 */

const TEXTO = 4.5;
const INTERFAZ = 3;

const css = readFileSync(join(__dirname, '..', 'styles/tokens.css'), 'utf8');

const bloque = (selector: string): string => {
  const i = css.indexOf(`${selector} {`);
  if (i === -1) throw new Error(`No existe el bloque ${selector} en tokens.css`);
  const abre = css.indexOf('{', i);
  return css.slice(abre + 1, css.indexOf('\n}', abre));
};

const declaraciones = (texto: string): Record<string, string> =>
  Object.fromEntries(
    Array.from(texto.matchAll(/^\s*(--tps-[a-z0-9-]+)\s*:\s*([^;]+);/gm), (m) => [m[1], m[2].trim()]),
  );

const CLARO = declaraciones(bloque(':root'));
const OSCURO = { ...CLARO, ...declaraciones(bloque(':root.dark')) };

/** Sigue la cadena de var() hasta llegar a un color de verdad. */
const resolver = (token: string, tabla: Record<string, string>, saltos = 0): string => {
  if (saltos > 10) throw new Error(`Ciclo de var() en ${token}`);
  const valor = tabla[token];
  if (!valor) throw new Error(`${token} no esta definido`);

  const indirecto = valor.match(/^var\(\s*(--tps-[a-z0-9-]+)\s*\)$/);
  return indirecto ? resolver(indirecto[1], tabla, saltos + 1) : valor;
};

const aRgb = (color: string): [number, number, number] => {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = color.match(/^rgb\((\d+) (\d+) (\d+)(?: \/ [\d.]+)?\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  throw new Error(`No se puede medir el color "${color}"`);
};

/** Aplana un color con alfa sobre su fondo, que es lo que ve el ojo. */
const aplanar = (color: string, fondo: string): [number, number, number] => {
  const alfa = color.match(/\/\s*([\d.]+)\s*\)$/);
  if (!alfa) return aRgb(color);

  const a = Number(alfa[1]);
  const [fr, fg, fb] = aRgb(color);
  const [br, bg, bb] = aRgb(fondo);
  return [
    Math.round(fr * a + br * (1 - a)),
    Math.round(fg * a + bg * (1 - a)),
    Math.round(fb * a + bb * (1 - a)),
  ];
};

const luminancia = ([r, g, b]: [number, number, number]): number => {
  const canal = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

const contraste = (frente: [number, number, number], fondo: [number, number, number]): number => {
  const [alto, bajo] = [luminancia(frente), luminancia(fondo)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
};

const medir = (frente: string, fondo: string, tabla: Record<string, string>): number => {
  const cFondo = resolver(fondo, tabla);
  const superficie = resolver('--tps-bg-surface', tabla);
  return contraste(aplanar(resolver(frente, tabla), cFondo), aplanar(cFondo, superficie));
};

/**
 * Cada estado que un usuario puede ver, con su minimo.
 *
 * Si se anade una variante de boton, se anade aqui. Un estado que no esta en
 * esta tabla es un estado que nadie ha diseñado.
 */
const ESTADOS: Array<[string, string, string, number]> = [
  // Boton relleno principal: lo que importa es el texto SOBRE el boton
  ['Boton principal, reposo', '--tps-btn-primary-fg', '--tps-btn-primary-bg', TEXTO],
  ['Boton principal, hover', '--tps-btn-primary-fg', '--tps-btn-primary-bg-hover', TEXTO],
  // ...y que el boton se distinga de la tarjeta donde vive
  ['Boton principal se ve sobre la tarjeta', '--tps-btn-primary-bg', '--tps-bg-surface', INTERFAZ],

  ['Boton neutro, reposo', '--tps-btn-neutral-fg', '--tps-btn-neutral-bg', TEXTO],
  ['Boton neutro, hover', '--tps-btn-neutral-fg', '--tps-btn-neutral-bg-hover', TEXTO],

  ['Boton peligro, reposo', '--tps-btn-danger-fg', '--tps-btn-danger-bg', TEXTO],
  ['Boton peligro, hover', '--tps-btn-danger-fg', '--tps-btn-danger-bg-hover', TEXTO],

  // El boton terciario en reposo va sobre la superficie, sin relleno propio
  ['Boton terciario, reposo', '--tps-btn-ghost-fg', '--tps-bg-surface', TEXTO],
  ['Boton terciario, hover', '--tps-btn-ghost-fg-hover', '--tps-btn-ghost-bg-hover', TEXTO],

  // Accion como TEXTO: enlaces y pestañas. Aqui el fondo es la superficie.
  ['Enlace, reposo', '--tps-link', '--tps-bg-surface', TEXTO],
  ['Enlace, hover', '--tps-link-hover', '--tps-bg-surface', TEXTO],
  ['Enlace sobre fondo hundido', '--tps-link', '--tps-bg-sunken', TEXTO],

  // Texto
  ['Texto sobre superficie', '--tps-text', '--tps-bg-surface', TEXTO],
  ['Texto sobre fondo hundido', '--tps-text', '--tps-bg-sunken', TEXTO],
  ['Texto atenuado sobre superficie', '--tps-text-muted', '--tps-bg-surface', TEXTO],
  ['Texto atenuado sobre hundido', '--tps-text-muted', '--tps-bg-sunken', TEXTO],

  // Bordes y foco son interfaz, no texto
  ['Borde visible sobre la superficie', '--tps-border-strong', '--tps-bg-surface', INTERFAZ],
  ['Anillo de foco sobre la superficie', '--tps-focus-ring', '--tps-bg-surface', INTERFAZ],

  // Estados
  ['Texto positivo sobre su fondo', '--tps-positive-text', '--tps-positive-bg', TEXTO],
  ['Texto de aviso sobre su fondo', '--tps-caution-text', '--tps-caution-bg', TEXTO],
  ['Texto negativo sobre su fondo', '--tps-negative-text', '--tps-negative-bg', TEXTO],
  // El degradado destacado va de brand-600 a accent-600. El texto va encima
  // de TODO el recorrido, asi que los DOS extremos tienen que aguantarlo. Se
  // miden los extremos, que es donde esta el peor caso.
  ['Texto destacado, extremo de marca', '--tps-featured-fg', '--tps-brand-600', TEXTO],
  ['Texto destacado, extremo de recompensa', '--tps-featured-fg', '--tps-accent-600', TEXTO],

  // Recompensa: el papel del morado, privilegios y premios.
  ['Relleno de recompensa con su texto', '--tps-reward-fg', '--tps-reward', TEXTO],
  ['Texto de recompensa sobre su fondo', '--tps-reward-text', '--tps-reward-bg', TEXTO],
  // Fondo suave de marca: el aviso informativo
  ['Texto sobre el fondo suave de marca', '--tps-text', '--tps-action-bg', TEXTO],
  ['Enlace sobre el fondo suave de marca', '--tps-link', '--tps-action-bg', TEXTO],

  // Cada relleno con SU texto. Asumir blanco es lo que fallaba en verde y ambar.
  ['Relleno positivo con su texto', '--tps-positive-fg', '--tps-positive', TEXTO],
  ['Relleno de aviso con su texto', '--tps-caution-fg', '--tps-caution', TEXTO],
  ['Relleno negativo con su texto', '--tps-negative-fg', '--tps-negative', TEXTO],
];

describe.each([
  ['claro', CLARO],
  ['oscuro', OSCURO],
])('modo %s: todos los estados se leen', (_modo, tabla) => {
  it.each(ESTADOS)('%s', (nombre, frente, fondo, minimo) => {
    const medido = medir(frente, fondo, tabla);

    expect(
      Number(medido.toFixed(2)),
      `${nombre}: ${medido.toFixed(2)}:1, hace falta ${minimo}:1`,
    ).toBeGreaterThanOrEqual(minimo);
  });
});

describe('el hover se nota y sigue leyendose', () => {
  // La regla, dicha por Vero: "el hover siempre tiene que poder leerse".
  //
  // Se comprueban dos cosas distintas y las dos hacen falta:
  //   1. que el hover SE NOTE, o no es un hover
  //   2. que despues de notarse, el texto siga por encima del minimo
  //
  // Lo que NO se exige es que el contraste suba. Bajar de 13,3:1 a 11,9:1 al
  // pasar el raton es normal y no molesta a nadie. Lo que rompe es cruzar el
  // umbral, y eso lo cubre la tabla de estados de arriba.
  const BOTONES: Array<[string, string, string, string]> = [
    ['Boton principal', '--tps-btn-primary-fg', '--tps-btn-primary-bg', '--tps-btn-primary-bg-hover'],
    ['Boton neutro', '--tps-btn-neutral-fg', '--tps-btn-neutral-bg', '--tps-btn-neutral-bg-hover'],
    ['Boton peligro', '--tps-btn-danger-fg', '--tps-btn-danger-bg', '--tps-btn-danger-bg-hover'],
  ];

  const CASOS = BOTONES.flatMap(([nombre, fg, reposo, hover]) => [
    [`${nombre}, modo claro`, fg, reposo, hover, CLARO] as const,
    [`${nombre}, modo oscuro`, fg, reposo, hover, OSCURO] as const,
  ]);

  it.each(CASOS)('%s cambia de color al pasar el raton', (_n, _fg, reposo, hover, tabla) => {
    expect(resolver(hover, tabla)).not.toBe(resolver(reposo, tabla));
  });

  it.each(CASOS)('%s sigue legible en hover', (nombre, fg, _reposo, hover, tabla) => {
    const medido = medir(fg, hover, tabla);

    expect(
      Number(medido.toFixed(2)),
      `${nombre}: en hover se queda en ${medido.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(TEXTO);
  });
});

describe('los enlaces ACLARAN en oscuro y OSCURECEN en claro', () => {
  // Este es el fallo conceptual que empezo todo: sobre fondo oscuro, irse a un
  // tono mas oscuro al pasar el raton hace el texto MENOS legible, no mas.
  it('en modo claro el hover del enlace contrasta mas que el reposo', () => {
    expect(medir('--tps-link-hover', '--tps-bg-surface', CLARO)).toBeGreaterThan(
      medir('--tps-link', '--tps-bg-surface', CLARO),
    );
  });

  it('en modo oscuro el hover del enlace contrasta mas que el reposo', () => {
    expect(medir('--tps-link-hover', '--tps-bg-surface', OSCURO)).toBeGreaterThan(
      medir('--tps-link', '--tps-bg-surface', OSCURO),
    );
  });
});
