import React, { useState } from 'react';
import PrivilegeRedeemDialog from './PrivilegeRedeemDialog';

interface Privilege {
  privilegioId: string;
  name: string;
  pointsRequired: number;
}

interface PrivilegeCardProps {
  privilege: Privilege;
  points: number;
    onRedeem: (date: string) => void;
}

const PrivilegeCard: React.FC<PrivilegeCardProps> = ({ privilege, points, onRedeem }) => {
  const canUnlock = points >= privilege.pointsRequired;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRedeem = (date: string) => {
    onRedeem(date);
    setIsModalOpen(false);
  };

  return (
    <div className="border p-4 rounded shadow bg-white dark:bg-black">
      <h4 className="font-semibold">{privilege.name}</h4>
      <p className="text-sm text-neutral-600">Puntos necesarios: {privilege.pointsRequired}</p>
      <button
        className={`mt-2 px-4 py-2 rounded ${
          canUnlock ? 'bg-success-500 text-white' : 'bg-neutral-300 text-neutral-600'
        }`}
        disabled={!canUnlock}
        onClick={() => setIsModalOpen(true)} // Open the modal on click
      >
        {canUnlock ? 'Desbloquear' : 'No disponible'}
      </button>

      <PrivilegeRedeemDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRedeem={handleRedeem}
        privilegeName={privilege.name}
      />
    </div>
  );
};

export default PrivilegeCard;
