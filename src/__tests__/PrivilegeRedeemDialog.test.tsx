import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PrivilegeRedeemDialog from '../components/dashboard/PrivilegeRedeemDialog';

/**
 * El dialogo de "¿que dia quieres disfrutar tu privilegio?".
 *
 * Hallazgo D2 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO. Habia CUATRO
 * implementaciones de esta misma pantalla:
 *
 *   1. ui/PrivilegeRedemptionModal, la unica que usaba ui/Modal (1 pantalla)
 *   2. ChildView, escrita a mano
 *   3. RewardTracker linea 809, escrita a mano
 *   4. RewardTracker linea 969, BYTE A BYTE IDENTICA a la anterior
 *
 * Las tres escritas a mano eran `<div className="fixed inset-0">`: sin
 * role="dialog", sin nombre, sin trampa de foco, sin Escape y sin devolver el
 * foco. Todo lo que se arreglo ayer en ui/Modal y que ellas se saltaban por ir
 * por libre.
 *
 * Se unifican en una sola pieza que se apoya en Modal, asi que heredan los
 * seis arreglos sin volver a escribirlos.
 */

const props = {
  isOpen: true,
  onClose: vi.fn(),
  onRedeem: vi.fn(),
  privilegeName: 'Una hora extra de consola',
};

describe('PrivilegeRedeemDialog es un dialogo de verdad', () => {
  it('se anuncia con el nombre del privilegio', () => {
    render(<PrivilegeRedeemDialog {...props} />);

    expect(
      screen.getByRole('dialog', { name: /Una hora extra de consola/ }),
    ).toBeInTheDocument();
  });

  it('cerrado no pinta nada', () => {
    render(<PrivilegeRedeemDialog {...props} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hereda la trampa de foco de Modal', () => {
    render(<PrivilegeRedeemDialog {...props} />);

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});

describe('PrivilegeRedeemDialog ofrece los atajos de siempre', () => {
  it.each([
    ['Hoy', 'Hoy'],
    ['Mañana', 'Mañana'],
    ['Este fin de semana', 'Este fin de semana'],
  ])('el atajo %s canjea con "%s"', async (etiqueta, esperado) => {
    const alCanjear = vi.fn();
    render(<PrivilegeRedeemDialog {...props} onRedeem={alCanjear} />);

    await userEvent.click(screen.getByRole('button', { name: new RegExp(etiqueta) }));

    expect(alCanjear).toHaveBeenCalledWith(esperado);
  });

  it('cancelar cierra sin canjear', async () => {
    const alCerrar = vi.fn();
    const alCanjear = vi.fn();
    render(<PrivilegeRedeemDialog {...props} onClose={alCerrar} onRedeem={alCanjear} />);

    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(alCerrar).toHaveBeenCalled();
    expect(alCanjear).not.toHaveBeenCalled();
  });
});

describe('PrivilegeRedeemDialog deja elegir una fecha concreta', () => {
  it('el campo de fecha tiene etiqueta, no solo un placeholder', () => {
    render(<PrivilegeRedeemDialog {...props} />);

    expect(screen.getByLabelText(/fecha/i)).toHaveAttribute('type', 'date');
  });

  it('no se puede confirmar una fecha antes de elegirla', () => {
    // Un boton que no hace nada es peor que un boton que no esta: quien lo
    // pulsa cree que ha pasado algo.
    render(<PrivilegeRedeemDialog {...props} />);

    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
  });

  it('al elegir fecha aparece el boton, y canjea con esa fecha', async () => {
    const alCanjear = vi.fn();
    render(<PrivilegeRedeemDialog {...props} onRedeem={alCanjear} />);

    await userEvent.type(screen.getByLabelText(/fecha/i), '2026-09-15');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    // Se entrega ya formateada en español: antes cada llamante lo hacia por su
    // cuenta y uno de ellos no lo hacia.
    expect(alCanjear).toHaveBeenCalledWith('15/9/2026');
  });

  it('respeta los limites de fecha que le pasen', () => {
    render(<PrivilegeRedeemDialog {...props} minDate="2026-09-01" maxDate="2026-09-30" />);

    const campo = screen.getByLabelText(/fecha/i);
    expect(campo).toHaveAttribute('min', '2026-09-01');
    expect(campo).toHaveAttribute('max', '2026-09-30');
  });
});

describe('PrivilegeRedeemDialog no conoce ni un color', () => {
  const fuente = readFileSync(
    join(__dirname, '..', 'components/dashboard/PrivilegeRedeemDialog.tsx'),
    'utf8',
  )
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

  it('no pinta su propio fondo de dialogo: se apoya en Modal', () => {
    // Si vuelve a aparecer un `fixed inset-0` aqui, es que alguien ha vuelto a
    // escribir un modal a mano y se salta los seis arreglos de ui/Modal.
    expect(fuente).not.toMatch(/fixed inset-0/);
    expect(fuente).toMatch(/from '\.\.\/ui\/Modal'/);
  });
});
