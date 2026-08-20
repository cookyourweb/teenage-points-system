import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faStar } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

/**
 * La fila de tarea que el hijo marca y desmarca.
 *
 * Hallazgo C1 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO, y el mas grave por
 * impacto real de los que quedaban: era un `<div onClick>` sin `tabIndex`, sin
 * `role` y sin manejador de teclado.
 *
 * Y no es un boton secundario de una pantalla cualquiera: **marcar tareas es
 * LO QUE SE HACE en la vista del hijo**. La unica accion de la pantalla, y no
 * existia para quien navega con teclado.
 *
 * Estaba escrito dos veces, una para las diarias y otra para las extra, con
 * los mismos fallos en las dos. Por eso se extrae en vez de parchearse:
 * arreglar dos copias deja dos sitios donde volver a romperlo.
 *
 * Un `<button>` de verdad trae gratis lo que el div no tenia: entra en el
 * orden de tabulacion, responde a Intro y a la barra espaciadora, y se anuncia
 * como boton. No hay que programar nada de eso, hay que usar el elemento.
 */

export type TipoTarea = 'diaria' | 'extra';

export interface TaskToggleProps {
  nombre: string;
  puntos: number;
  completada: boolean;
  tipo: TipoTarea;
  onToggle: () => void;
}

/**
 * Los dos tonos. El acento es para las extra, que es exactamente el papel que
 * le da la capa de tokens: lo que distingue y premia.
 */
const TONO: Record<TipoTarea, { hecha: string; pendiente: string; icono: string }> = {
  diaria: {
    hecha: 'bg-positive-bg border-positive',
    pendiente: 'bg-surface-sunken border-line hover:border-action',
    icono: 'text-positive',
  },
  extra: {
    hecha: 'bg-caution-bg border-caution',
    pendiente: 'bg-surface-sunken border-line-strong hover:border-action',
    icono: 'text-caution',
  },
};

const TaskToggle: React.FC<TaskToggleProps> = ({ nombre, puntos, completada, tipo, onToggle }) => {
  const tono = TONO[tipo];

  return (
    <button
      type="button"
      onClick={onToggle}
      // aria-pressed convierte el boton en un interruptor. Antes el estado se
      // comunicaba con color de fondo, un icono y un tachado: las tres cosas
      // son visuales y ninguna llegaba a quien escucha la pantalla.
      aria-pressed={completada}
      className={[
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border-2 p-4 text-left',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
        completada ? tono.hecha : tono.pendiente,
      ].join(' ')}
    >
      <span className="flex items-center gap-3">
        <FontAwesomeIcon
          icon={tipo === 'extra' ? faStar : faCheckSquare}
          aria-hidden="true"
          className={`text-2xl ${completada ? tono.icono : 'text-content-muted'}`}
        />

        <span>
          <span className={`block font-medium ${completada ? 'text-content-muted line-through' : 'text-content'}`}>
            {nombre}
          </span>
          {/* Los puntos van DENTRO del nombre accesible del boton. Sin ellos,
              dos tareas parecidas suenan igual y no se sabe cual renta mas. */}
          <span className="block text-sm text-content-muted">{puntos} puntos</span>
        </span>
      </span>

      {completada && (
        <span aria-hidden="true" className="text-xl">
          ✨
        </span>
      )}
    </button>
  );
};

export default TaskToggle;
