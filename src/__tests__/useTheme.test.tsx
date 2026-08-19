import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLAVE_TEMA, useTheme } from '../hooks/useTheme';

/**
 * El conmutador de modo oscuro.
 *
 * Contexto: el proyecto lleva `darkMode: 'class'` en tailwind.config.js desde
 * siempre y 521 clases `dark:` repartidas por 25 ficheros. Ninguna se ha pintado
 * nunca, porque nadie ponia la clase `dark` en ningun sitio.
 *
 * Este hook es quien la pone. Y la pone en documentElement (<html>), no en body,
 * porque los tokens viven en :root.
 */

/** jsdom no implementa matchMedia. Lo montamos con el valor que pida el test. */
const montarMatchMedia = (prefiereOscuro: boolean) => {
  const oyentes = new Set<(e: MediaQueryListEvent) => void>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => ({
      matches: consulta.includes('dark') && prefiereOscuro,
      media: consulta,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => oyentes.add(fn),
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => oyentes.delete(fn),
      dispatchEvent: () => false,
    })),
  );

  return {
    /** Simula que el usuario cambia el tema del sistema operativo. */
    cambiarSistema: (ahoraOscuro: boolean) =>
      oyentes.forEach((fn) => fn({ matches: ahoraOscuro } as MediaQueryListEvent)),
  };
};

const hayClaseOscura = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  montarMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTheme arranca con lo que el usuario ya habia elegido', () => {
  it('sin nada guardado, arranca en "system"', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.tema).toBe('system');
  });

  it('con una eleccion guardada, la respeta al arrancar', () => {
    localStorage.setItem(CLAVE_TEMA, 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.tema).toBe('dark');
    expect(hayClaseOscura()).toBe(true);
  });

  it('ignora un valor corrupto en localStorage y vuelve a "system"', () => {
    // Si alguien edita a mano el almacenamiento, la app no se rompe.
    localStorage.setItem(CLAVE_TEMA, 'azul-turquesa');

    const { result } = renderHook(() => useTheme());

    expect(result.current.tema).toBe('system');
  });
});

describe('useTheme pinta la clase en <html>, que es donde viven los tokens', () => {
  it('en "dark" anade la clase', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTema('dark'));

    expect(hayClaseOscura()).toBe(true);
    expect(result.current.resuelto).toBe('dark');
  });

  it('en "light" la quita, aunque el sistema prefiera oscuro', () => {
    // Elegir claro a mano tiene que ganar a la preferencia del sistema.
    montarMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTema('light'));

    expect(hayClaseOscura()).toBe(false);
    expect(result.current.resuelto).toBe('light');
  });

  it('en "system" sigue la preferencia del sistema operativo', () => {
    montarMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.tema).toBe('system');
    expect(result.current.resuelto).toBe('dark');
    expect(hayClaseOscura()).toBe(true);
  });

  it('en "system", si el sistema cambia en caliente, la app cambia con el', () => {
    const { cambiarSistema } = montarMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(hayClaseOscura()).toBe(false);

    act(() => cambiarSistema(true));

    expect(hayClaseOscura()).toBe(true);
    expect(result.current.resuelto).toBe('dark');
  });
});

describe('useTheme recuerda la eleccion', () => {
  it('guarda el tema elegido en localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTema('dark'));

    expect(localStorage.getItem(CLAVE_TEMA)).toBe('dark');
  });

  it('alternar lleva de claro a oscuro y de oscuro a claro', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTema('light'));
    act(() => result.current.alternar());
    expect(result.current.resuelto).toBe('dark');

    act(() => result.current.alternar());
    expect(result.current.resuelto).toBe('light');
  });
});
