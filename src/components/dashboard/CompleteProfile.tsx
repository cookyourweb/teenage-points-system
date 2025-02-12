//CompletProfile.tsx
import React, { useState } from "react";
import { updatePhoneNumber } from "../../services/usersService";

interface CompleteProfileProps {
  userId: string;
  onProfileUpdated: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ userId, onProfileUpdated }) => {
  const [phone, setPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      setMessage("Por favor, ingresa un número de teléfono válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePhoneNumber(userId, phone);
      setMessage("Número de teléfono actualizado con éxito.");
      onProfileUpdated(); // Notificar al componente padre que se completó el perfil
    } catch (error) {
      setMessage("Hubo un error al actualizar tu número de teléfono.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Completa tu Perfil</h1>
      <p className="text-gray-600">Agrega tu número de teléfono (opcional).</p>
      <input
        type="tel"
        placeholder="+34 123 456 789"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full p-2 border rounded mt-4"
      />
      {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {isSubmitting ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
};

export default CompleteProfile;
