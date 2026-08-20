import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import type { TipoTarea } from './TaskToggle';

/**
 * La celda de la rejilla semanal: un dia por columna, una tarea por fila.
 *
 * Hallazgo C3 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO. Eran botones cuyo
 * unico contenido era un icono, asi que se anunciaban como "boton" y nada mas.
 *
 * En una rejilla de 7 columnas por N filas eso son decenas de botones
 * **identicos e indistinguibles**: no hay forma de saber si el que tienes
 * debajo es "Lunes, hacer la cama" o "Jueves, sacar la basura". El dato estaba
 * en la cabecera de la columna y en la primera celda de la fila, o sea a la
 * vista, pero fuera del nombre del boton.
 *
 * Estaba escrito dos veces, para diarias y para extra, igual que en ChildView.
 */

export interface TaskDayCellProps {
  /** El dia de la columna. Entra en el nombre accesible. */
  dia: string;
  /** La tarea de la fila. Tambien entra en el nombre. */
  nombre: string;
  completada: boolean;
  tipo: TipoTarea;
  disabled?: boolean;
  onToggle: () => void;
}

const TONO: Record<TipoTarea, { hecha: string; icono: string }> = {
  diaria: { hecha: 'bg-positive-bg', icono: 'text-positive' },
  extra: { hecha: 'bg-caution-bg', icono: 'text-caution' },
};

const TaskDayCell: React.FC<TaskDayCellProps> = ({
  dia,
  nombre,
  completada,
  tipo,
  disabled = false,
  onToggle,
}) => {
  const tono = TONO[tipo];

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={completada}
      // El nombre accesible lleva el dia Y la tarea. Es lo unico que distingue
      // una celda de las otras treinta y cuatro.
      aria-label={`${dia}, ${nombre}`}
      className={[
        'inline-flex min-h-11 w-11 items-center justify-center rounded-full',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
        completada ? tono.hecha : 'bg-surface-sunken hover:bg-line',
      ].join(' ')}
    >
      <FontAwesomeIcon
        icon={faCheckSquare}
        aria-hidden="true"
        className={`h-6 w-6 ${completada ? tono.icono : 'text-content-muted'}`}
      />
    </button>
  );
};

export default TaskDayCell;
