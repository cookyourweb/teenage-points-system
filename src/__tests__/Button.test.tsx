import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Button from '../components/ui/Button';

/**
 * El contrato de Button.
 *
 * Antes de endurecerlo, la foto del repo era esta: `variant` se usaba 6 veces
 * en total y `className` con colores 30 veces. O sea, la API existia y nadie
 * la usaba, porque `className` la pisaba y era mas comodo.
 *
 * Por eso el cambio de fondo no es cambiar colores: es QUITAR `className` del
 * contrato. Mientras se pueda pisar, se pisa.
 */

describe('Button hace lo que un boton', () => {
  it('muestra su contenido', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('avisa al pulsarlo', async () => {
    const alPulsar = vi.fn();
    render(<Button onClick={alPulsar}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(alPulsar).toHaveBeenCalledOnce();
  });

  it('deshabilitado no avisa', async () => {
    const alPulsar = vi.fn();
    render(
      <Button disabled onClick={alPulsar}>
        Guardar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(alPulsar).not.toHaveBeenCalled();
  });

  it('cargando queda deshabilitado y lo anuncia', async () => {
    // aria-busy es lo que hace que un lector de pantalla diga que esta
    // ocupado. Sin eso, para alguien ciego el boton simplemente no responde.
    const alPulsar = vi.fn();
    render(
      <Button loading onClick={alPulsar}>
        Guardar
      </Button>,
    );

    const boton = screen.getByRole('button');
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(boton);
    expect(alPulsar).not.toHaveBeenCalled();
  });

  it('es de tipo button por defecto, no submit', () => {
    // El defecto de HTML es submit, y dentro de un form eso envia el
    // formulario sin querer. Es un fallo clasico y silencioso.
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('la puerta esta cerrada: no se puede pisar el aspecto', () => {
  it('un className colado en tiempo de ejecucion NO llega al DOM', () => {
    // TypeScript ya lo rechaza en compilacion. Esto cubre el otro camino: un
    // objeto de props construido dinamicamente, o JavaScript sin tipos.
    const colado = { className: 'bg-accent-500' } as Record<string, unknown>;

    render(<Button {...colado}>Guardar</Button>);

    expect(screen.getByRole('button').className).not.toContain('bg-accent-500');
  });

  it('un style colado tampoco llega', () => {
    const colado = { style: { backgroundColor: 'red' } } as Record<string, unknown>;

    render(<Button {...colado}>Guardar</Button>);

    expect(screen.getByRole('button').getAttribute('style')).toBeNull();
  });
});

describe('Button no conoce ni un color', () => {
  // Sin comentarios: si no, el propio texto que explica la regla la dispara.
  // Paso ya dos veces hoy, con este mismo detector.
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Button.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  it('no menciona ninguna familia de la paleta cruda', () => {
    // Un componente del sistema nombra ROLES (bg-btn-primary), nunca colores
    // (bg-primary-600). Si nombra un color, el modo oscuro deja de alcanzarle.
    const colores = fuente.match(
      /\b(bg|text|border|ring|from|to|via)-(primary|neutral|success|danger|warning|accent)-\d{2,3}/g,
    );

    expect(colores).toBeNull();
  });

  it('no lleva ni una clase dark:', () => {
    // Con tokens, el modo oscuro lo resuelve la variable. Una clase dark: aqui
    // significa que alguien no se fio del sistema.
    expect(fuente).not.toMatch(/dark:/);
  });

  it('no lleva colores literales en hexadecimal', () => {
    expect(fuente).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('las variantes son intenciones, no colores', () => {
  const VARIANTES = ['primary', 'neutral', 'danger', 'ghost'] as const;

  it.each(VARIANTES)('la variante %s se pinta distinta de las demas', (variante) => {
    const clases = VARIANTES.map((v) => {
      const { unmount } = render(<Button variant={v}>X</Button>);
      const c = screen.getByRole('button').className;
      unmount();
      return c;
    });

    const mia = clases[VARIANTES.indexOf(variante)];
    const otras = clases.filter((_, i) => i !== VARIANTES.indexOf(variante));

    expect(otras).not.toContain(mia);
  });

  it('todas cumplen 44 px de alto', () => {
    // El minimo exigible es 24 px (2.5.8, AA). 44 es el 2.5.5, que es AAA, y
    // es el que se elige: en movil la diferencia se nota al pulsar.
    (['sm', 'md', 'lg'] as const).forEach((size) => {
      const { unmount } = render(<Button size={size}>X</Button>);
      expect(screen.getByRole('button').className).toMatch(/min-h-(11|12)\b/);
      unmount();
    });
  });
});
