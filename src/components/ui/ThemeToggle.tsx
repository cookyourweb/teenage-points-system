import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { useTheme } from '../../hooks/useTheme';

/**
 * El interruptor de modo oscuro.
 *
 * Es un `aria-pressed` y no un boton normal a proposito: para un lector de
 * pantalla, esto no es "hacer algo", es "activar o desactivar algo". Con
 * aria-pressed se anuncia el estado, sin el solo se anuncia "boton".
 *
 * Los colores salen de los tokens (bg-surface-sunken, text-content-muted), asi
 * que el modo oscuro lo cambia solo sin una sola clase dark:.
 */
const ThemeToggle: React.FC = () => {
  const { resuelto, alternar } = useTheme();
  const esOscuro = resuelto === 'dark';

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={esOscuro}
      title={esOscuro ? 'Modo oscuro. Pulsa para cambiar a claro' : 'Modo claro. Pulsa para cambiar a oscuro'}
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-content-muted transition-colors hover:bg-line hover:text-content"
    >
      {/* El icono dice EN QUE MODO ESTAS, no a cual vas: de dia un sol, de
          noche una luna. La otra convencion (ensenar el destino) obliga a
          pensarlo, y un conmutador no se piensa, se mira. */}
      <FontAwesomeIcon icon={esOscuro ? faMoon : faSun} aria-hidden="true" />
      <span className="sr-only">
        {esOscuro ? 'Modo oscuro activado. Cambiar a claro' : 'Modo claro activado. Cambiar a oscuro'}
      </span>
    </button>
  );
};

export default ThemeToggle;
