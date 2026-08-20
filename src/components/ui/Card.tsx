import type { ReactNode } from 'react';
import React from 'react';

/**
 * La tarjeta. Era la ultima pieza de `ui/` con la puerta abierta.
 *
 * Aceptaba `className` libre, y por ahi entraba de todo: en `ChildView.tsx:191`
 * se le colaba un degradado entero. Lo mismo que ya se cerro en `Button` y en
 * `Field`.
 *
 * LO QUE DIJO LA MEDICION, antes de decidir la API. De 49 usos con
 * `className`, casi todos eran DISPOSICION legitima y solo 5 eran color:
 *
 *   26  flex items-center gap-2   en CardTitle -> es poner un icono al lado
 *   12  text-center               -> alineacion
 *   14  py-12 / py-8 / pt-6       -> aire en estados vacios
 *    5  degradados y text-white   -> ESTO es lo que se cierra
 *
 * Por eso la API abre una puerta para cada uso legitimo (`icon`, `align`,
 * `padding`, `tone`) y cierra la del color. **Cerrar sin dar alternativa es lo
 * que hace que la gente se salte el sistema**: si `Button` no hubiera ganado
 * `layout`, los `flex-1` habrian vuelto por otro lado.
 */

/** El papel de la tarjeta. Nunca un color. */
export type CardTone =
  | 'default' // la de siempre, sobre la superficie
  | 'featured' // la que corona una pantalla: puntos totales del hijo
  | 'reward'; // privilegios y premios

const TONO: Record<CardTone, string> = {
  default: 'bg-surface text-content',
  featured: 'bg-featured text-featured-fg',
  reward: 'bg-reward-bg text-content',
};

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  /**
   * Realza la tarjeta al pasar el raton.
   *
   * Solo cuando dentro hay algo que hacer: ahi el realce es INFORMACION ("esto
   * responde"), no adorno. Una tarjeta que se mueve y no hace nada promete
   * algo que no cumple.
   */
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, tone = 'default', interactive = false }) => (
  <div
    className={[
      'rounded-lg p-4 shadow transition-shadow',
      TONO[tone],
      interactive ? 'hover:shadow-raised' : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </div>
);

const ALINEACION = { start: '', center: 'text-center' } as const;
/** El aire de los estados vacios, que se pasaba como py-8 y py-12 a mano. */
const AIRE = { none: '', md: 'py-4', lg: 'py-8' } as const;

export interface CardHeaderProps {
  children: ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children }) => (
  <div className="mb-4 border-b border-line pb-2">{children}</div>
);

export interface CardTitleProps {
  children: ReactNode;
  /** Centrar el titulo. Salio de un `text-center` que se pasaba a mano. */
  align?: keyof typeof ALINEACION;
  /**
   * El icono de al lado. Resuelve el `flex items-center gap-2` que se pasaba a
   * mano en 26 de los 49 usos, y de paso lo marca como decorativo: si aportara
   * texto, el encabezado se llamaria "🏆 Puntos" y eso es lo que leeria un
   * lector de pantalla.
   */
  icon?: ReactNode;
  /**
   * Depende de lo que haya encima donde se coloque la tarjeta. Un encabezado en
   * el nivel equivocado rompe el esquema del documento.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  icon,
  align = 'start',
  headingLevel = 2,
}) => {
  const Encabezado = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <Encabezado
      className={`flex items-center gap-2 text-xl font-bold ${align === 'center' ? 'justify-center' : ''}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </Encabezado>
  );
};

export interface CardContentProps {
  children: ReactNode;
  align?: keyof typeof ALINEACION;
  padding?: keyof typeof AIRE;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  align = 'start',
  padding = 'none',
}) => (
  <div className={[ALINEACION[align], AIRE[padding]].filter(Boolean).join(' ')}>{children}</div>
);
