import { useState } from 'react';

import Field from '../ui/Field';
import Modal from '../ui/Modal';
import ImportarDeberes from './ImportarDeberes';
import ListaDeberes from './ListaDeberes';

/**
 * La pestaña «Deberes» del adulto: elige hijo, ve su lista y abre el importador
 * en un diálogo. Es dueño del Modal; al guardar no lo cierra (el adulto ve el resumen) pero recarga la lista
 * (cambiando la `key` de ListaDeberes, que vuelve a pedir los datos).
 */

export interface PanelDeberesProps {
  familyId: string;
  hijos: { id: string; nombre: string }[];
}

export default function PanelDeberes({ familyId, hijos }: PanelDeberesProps): JSX.Element {
  const [elegido, setElegido] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [version, setVersion] = useState(0);

  if (hijos.length === 0) {
    return <p className="text-content-muted">Añade un hijo para importar sus deberes.</p>;
  }

  const hijo = hijos.find((h) => h.id === elegido) ?? hijos[0];

  return (
    <div className="space-y-4">
      <Field
        as="select"
        label="Hijo"
        name="hijo-deberes"
        value={hijo.id}
        onChange={(e) => setElegido(e.target.value)}
        options={hijos.map((h) => ({ value: h.id, label: h.nombre }))}
      />
      <ListaDeberes
        key={`${hijo.id}-${version}`}
        familyId={familyId}
        hijoId={hijo.id}
        onImportar={() => setAbierto(true)}
      />
      <Modal isOpen={abierto} onClose={() => setAbierto(false)} title={`Importar deberes de ${hijo.nombre}`}>
        <ImportarDeberes
          familyId={familyId}
          hijoId={hijo.id}
          nombreHijo={hijo.nombre}
          onGuardado={() => setVersion((v) => v + 1)}
        />
      </Modal>
    </div>
  );
}
