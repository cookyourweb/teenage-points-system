import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guardas de la capa de tokens.
 *
 * Igual que arquitectura.test.ts, esto no prueba comportamiento: prueba que la
 * disciplina de tres niveles sigue en pie.
 *
 *   Nivel 1  PRIMITIVO    --tps-neutral-900: #111827        "que color es"
 *   Nivel 2  SEMANTICO    --tps-text: var(--tps-neutral-900) "para que sirve"
 *   Nivel 3  COMPONENTE   --tps-btn-primary-bg: var(--tps-action) "quien lo usa"
 *
 * Existen porque el modo oscuro se hace redefiniendo el NIVEL 2. Si alguien
 * redefine un primitivo dentro de .dark, cambia el significado de ese color en
 * toda la app y el fallo no se ve hasta que alguien enciende el modo oscuro.
 */

const SRC = join(__dirname, '..');
const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8');

/** Los `--tps-x: valor` que el fichero DEFINE. */
const definidos = (css: string): Set<string> =>
  new Set(Array.from(css.matchAll(/^\s*(--tps-[a-z0-9-]+)\s*:/gm), (m) => m[1]));

/** Los `var(--tps-x)` que el fichero USA. */
const usados = (css: string): Set<string> =>
  new Set(Array.from(css.matchAll(/var\(\s*(--tps-[a-z0-9-]+)/g), (m) => m[1]));

/** El bloque de una regla concreta, por ejemplo `:root.dark`. */
const bloque = (css: string, selector: string): string => {
  const inicio = css.indexOf(selector + ' {');
  if (inicio === -1) return '';
  const abre = css.indexOf('{', inicio);
  return css.slice(abre + 1, css.indexOf('}', abre));
};

describe('la capa de tokens es coherente consigo misma', () => {
  it('todo var(--tps-*) que se usa esta definido', () => {
    // Un var() sin definir no rompe el build: el navegador se queda sin valor y
    // pinta el color heredado. Es decir, falla en silencio y en produccion.
    const huerfanos = [...usados(tokens)].filter((t) => !definidos(tokens).has(t)).sort();

    expect(huerfanos).toEqual([]);
  });

  it('globals.css importa tokens.css antes que Tailwind', () => {
    // Si se importa despues, las directivas de Tailwind ya han emitido su CSS y
    // las variables llegan tarde para las capas base y components.
    const globals = readFileSync(join(SRC, 'globals.css'), 'utf8');
    const posImport = globals.indexOf("@import './styles/tokens.css'");
    const posTailwind = globals.indexOf('@tailwind');

    expect(posImport).toBeGreaterThanOrEqual(0);
    expect(posImport).toBeLessThan(posTailwind);
  });
});

describe('el modo oscuro respeta los tres niveles', () => {
  const PRIMITIVOS = /^--tps-(neutral|brand|accent|positive|caution|negative)-\d+$/;

  it('existe un bloque :root.dark', () => {
    expect(bloque(tokens, ':root.dark')).not.toBe('');
  });

  it('el modo oscuro NO redefine ningun primitivo', () => {
    // Redefinir --tps-brand-600 dentro de .dark cambiaria lo que significa "azul
    // 600" en toda la app. El modo oscuro cambia ROLES, no colores.
    const infractores = [...definidos(bloque(tokens, ':root.dark'))]
      .filter((t) => PRIMITIVOS.test(t))
      .sort();

    expect(infractores).toEqual([]);
  });

  it('el modo oscuro redefine el fondo de pagina y el texto', () => {
    // Son los dos roles sin los cuales el modo oscuro no existe. Si un dia
    // alguien recorta el bloque, que se entere aqui.
    const enOscuro = definidos(bloque(tokens, ':root.dark'));

    expect(enOscuro).toContain('--tps-bg-page');
    expect(enOscuro).toContain('--tps-text');
  });
});

describe('los primitivos no se usan directamente desde un componente', () => {
  it('ningun nivel 3 apunta a un primitivo, siempre pasa por el nivel 2', () => {
    // El nivel 3 existe para poder decir "los botones de esta app son un punto
    // mas oscuros" sin tocar el sistema de acciones. Si apunta al primitivo, se
    // salta el nivel 2 y el modo oscuro deja de afectarle.
    const nivel3 = [...tokens.matchAll(/^\s*(--tps-(?:btn|card|field)-[a-z0-9-]+)\s*:\s*([^;]+);/gm)];

    const saltanNivel2 = nivel3
      .filter(([, , valor]) => /var\(\s*--tps-(neutral|brand|accent|positive|caution|negative)-\d+/.test(valor))
      .map(([, nombre]) => nombre)
      .sort();

    expect(saltanNivel2).toEqual([]);
  });
});
