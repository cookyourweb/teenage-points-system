import type { ButtonHTMLAttributes, ReactNode } from 'react';
import React from 'react';

/**
 * El boton del sistema.
 *
 * Antes de endurecerlo, la foto medida del repo era esta: `variant` se usaba
 * 6 veces en TODO src/ y `className` con colores 30 veces. La API existia y
 * nadie la usaba, porque `className` la pisaba y era mas comodo escribir el
 * color a mano. De ahi salieron 163 tokens de color distintos.
 *
 * Por eso el cambio de fondo no es cambiar colores: es QUITAR `className` del
 * contrato. Mientras se pueda pisar, se pisa. Con `Omit<..., 'className'>`,
 * TypeScript lo rechaza en compilacion y el sistema deja de ser una convencion
 * que alguien tiene que recordar en la revision.
 *
 * Los colores salen del NIVEL 3 de tokens (bg-btn-primary), no de la paleta.
 * Por eso no hay ni una clase `dark:` aqui dentro: la variable ya vale otra
 * cosa en modo oscuro.
 */

/** La INTENCION de la accion. Nunca un color. */
export type ButtonVariant =
  | 'primary' // la accion que quieres que haga
  | 'neutral' // cancelar, cerrar, volver
  | 'danger' // borrar, revocar
  | 'ghost'; // accion terciaria dentro de una lista

export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Union CERRADA de utilidades de disposicion.
 *
 * Es lo unico que un consumidor puede aportar al aspecto. Sale de mirar los
 * className reales del repo: los legitimos eran todos de esta forma (flex-1,
 * w-full). El resto eran colores, que es justo lo que se cierra.
 */
export type ButtonLayout = 'auto' | 'full' | 'grow';

interface ButtonBase
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  layout?: ButtonLayout;
  loading?: boolean;
}

/**
 * O hay texto visible, o hay `label`. No hay tercera opcion.
 *
 * Hallazgo C5 de la auditoria: habia tres botones cuyo unico contenido era un
 * icono. Para un lector de pantalla se anuncian como "boton" y nada mas, sin
 * forma de saber si copian, abren o borran.
 *
 * Los tipos no pueden cazarlo del todo, porque un icono es un `ReactNode`
 * valido y cabe en `children`. Lo que si hacen es abrir un camino corto para
 * hacerlo bien. El camino de hacerlo mal lo cierra una guarda en
 * Button.test.tsx que recorre el repo.
 */
export type ButtonProps =
  | (ButtonBase & { children: ReactNode; iconOnly?: never; label?: never })
  | (ButtonBase & { iconOnly: ReactNode; label: string; children?: never });

const BASE = [
  'inline-flex items-center justify-center gap-2',
  'rounded-lg font-medium',
  'transition-colors',
  // Un solo anillo de foco en toda la aplicacion, y visible tambien con teclado
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action',
  'disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-fg',
].join(' ');

const VARIANTE: Record<ButtonVariant, string> = {
  primary: 'bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover',
  neutral: 'bg-btn-neutral text-btn-neutral-fg hover:bg-btn-neutral-hover',
  danger: 'bg-btn-danger text-btn-danger-fg hover:bg-btn-danger-hover',
  ghost: 'bg-transparent text-btn-ghost-fg hover:bg-btn-ghost-bg-hover hover:text-btn-ghost-fg-hover',
};

/**
 * min-h-11 son 44 px.
 *
 * El minimo que EXIGE WCAG 2.2 es 24 px (criterio 2.5.8, nivel AA). Los 44
 * son el criterio 2.5.5, que es AAA, y coinciden con las guias de Apple y de
 * Google. Se elige el de 44 a proposito: este producto lo usan adolescentes
 * en el movil, y ahi la diferencia entre 24 y 44 se nota al pulsar.
 */
const TAMANO: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-6 text-lg',
};

/** Para los botones de solo icono: cuadrados, sin depender del texto. */
const CUADRADO: Record<ButtonSize, string> = {
  sm: 'min-h-11 w-11',
  md: 'min-h-11 w-11',
  lg: 'min-h-12 w-12',
};

const DISPOSICION: Record<ButtonLayout, string> = {
  auto: '',
  full: 'w-full',
  grow: 'flex-1',
};

const Button: React.FC<ButtonProps> = ({
  children,
  iconOnly,
  label,
  variant = 'primary',
  size = 'md',
  layout = 'auto',
  loading = false,
  disabled = false,
  type = 'button',
  ...props
}) => {
  const inactivo = disabled || loading;

  // Omit<> cierra la puerta en compilacion. Esto la cierra tambien en
  // ejecucion, que es el otro camino: un objeto de props construido
  // dinamicamente, o JavaScript sin tipos, se colaban igual por el spread.
  const { className: _ignorado, style: _tampoco, ...limpias } =
    props as Record<string, unknown>;

  return (
    <button
      {...limpias}
      type={type}
      disabled={inactivo}
      // aria-busy es lo que hace que un lector de pantalla anuncie que esta
      // ocupado. Sin el, para alguien ciego el boton solo deja de responder.
      aria-busy={loading || undefined}
      aria-label={label}
      className={[
        BASE,
        // Sin texto, el ancho no lo da nadie: hay que forzar el cuadrado o
        // queda un objetivo de 24 px de ancho.
        iconOnly ? CUADRADO[size] : TAMANO[size],
        DISPOSICION[layout],
        inactivo ? '' : VARIANTE[variant],
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {iconOnly ?? children}
    </button>
  );
};

export default Button;
