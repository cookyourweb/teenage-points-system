import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

/**
 * La tarjeta. Era la ultima pieza de `ui/` con la puerta abierta.
 *
 * `Card` aceptaba `className` libre, y por ahi entraba de todo: en
 * ChildView.tsx:191 se le colaba un degradado entero. Lo mismo que ya se cerro
 * en Button y en Field.
 *
 * LO QUE DIJO LA MEDICION, antes de decidir la API: de 49 usos con
 * `className`, casi todos eran DISPOSICION legitima y solo 5 eran color.
 *
 *   26  flex items-center gap-2   en CardTitle -> es poner un icono al lado
 *   12  text-center               -> alineacion
 *   14  py-12 / py-8 / pt-6       -> aire en estados vacios
 *    5  degradados y text-white   -> ESTO es lo que se cierra
 *
 * Asi que la API abre puertas para lo primero y cierra la del color, igual que
 * `layout` en Button. Cerrar sin dar alternativa es lo que hace que la gente
 * se salte el sistema.
 */

describe('Card se pinta', () => {
  it('muestra lo que lleva dentro', () => {
    render(<Card>Contenido</Card>);

    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('los tonos se pintan distinto', () => {
    const { container: normal } = render(<Card>x</Card>);
    const { container: destacada } = render(<Card tone="featured">x</Card>);

    expect(normal.firstElementChild?.className).not.toBe(
      destacada.firstElementChild?.className,
    );
  });
});

describe('CardTitle resuelve el icono, que era el 26 de los 49', () => {
  it('el titulo es un encabezado', () => {
    render(<CardTitle>Puntos de la familia</CardTitle>);

    expect(screen.getByRole('heading', { name: 'Puntos de la familia' })).toBeInTheDocument();
  });

  it('acepta un icono sin que nadie escriba flex items-center gap-2', () => {
    render(<CardTitle icon={<span data-testid="icono" />}>Puntos</CardTitle>);

    expect(screen.getByTestId('icono')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Puntos' })).toBeInTheDocument();
  });

  it('el icono no ensucia el nombre del encabezado', () => {
    // Si el icono aportara texto, el encabezado se llamaria "🏆 Puntos" y eso
    // es lo que leeria un lector de pantalla.
    const { container } = render(<CardTitle icon={<span>🏆</span>}>Puntos</CardTitle>);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('el nivel del encabezado se ajusta al de la pagina', () => {
    render(<CardTitle headingLevel={3}>Puntos</CardTitle>);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
});

describe('CardContent resuelve la alineacion y el aire', () => {
  it('se puede centrar sin escribir text-center', () => {
    const { container } = render(<CardContent align="center">x</CardContent>);

    expect(container.firstElementChild?.className).toMatch(/text-center/);
  });

  it('se le puede dar aire para los estados vacios', () => {
    const { container: normal } = render(<CardContent>x</CardContent>);
    const { container: aireado } = render(<CardContent padding="lg">x</CardContent>);

    expect(normal.firstElementChild?.className).not.toBe(aireado.firstElementChild?.className);
  });
});

describe('la puerta esta cerrada en las cuatro piezas', () => {
  it.each([
    ['Card', Card],
    ['CardHeader', CardHeader],
    ['CardTitle', CardTitle],
    ['CardContent', CardContent],
  ])('un className colado en %s no llega al DOM', (_nombre, Componente) => {
    const colado = { className: 'bg-accent-500' } as Record<string, unknown>;

    const { container } = render(<Componente {...colado}>x</Componente>);

    expect(container.innerHTML).not.toContain('bg-accent-500');
  });
});

describe('Card no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Card.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  it('no menciona ninguna familia de la paleta cruda', () => {
    expect(
      fuente.match(
        /\b(bg|text|border|ring|from|to|via)-(primary|neutral|success|danger|warning|accent)-\d{2,3}/g,
      ),
    ).toBeNull();
  });

  it('no lleva ni una clase dark:', () => {
    expect(fuente).not.toMatch(/dark:/);
  });
});
