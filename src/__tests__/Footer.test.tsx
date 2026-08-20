import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import Footer from '../components/Footer';

/**
 * El pie de la aplicacion.
 *
 * Hace dos cosas a la vez:
 *
 *  1. Da una puerta a las FAQs. Existen en `/faqs`, son publicas y funcionan, y
 *     hasta hoy no habia ni un enlace en toda la aplicacion: solo se llegaba
 *     escribiendo la URL.
 *  2. Firma quien lo ha hecho, con enlace a wunjocreations.com.
 *
 * Y de paso cierra parte del hallazgo A5 de la auditoria, que decia que no hay
 * ni un <main>, <header> ni <nav> en la mayoria de las pantallas: todo son
 * <div>, asi que la navegacion por regiones del lector de pantalla no sirve de
 * nada. Un <footer> es una region con nombre propio.
 */

const montar = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe('Footer es una region de verdad', () => {
  it('se anuncia como pie de pagina', () => {
    // contentinfo es el papel de un <footer> de pagina. Con un <div> no existe
    // y no se puede saltar a el con el lector de pantalla.
    montar();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

describe('Footer lleva a las FAQs', () => {
  it('hay un enlace a la pagina de preguntas', () => {
    montar();

    const enlace = screen.getByRole('link', { name: /preguntas frecuentes/i });
    expect(enlace).toHaveAttribute('href', '/faqs');
  });
});

describe('Footer firma quien lo ha hecho', () => {
  it('enlaza a wunjocreations.com', () => {
    montar();

    expect(screen.getByRole('link', { name: /WunjoCreations\.com/i })).toHaveAttribute(
      'href',
      'https://wunjocreations.com',
    );
  });

  it('el texto visible es "By WunjoCreations.com"', () => {
    montar();

    expect(screen.getByText(/^By$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^WunjoCreations\.com/ })).toBeInTheDocument();
  });

  it('el enlace externo no deja la puerta abierta a la pestana de origen', () => {
    // Con target="_blank" y sin rel, la pagina de destino puede manipular la
    // nuestra con window.opener. `noopener` lo corta.
    montar();

    const enlace = screen.getByRole('link', { name: /WunjoCreations/i });
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace.getAttribute('rel')).toMatch(/noopener/);
  });

  it('avisa de que se abre fuera, no solo con un icono', () => {
    // Quien no ve la pantalla no percibe que un enlace abre otra pestana. Si no
    // se dice, el boton de atras deja de funcionar y no se entiende por que.
    montar();

    expect(screen.getByRole('link', { name: /WunjoCreations.*abre en/i })).toBeInTheDocument();
  });
});

describe('Footer no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/Footer.tsx'), 'utf8')
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
