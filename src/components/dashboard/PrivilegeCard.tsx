// PrivilegeCard.tsx
import React, { useState } from 'react';
import PrivilegeRedemptionModal from '../ui/PrivilegeRedemptionModal';

interface Privilege {
  name: string;
  pointsRequired: number;
}

interface PrivilegeCardProps {
  privilege: Privilege;
  points: number;
}

const PrivilegeCard: React.FC<PrivilegeCardProps> = ({ privilege, points }) => {
  const canUnlock = points >= privilege.pointsRequired;
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

  const handleRedeem = (date: string) => {
    // Logic to redeem the privilege with the selected date
    console.log(`Redeemed ${privilege.name} on ${date}`);
    setIsModalOpen(false); // Close the modal after redeeming
  };

  return (
      <div className="border p-4 rounded shadow bg-white dark:bg-gray-800">
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

      {/* Modal for privilege redemption */}
      <PrivilegeRedemptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRedeem={handleRedeem} 
      />
    </div>
  );
};

export default PrivilegeCard;
