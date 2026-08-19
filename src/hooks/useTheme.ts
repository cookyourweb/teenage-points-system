import { useCallback, useEffect, useState } from 'react';

/**
 * El conmutador de modo oscuro.
 *
 * El proyecto llevaba `darkMode: 'class'` en tailwind.config.js y 521 clases
 * `dark:` repartidas por 25 ficheros. Ninguna se habia pintado nunca, porque
 * nadie ponia la clase `dark` en ningun sitio. Este hook es quien la pone.
 *
 * La pone en documentElement (<html>) y no en body, porque los tokens viven en
 * :root y el bloque oscuro es `:root.dark`.
 */

export type Tema = 'light' | 'dark' | 'system';

/** Lo que se guarda de verdad: la ELECCION, no el resultado. */
export const CLAVE_TEMA = 'tps-tema';

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

const esTema = (valor: unknown): valor is Tema =>
  valor === 'light' || valor === 'dark' || valor === 'system';

/** Lo guardado, si es valido. Un valor corrupto no rompe la app: vuelve a system. */
const temaGuardado = (): Tema => {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    return esTema(guardado) ? guardado : 'system';
  } catch {
    // Safari en modo privado puede lanzar al tocar localStorage.
    return 'system';
  }
};

const sistemaPrefiereOscuro = (): boolean =>
  typeof matchMedia === 'function' && matchMedia(CONSULTA_OSCURO).matches;

export function useTheme() {
  const [tema, setTemaEstado] = useState<Tema>(temaGuardado);

  // Se guarda aparte porque en 'system' el resultado cambia sin que cambie la
  // eleccion: el usuario toca el tema del sistema operativo y la app le sigue.
  const [prefiereOscuro, setPrefiereOscuro] = useState(sistemaPrefiereOscuro);

  const resuelto: 'light' | 'dark' =
    tema === 'system' ? (prefiereOscuro ? 'dark' : 'light') : tema;

  // Escuchar al sistema operativo. Solo importa mientras el tema sea 'system',
  // pero suscribirse siempre es mas barato que atarlo a una condicion.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;

    const consulta = matchMedia(CONSULTA_OSCURO);
    const alCambiar = (evento: MediaQueryListEvent) => setPrefiereOscuro(evento.matches);

    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // La unica escritura al DOM de todo el sistema de temas.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resuelto === 'dark');
  }, [resuelto]);

  const setTema = useCallback((nuevo: Tema) => {
    setTemaEstado(nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      // Si no se puede persistir, el tema sigue funcionando en esta sesion.
    }
  }, []);

  /**
   * Alterna entre claro y oscuro.
   *
   * Sale de 'system' a proposito: si el usuario pulsa el boton, esta eligiendo,
   * y a partir de ahi manda su eleccion y no el sistema operativo.
   */
  const alternar = useCallback(
    () => setTema(resuelto === 'dark' ? 'light' : 'dark'),
    [resuelto, setTema],
  );

  return { tema, resuelto, setTema, alternar };
}
