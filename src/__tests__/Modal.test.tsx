import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Modal from '../components/ui/Modal';

/**
 * El dialogo. Hallazgo D1 de docs/AUDITORIA-ACCESIBILIDAD.md, el unico CRITICO
 * que quedaba, y el que mas rinde: los 8 usos ya pasan por este fichero, asi
 * que arreglarlo aqui arregla los 8 sitios sin tocar las pantallas.
 *
 * Lo que estaba roto, todo junto:
 *   - Sin role="dialog" ni aria-modal: para un lector de pantalla no era un
 *     dialogo, era un div mas.
 *   - Sin aria-labelledby: el dialogo no tenia nombre.
 *   - Sin trampa de foco: al abrirlo el foco se quedaba en el boton de detras,
 *     y con Tab se recorria toda la pagina de atras, que seguia en el arbol de
 *     accesibilidad.
 *   - Al cerrarlo, el foco no volvia al boton que lo abrio: te quedabas al
 *     principio del documento.
 *   - No cerraba con Escape.
 *   - Al cerrarse forzaba overflow 'auto' en vez de devolver el que habia.
 */

/** Un caso realista: un boton abre el dialogo, y dentro hay dos controles. */
const Ejemplo = ({ alCerrar }: { alCerrar?: () => void } = {}) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        Abrir
      </button>

      <Modal
        isOpen={abierto}
        title="Nueva tarea"
        onClose={() => {
          setAbierto(false);
          alCerrar?.();
        }}
      >
        <input aria-label="Nombre" />
        <button type="button">Guardar</button>
      </Modal>
    </>
  );
};

describe('Modal se anuncia como un dialogo', () => {
  it('cerrado no pinta nada', () => {
    render(<Ejemplo />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto es un dialogo con nombre', async () => {
    render(<Ejemplo />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeInTheDocument();
  });

  it('declara que es modal, para que el lector ignore lo de detras', async () => {
    render(<Ejemplo />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('el titulo lo pinta el componente, no cada llamante por su cuenta', async () => {
    // Hoy cada pantalla ponia su propio <h2> suelto y ninguno estaba
    // conectado al dialogo. Ahora es una prop obligatoria.
    render(<Ejemplo />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('heading', { name: 'Nueva tarea' })).toBeInTheDocument();
  });
});

describe('Modal atrapa el foco mientras esta abierto', () => {
  it('al abrir, el foco entra en el dialogo', async () => {
    // Sin esto el foco se queda en el boton de detras y quien navega con
    // teclado no sabe que ha pasado.
    render(<Ejemplo />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('el tabulador da la vuelta dentro y no se escapa', async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialogo = screen.getByRole('dialog');

    // Se recorre el dialogo entero varias veces: si en algun momento el foco
    // sale, es que la trampa no cierra.
    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it('Shift+Tab tampoco se escapa por arriba', async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialogo = screen.getByRole('dialog');

    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab({ shift: true });
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });
});

describe('Modal se cierra como se espera', () => {
  it('con Escape', async () => {
    const alCerrar = vi.fn();
    render(<Ejemplo alCerrar={alCerrar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await userEvent.keyboard('{Escape}');

    expect(alCerrar).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con el boton de cerrar, que tiene nombre', async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al pulsar fuera', async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await userEvent.click(screen.getByTestId('modal-fondo'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al cerrar, el foco VUELVE al boton que lo abrio', async () => {
    // Es la mitad de la trampa de foco y la que mas se olvida. Sin esto te
    // quedas al principio del documento y hay que volver a tabular entero.
    render(<Ejemplo />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });

    await userEvent.click(abrir);
    await userEvent.keyboard('{Escape}');

    expect(abrir).toHaveFocus();
  });
});

describe('Modal deja la pagina como estaba', () => {
  it('bloquea el scroll mientras esta abierto y DEVUELVE el valor previo', async () => {
    // Antes forzaba 'auto' al cerrar. Si la pagina tenia otro overflow puesto
    // a proposito, el dialogo se lo cargaba al cerrarse.
    document.body.style.overflow = 'scroll';
    render(<Ejemplo />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('scroll');

    document.body.style.overflow = '';
  });
});

describe('Modal no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Modal.tsx'), 'utf8')
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
