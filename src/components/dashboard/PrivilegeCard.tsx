import React, { useState } from 'react';
import PrivilegeRedemptionModal from '../ui/PrivilegeRedemptionModal';

interface Privilege {
  privilegioId: string;
  name: string;
  pointsRequired: number;
}

interface PrivilegeCardProps {
  privilege: Privilege;
  points: number;
  childName: string;
  onRedeem: (date: string) => void;
}

const PrivilegeCard: React.FC<PrivilegeCardProps> = ({ privilege, points, childName, onRedeem }) => {
  const canUnlock = points >= privilege.pointsRequired;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRedeem = (date: string) => {
    onRedeem(date);
    setIsModalOpen(false);
  };

  return (
    <div className="border p-4 rounded shadow bg-white dark:bg-black">
      <h4 className="font-semibold">{privilege.name}</h4>
      <p className="text-sm text-gray-600">Puntos necesarios: {privilege.pointsRequired}</p>
      <button
        className={`mt-2 px-4 py-2 rounded ${
          canUnlock ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
        }`}
        disabled={!canUnlock}
        onClick={() => setIsModalOpen(true)} // Open the modal on click
      >
        {canUnlock ? 'Desbloquear' : 'No disponible'}
      </button>

      <PrivilegeRedemptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRedeem={handleRedeem}
        childName={childName}
      />
    </div>
  );
};

export default PrivilegeCard;
