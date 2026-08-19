import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import React, { useId } from 'react';

/**
 * El campo de formulario del sistema.
 *
 * Sustituye a `ui/Input`, que era codigo muerto: 0 ficheros lo importaban y
 * habia 41 `<input>` crudos repartidos por el repo. Murio por dos motivos
 * concretos, y los dos estan corregidos aqui:
 *
 *  1. Tenia `label?: string`, OPCIONAL. Por eso ninguno de los 41 inputs
 *     crudos tiene etiqueta: nada obligaba a ponerla. Aqui es obligatoria, y
 *     el problema desaparece de raiz porque sin ella no compila.
 *  2. Definia `value` y `onChange` a mano y no pasaba el resto de props. No se
 *     podia usar con `maxLength`, `min`, `max` ni `type="date"`, que es justo
 *     lo que necesitaban `taskForm` y `RewardTracker`. Asi que nadie lo uso.
 *
 * Un solo componente para input, select y textarea porque los tres comparten
 * exactamente la misma estructura: etiqueta, control, error y texto de ayuda.
 *
 * `aria-describedby` y `aria-invalid` los cablea el componente. El consumidor
 * no puede olvidarse porque ni siquiera los escribe.
 */

interface FieldBase {
  /** Obligatorio. Sin etiqueta no hay nombre accesible. */
  label: string;
  name: string;
  /** Oculta la etiqueta a la vista pero la deja para el lector de pantalla. */
  labelHidden?: boolean;
  error?: string;
  hint?: string;
}

type SinAspecto<T> = Omit<T, 'className' | 'style' | 'name'>;

export type FieldProps =
  | (FieldBase & { as?: 'input' } & SinAspecto<InputHTMLAttributes<HTMLInputElement>>)
  | (FieldBase & { as: 'textarea' } & SinAspecto<TextareaHTMLAttributes<HTMLTextAreaElement>>)
  | (FieldBase & {
      as: 'select';
      options: ReadonlyArray<{ value: string; label: string }>;
    } & SinAspecto<SelectHTMLAttributes<HTMLSelectElement>>);

const CONTROL = [
  'w-full min-h-11 rounded-lg px-3 py-2',
  'bg-surface text-content',
  'border border-line-strong',
  'placeholder:text-content-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-fg',
  // aria-invalid en vez de una prop de color: el estilo sigue al estado real
  // que anuncia el lector de pantalla, asi que no pueden desincronizarse.
  'aria-[invalid=true]:border-negative',
].join(' ');

const Field: React.FC<FieldProps> = (props) => {
  const { label, name, labelHidden = false, error, hint, as = 'input', ...resto } = props as
    FieldBase & { as?: 'input' | 'textarea' | 'select'; options?: ReadonlyArray<{ value: string; label: string }> } &
    Record<string, unknown>;

  const base = useId();
  const idControl = `${base}-${name}`;
  const idError = `${base}-error`;
  const idHint = `${base}-hint`;

  // Se describe con lo que EXISTE. Un aria-describedby que apunta a un id
  // inexistente no se lee, y ademas oculta que falta algo.
  const descrito = [error ? idError : null, hint ? idHint : null].filter(Boolean).join(' ');

  // La puerta cerrada, igual que en Button: los tipos ya lo impiden, pero
  // props construidas dinamicamente o JavaScript sin tipos se colaban.
  const { className: _ignorado, style: _tampoco, options, ...limpias } = resto;

  const comunes = {
    ...limpias,
    id: idControl,
    name,
    className: CONTROL,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': descrito || undefined,
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={idControl}
        className={labelHidden ? 'sr-only' : 'text-sm font-medium text-content'}
      >
        {label}
        {'required' in limpias && limpias.required ? (
          <span aria-hidden="true" className="text-negative">
            {' *'}
          </span>
        ) : null}
      </label>

      {as === 'textarea' ? (
        <textarea {...(comunes as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : as === 'select' ? (
        <select {...(comunes as React.SelectHTMLAttributes<HTMLSelectElement>)}>
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...(comunes as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}

      {hint && (
        <p id={idHint} className="text-sm text-content-muted">
          {hint}
        </p>
      )}

      {/* role="alert" hace que un error que aparece al validar se lea sin que
          el usuario tenga que ir a buscarlo. */}
      {error && (
        <p id={idError} role="alert" className="text-sm text-negative-text">
          {error}
        </p>
      )}
    </div>
  );
};

export default Field;
