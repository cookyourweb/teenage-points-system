import React, { useState } from "react";
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
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-4">Invitar a Nuevo Miembro</h2>
      <div>
        <label className="block text-sm font-medium mb-1">Correo Electrónico:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-2"
          placeholder="Ingresa el correo del miembro"
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">Invitación enviada correctamente.</p>}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
        <button
          onClick={handleInvite}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Enviar Invitación
        </button>
      </div>
    </div>
  );
};

export default InviteMember;
