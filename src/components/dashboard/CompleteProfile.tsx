import React, { useState } from "react";

import Button from "../ui/Button";
import Field from "../ui/Field";
import { updatePhoneNumber } from "../../services/usersService";

interface CompleteProfileProps {
  userId: string;
  onProfileUpdated: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ userId, onProfileUpdated }) => {
  const [phone, setPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Antes esto era un solo `message` que servia para el error Y para el exito,
  // y se pintaba siempre en rojo. Asi que "actualizado con exito" salia como
  // si hubiera fallado. Son dos cosas distintas y se guardan aparte.
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setExito(null);

    if (!phone.trim()) {
      setError("Escribe un número de teléfono.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePhoneNumber(userId, phone);
      setExito("Número de teléfono actualizado.");
      onProfileUpdated();
    } catch (err) {
      setError("No se ha podido actualizar tu número. Inténtalo de nuevo.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-content">Completa tu perfil</h1>
        <p className="text-content-muted">Añade tu número de teléfono. Es opcional.</p>
      </div>

      <Field
        label="Número de teléfono"
        name="telefono"
        type="tel"
        autoComplete="tel"
        placeholder="+34 123 456 789"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={error ?? undefined}
        disabled={isSubmitting}
      />

      {/* role="status" hace que un lector de pantalla lo anuncie al aparecer.
          Sin el, quien no ve la pantalla no se entera de que ha salido bien y
          se queda esperando. Es el hallazgo F1 de la auditoria. */}
      {exito && (
        <p role="status" className="text-sm text-positive-text">
          {exito}
        </p>
      )}

      <Button onClick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Guardando" : "Guardar"}
      </Button>
    </div>
  );
};

export default CompleteProfile;
