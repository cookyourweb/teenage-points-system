import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskDayCell from '../components/dashboard/TaskDayCell';

/**
 * La celda de la rejilla semanal: un dia por columna, una tarea por fila.
 *
 * Hallazgo C3 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO. Eran botones cuyo
 * unico contenido era un icono, asi que un lector de pantalla los anunciaba
 * como "boton" y punto. En una rejilla de 7 columnas por N filas eso son
 * decenas de botones **identicos e indistinguibles**: no hay forma de saber si
 * el que tienes debajo del cursor es "Lunes, hacer la cama" o "Jueves, sacar
 * la basura".
 *
 * Y estaba escrito dos veces, para diarias y para extra, igual que pasaba en
 * ChildView.
 */

const props = {
  dia: 'Lunes',
  nombre: 'Hacer la cama',
  completada: false,
  tipo: 'diaria' as const,
  onToggle: vi.fn(),
};

describe('TaskDayCell dice QUE celda es', () => {
  it('el nombre accesible lleva el dia y la tarea', () => {
    // Es lo que las distingue entre si. Sin esto, las 35 celdas de la rejilla
    // se anuncian exactamente igual.
    render(<TaskDayCell {...props} />);

    expect(
      screen.getByRole('button', { name: /Lunes.*Hacer la cama/i }),
    ).toBeInTheDocument();
  });

  it('dice si esta hecha con aria-pressed, no solo con color', () => {
    render(<TaskDayCell {...props} completada />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sin hacer, aria-pressed es false', () => {
    render(<TaskDayCell {...props} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('el icono no se anuncia, que es adorno', () => {
    const { container } = render(<TaskDayCell {...props} />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

describe('TaskDayCell se maneja', () => {
  it('al pulsarla avisa', async () => {
    const alMarcar = vi.fn();
    render(<TaskDayCell {...props} onToggle={alMarcar} />);

    await userEvent.click(screen.getByRole('button'));

    expect(alMarcar).toHaveBeenCalledOnce();
  });

  it('mientras sincroniza no se puede pulsar', async () => {
    const alMarcar = vi.fn();
    render(<TaskDayCell {...props} disabled onToggle={alMarcar} />);

    await userEvent.click(screen.getByRole('button'));

    expect(alMarcar).not.toHaveBeenCalled();
  });

  it('cumple la zona tactil', () => {
    render(<TaskDayCell {...props} />);

    expect(screen.getByRole('button').className).toMatch(/min-h-11|h-11/);
  });
});

describe('TaskDayCell no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/dashboard/TaskDayCell.tsx'), 'utf8')
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
