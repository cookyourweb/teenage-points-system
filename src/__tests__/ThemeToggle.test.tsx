import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeToggle from '../components/ui/ThemeToggle';
import { CLAVE_TEMA } from '../hooks/useTheme';

/**
 * El boton que enciende el modo oscuro.
 *
 * Se prueba por lo que ve y hace un usuario, no por su estructura: hay un
 * control con nombre accesible, se pulsa, y el documento cambia de tema.
 */

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      media: '',
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  );
});

afterEach(() => vi.unstubAllGlobals());

const enOscuro = () => document.documentElement.classList.contains('dark');

describe('ThemeToggle', () => {
  it('es un boton con nombre accesible, no un icono suelto', () => {
    // Sin nombre accesible, un lector de pantalla lee "boton" y ya.
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /oscuro|claro|tema/i })).toBeInTheDocument();
  });

  it('al pulsarlo enciende el modo oscuro', async () => {
    render(<ThemeToggle />);
    expect(enOscuro()).toBe(false);

    await userEvent.click(screen.getByRole('button'));

    expect(enOscuro()).toBe(true);
  });

  it('al pulsarlo dos veces vuelve al modo claro', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    expect(enOscuro()).toBe(false);
  });

  it('dice en que estado esta, para lectores de pantalla', () => {
    // aria-pressed convierte el boton en un interruptor: se anuncia
    // "activado" o "desactivado" en vez de solo "boton".
    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('recuerda la eleccion entre recargas', async () => {
    const { unmount } = render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button'));
    unmount();

    expect(localStorage.getItem(CLAVE_TEMA)).toBe('dark');

    render(<ThemeToggle />);

    expect(enOscuro()).toBe(true);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
