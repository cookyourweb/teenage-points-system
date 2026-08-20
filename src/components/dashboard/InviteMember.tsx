//InviteMember.tsx
import React, { useState } from "react";
import Button from '../ui/Button';
import Field from '../ui/Field';
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";

type InviteMemberProps = {
  familyId: string;
  onClose: () => void;
};

const InviteMember: React.FC<InviteMemberProps> = ({ familyId, onClose }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      setError("Por favor, ingresa un correo electrónico.");
      return;
    }

    try {
      // Guardar la invitación en Firestore
      await addDoc(collection(db, "invitaciones"), {
        familyId,
        email,
        status: "pendiente", // Estado de la invitación
        createdAt: new Date(),
      });

      setSuccess(true);
      setError("");
      setEmail(""); // Limpiar el campo de entrada
      setTimeout(() => {
        setSuccess(false);
        onClose(); // Cerrar el modal después de unos segundos
      }, 2000);
    } catch (error) {
      console.error("Error al invitar miembro:", error);
      setError("Ocurrió un error al enviar la invitación.");
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded bg-surface p-6 shadow">
      <h2 className="text-lg font-bold text-content">Invitar a un miembro de la familia</h2>

      <Field
        label="Correo electrónico"
        name="correo-invitacion"
        type="email"
        autoComplete="email"
        placeholder="nombre@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
      />

      {/* role="status" para que se anuncie al aparecer. Sin el, quien no ve la
          pantalla no se entera de que la invitacion ha salido. Hallazgo F1. */}
      {success && (
        <p role="status" className="text-sm text-positive-text">
          Invitación enviada correctamente.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="neutral" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleInvite}>Enviar invitación</Button>
      </div>
    </div>
  );
};

export default InviteMember;
