import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Checkbox from '../components/ui/Checkbox';

/**
 * La casilla de verificacion.
 *
 * Va aparte de `Field` a proposito. Un checkbox no es un campo de texto con
 * otro `type`: la etiqueta va DESPUES del control y no antes, el estado se
 * lleva en `checked` y no en `value`, y no quiere la caja con borde y ancho
 * completo. Meterlo en Field habria sido una rama entera dentro del
 * componente para ahorrarse un fichero.
 *
 * En el repo hay 4, con dos formas: sola, y con un texto de apoyo debajo.
 */

describe('Checkbox se anuncia y se maneja', () => {
  it('tiene nombre accesible', () => {
    render(<Checkbox label="Tarea activa" name="isActive" />);

    expect(screen.getByRole('checkbox', { name: /Tarea activa/ })).toBeInTheDocument();
  });

  it('al pulsar el TEXTO tambien se marca', async () => {
    // Es la mitad del valor de un checkbox bien hecho: la zona pulsable es la
    // etiqueta entera, no un cuadrado de 16 px. Sin htmlFor esto no pasa.
    const alCambiar = vi.fn();
    render(<Checkbox label="Tarea activa" name="isActive" onChange={alCambiar} />);

    await userEvent.click(screen.getByText('Tarea activa'));

    expect(alCambiar).toHaveBeenCalledOnce();
  });

  it('refleja si esta marcada', () => {
    render(<Checkbox label="Tarea activa" name="isActive" checked readOnly />);

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('deshabilitada no responde', async () => {
    const alCambiar = vi.fn();
    render(<Checkbox label="Tarea activa" name="isActive" disabled onChange={alCambiar} />);

    await userEvent.click(screen.getByRole('checkbox'));

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('la descripcion se anuncia con la casilla', () => {
    render(
      <Checkbox
        label="Tarea activa"
        name="isActive"
        description="Si la desmarcas, tus hijos dejan de verla"
      />,
    );

    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(
      /dejan de verla/,
    );
  });
});

describe('Checkbox no repite ids', () => {
  it('dos casillas con el mismo name generan ids distintos', () => {
    // En el repo habia dos `id="isActive"` escritos a mano en ficheros
    // distintos. Si coinciden en pantalla, el segundo label apunta al primer
    // control y pulsarlo marca la casilla equivocada.
    render(
      <>
        <Checkbox label="Activa aqui" name="isActive" />
        <Checkbox label="Activa alli" name="isActive" />
      </>,
    );

    const [a, b] = screen.getAllByRole('checkbox');
    expect(a.id).not.toBe(b.id);
  });
});

describe('Checkbox no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Checkbox.tsx'), 'utf8')
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
