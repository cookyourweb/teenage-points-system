import type { InputHTMLAttributes } from 'react';
import React, { useId } from 'react';

/**
 * La casilla de verificacion.
 *
 * Va aparte de `Field` a proposito. Un checkbox no es un campo de texto con
 * otro `type`: la etiqueta va DESPUES del control y no antes, el estado se
 * lleva en `checked` y no en `value`, y no quiere la caja con borde y ancho
 * completo. Meterlo en Field habria sido una rama entera dentro del
 * componente para ahorrarse un fichero.
 *
 * Dos cosas que aqui no son decoracion:
 *
 * 1. El `htmlFor` hace que la ZONA PULSABLE sea la etiqueta entera, no un
 *    cuadrado de 16 px. Es la mitad del valor de un checkbox bien hecho, y en
 *    movil es la diferencia entre acertar y no acertar.
 * 2. El id lo genera useId. En el repo habia dos `id="isActive"` escritos a
 *    mano en ficheros distintos; si coinciden en pantalla, el segundo label
 *    apunta al primer control y pulsarlo marca la casilla equivocada.
 */

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'type' | 'name'> {
  /** Obligatorio. Sin etiqueta no hay nombre accesible. */
  label: string;
  name: string;
  /** Texto de apoyo debajo. Se anuncia junto a la casilla. */
  description?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, name, description, ...props }) => {
  const base = useId();
  const idControl = `${base}-${name}`;
  const idDescripcion = `${base}-desc`;

  const { className: _ignorado, style: _tampoco, ...limpias } = props as Record<string, unknown>;

  return (
    // La fila entera tiene 44 px de alto para que el objetivo tactil sea
    // comodo, aunque el cuadrado dibujado sea de 16. El minimo exigible es 24
    // (WCAG 2.2, 2.5.8 AA); 44 es el 2.5.5, que es AAA.
    <div className="flex min-h-11 items-start gap-3 py-2">
      <input
        {...(limpias as InputHTMLAttributes<HTMLInputElement>)}
        type="checkbox"
        id={idControl}
        name={name}
        aria-describedby={description ? idDescripcion : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-action accent-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      />

      <div className="flex-1">
        <label htmlFor={idControl} className="cursor-pointer text-sm font-medium text-content">
          {label}
        </label>

        {description && (
          <p id={idDescripcion} className="text-sm text-content-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkbox;
