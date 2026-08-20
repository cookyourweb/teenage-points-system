import React, { useState } from 'react';

import Button from '../ui/Button';
import Field from '../ui/Field';
import Modal from '../ui/Modal';

/**
 * El dialogo de "¿que dia quieres disfrutar tu privilegio?".
 *
 * Hallazgo D2 de docs/AUDITORIA-ACCESIBILIDAD.md, CRITICO. Habia CUATRO
 * implementaciones de esta misma pantalla:
 *
 *   1. ui/PrivilegeRedemptionModal, la unica que usaba ui/Modal (1 pantalla)
 *   2. ChildView, escrita a mano
 *   3. RewardTracker linea 809, escrita a mano
 *   4. RewardTracker linea 969, BYTE A BYTE IDENTICA a la anterior
 *
 * Las tres escritas a mano eran un `<div className="fixed inset-0">`: sin
 * role="dialog", sin nombre, sin trampa de foco, sin Escape y sin devolver el
 * foco al cerrar. Todo lo que ya estaba arreglado en ui/Modal y que se
 * saltaban por ir por libre.
 *
 * Vive en dashboard/ y no en ui/ porque sabe de privilegios. En ui/ solo van
 * piezas que no saben nada del dominio.
 */

export interface PrivilegeRedeemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe el momento elegido, ya en texto: "Hoy", "Mañana" o una fecha. */
  onRedeem: (cuando: string) => void;
  privilegeName: string;
  /** Limites del calendario. Los pone quien sabe las reglas de la familia. */
  minDate?: string;
  maxDate?: string;
}

/** Los tres atajos que ya ofrecian las cuatro copias, unificados. */
const ATAJOS = ['Hoy', 'Mañana', 'Este fin de semana'] as const;

const PrivilegeRedeemDialog: React.FC<PrivilegeRedeemDialogProps> = ({
  isOpen,
  onClose,
  onRedeem,
  privilegeName,
  minDate,
  maxDate,
}) => {
  const [fecha, setFecha] = useState('');

  const canjear = (cuando: string) => {
    onRedeem(cuando);
    setFecha('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`¿Cuándo quieres disfrutar "${privilegeName}"?`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {ATAJOS.map((cuando) => (
            <Button key={cuando} layout="full" onClick={() => canjear(cuando)}>
              {cuando}
            </Button>
          ))}
        </div>

        <Field
          label="O elige una fecha concreta"
          name="fecha-canje"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          min={minDate}
          max={maxDate}
        />

        <div className="flex gap-3">
          {/* El boton de confirmar solo existe cuando hay algo que confirmar.
              Un boton que no hace nada es peor que un boton que no esta: quien
              lo pulsa se cree que ha pasado algo. */}
          {fecha && (
            <Button
              layout="grow"
              onClick={() => canjear(new Date(fecha).toLocaleDateString('es-ES'))}
            >
              Confirmar fecha
            </Button>
          )}

          <Button variant="neutral" layout="grow" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivilegeRedeemDialog;
