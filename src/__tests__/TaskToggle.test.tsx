import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskToggle from '../components/dashboard/TaskToggle';

/**
 * La fila de tarea que el hijo marca y desmarca.
 *
 * Hallazgo C1 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO, y el mas grave de
 * los que quedaban por impacto real: era un `<div onClick>` sin tabIndex, sin
 * role y sin manejador de teclado.
 *
 * Y no es un boton cualquiera de una pantalla secundaria: marcar tareas es LO
 * QUE SE HACE en la vista del hijo. La unica accion de la pantalla, y no
 * existia para el teclado.
 *
 * Estaba escrito dos veces, una para las tareas diarias y otra para las extra,
 * con los mismos fallos en las dos. Por eso se extrae en vez de parchearse:
 * arreglar dos copias deja dos sitios donde volver a romperlo.
 */

const props = {
  nombre: 'Recoger la habitacion',
  puntos: 10,
  completada: false,
  tipo: 'diaria' as const,
  onToggle: vi.fn(),
};

describe('TaskToggle existe para el teclado', () => {
  it('es un boton, no un div que responde al raton', () => {
    render(<TaskToggle {...props} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('se puede alcanzar tabulando', async () => {
    render(<TaskToggle {...props} />);

    await userEvent.tab();

    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('se activa con Intro', async () => {
    const alMarcar = vi.fn();
    render(<TaskToggle {...props} onToggle={alMarcar} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(alMarcar).toHaveBeenCalledOnce();
  });

  it('se activa con la barra espaciadora', async () => {
    const alMarcar = vi.fn();
    render(<TaskToggle {...props} onToggle={alMarcar} />);

    await userEvent.tab();
    await userEvent.keyboard(' ');

    expect(alMarcar).toHaveBeenCalledOnce();
  });

  it('y con el raton, como antes', async () => {
    const alMarcar = vi.fn();
    render(<TaskToggle {...props} onToggle={alMarcar} />);

    await userEvent.click(screen.getByRole('button'));

    expect(alMarcar).toHaveBeenCalledOnce();
  });
});

describe('TaskToggle dice lo que es y en que estado esta', () => {
  it('el nombre accesible lleva la tarea y sus puntos', () => {
    // Sin los puntos, dos tareas parecidas suenan igual y no se sabe cual
    // renta mas. La informacion estaba en pantalla y no en el nombre.
    render(<TaskToggle {...props} />);

    expect(
      screen.getByRole('button', { name: /Recoger la habitacion.*10 puntos/i }),
    ).toBeInTheDocument();
  });

  it('sin marcar, aria-pressed es false', () => {
    render(<TaskToggle {...props} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marcada, aria-pressed es true', () => {
    // Antes el estado se comunicaba con color de fondo, un icono y un tachado.
    // Las tres cosas son visuales. Con aria-pressed se anuncia.
    render(<TaskToggle {...props} completada />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('los adornos no se anuncian', () => {
    // El icono y la chispita de "completada" son decoracion: repetirlos en voz
    // alta solo estorba.
    const { container } = render(<TaskToggle {...props} completada />);

    const adornos = container.querySelectorAll('[aria-hidden="true"]');
    expect(adornos.length).toBeGreaterThan(0);
  });

  it('cumple la zona tactil, que aqui se usa en movil', () => {
    render(<TaskToggle {...props} />);

    expect(screen.getByRole('button').className).toMatch(/min-h-/);
  });
});

describe('TaskToggle distingue diarias de extra sin cambiar de componente', () => {
  it.each(['diaria', 'extra'] as const)('el tipo %s se pinta distinto', (tipo) => {
    const { unmount } = render(<TaskToggle {...props} tipo="diaria" />);
    const clasesDiaria = screen.getByRole('button').className;
    unmount();

    render(<TaskToggle {...props} tipo={tipo} />);
    const clases = screen.getByRole('button').className;

    if (tipo === 'diaria') expect(clases).toBe(clasesDiaria);
    else expect(clases).not.toBe(clasesDiaria);
  });
});

describe('TaskToggle no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/dashboard/TaskToggle.tsx'), 'utf8')
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
