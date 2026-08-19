import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Tabs from '../components/ui/Tabs';

/**
 * La navegacion por pestanas.
 *
 * Sale de dos hallazgos de docs/AUDITORIA-ACCESIBILIDAD.md:
 *
 *   C9  (Alto) Cuatro botones que funcionan como pestanas, sin role="tablist",
 *              role="tab", role="tabpanel", aria-selected ni aria-controls. El
 *              estado activo se comunicaba SOLO con color. Sin flechas.
 *   F7  (Medio) Al cambiar de pestana se sustituye todo el contenido, el foco
 *              se queda en el boton y nada anuncia que la pantalla ha cambiado.
 *
 * El patron es el de WAI-ARIA APG. Lo que lo hace un tablist de verdad y no
 * cuatro botones seguidos son tres cosas: los roles, el tabindex movil (solo
 * la pestana activa es tabulable, dentro se navega con flechas) y que el
 * panel se anuncie con el nombre de su pestana.
 */

const PESTANAS = [
  { id: 'general', label: 'Vista General' },
  { id: 'hijos', label: 'Gestion de Hijos' },
  { id: 'tareas', label: 'Tareas', disabled: true },
  { id: 'privilegios', label: 'Privilegios' },
];

const montar = (activa = 'general', alCambiar = vi.fn()) => {
  render(
    <Tabs label="Secciones del panel" tabs={PESTANAS} active={activa} onChange={alCambiar}>
      <p>Contenido de {activa}</p>
    </Tabs>,
  );
  return alCambiar;
};

describe('Tabs se anuncia como lo que es', () => {
  it('hay una lista de pestanas con nombre', () => {
    montar();

    expect(screen.getByRole('tablist', { name: 'Secciones del panel' })).toBeInTheDocument();
  });

  it('cada pestana es un tab, no un boton suelto', () => {
    montar();

    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('la activa lo dice con aria-selected, no solo con color', () => {
    montar('hijos');

    expect(screen.getByRole('tab', { name: 'Gestion de Hijos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Vista General' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('el panel existe y lleva el nombre de su pestana', () => {
    // Sin esto, al llegar al contenido el lector de pantalla no sabe decir de
    // que seccion es. Es lo que arregla F7.
    montar('hijos');

    expect(screen.getByRole('tabpanel', { name: 'Gestion de Hijos' })).toBeInTheDocument();
  });

  it('el panel es alcanzable con el tabulador', () => {
    // El contenido de un panel puede no tener nada enfocable. Con tabIndex 0
    // el usuario de teclado puede llegar a leerlo.
    montar();

    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });
});

describe('Tabs se maneja con el teclado', () => {
  it('solo la pestana activa es tabulable', () => {
    // Tabindex movil. Si las cuatro fueran tabulables, para pasar de largo la
    // navegacion harian falta cuatro pulsaciones de Tab en vez de una.
    montar('general');

    expect(screen.getByRole('tab', { name: 'Vista General' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Gestion de Hijos' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('la flecha derecha va a la siguiente', async () => {
    const alCambiar = montar('general');

    screen.getByRole('tab', { name: 'Vista General' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(alCambiar).toHaveBeenCalledWith('hijos');
  });

  it('la flecha izquierda vuelve, y da la vuelta por el principio', async () => {
    const alCambiar = montar('general');

    screen.getByRole('tab', { name: 'Vista General' }).focus();
    await userEvent.keyboard('{ArrowLeft}');

    expect(alCambiar).toHaveBeenCalledWith('privilegios');
  });

  it('las flechas se saltan las pestanas deshabilitadas', async () => {
    // "Tareas" esta deshabilitada. Desde "Gestion de Hijos", la derecha tiene
    // que caer en "Privilegios", no quedarse atascada.
    const alCambiar = montar('hijos');

    screen.getByRole('tab', { name: 'Gestion de Hijos' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(alCambiar).toHaveBeenCalledWith('privilegios');
  });

  it('Inicio y Fin van a la primera y a la ultima', async () => {
    const alCambiar = montar('hijos');
    const tab = screen.getByRole('tab', { name: 'Gestion de Hijos' });

    tab.focus();
    await userEvent.keyboard('{End}');
    expect(alCambiar).toHaveBeenCalledWith('privilegios');

    await userEvent.keyboard('{Home}');
    expect(alCambiar).toHaveBeenCalledWith('general');
  });
});

describe('Tabs con el raton', () => {
  it('al pulsar una pestana avisa', async () => {
    const alCambiar = montar();

    await userEvent.click(screen.getByRole('tab', { name: 'Privilegios' }));

    expect(alCambiar).toHaveBeenCalledWith('privilegios');
  });

  it('una pestana deshabilitada no avisa', async () => {
    const alCambiar = montar();

    await userEvent.click(screen.getByRole('tab', { name: 'Tareas' }));

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('la deshabilitada lo dice, no solo se ve gris', () => {
    // Hallazgo B10 de la auditoria: las pestanas bloqueadas se distinguian
    // solo por color atenuado. Con aria-disabled se anuncia.
    montar();

    expect(screen.getByRole('tab', { name: 'Tareas' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('Tabs no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Tabs.tsx'), 'utf8')
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
