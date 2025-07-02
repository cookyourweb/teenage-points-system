import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface PrivilegeRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeem: (date: string) => void;
  childName: string;
  privilegeName?: string; // Añadir la propiedad privilegeName
}

const PrivilegeRedemptionModal: React.FC<PrivilegeRedemptionModalProps> = ({ 
  isOpen, 
  onClose, 
  onRedeem, 
  childName,
  privilegeName 
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleRedeem = (date: string) => {
    onRedeem(date);
    onClose();
  };

  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {childName}, ¿qué día quieres disfrutar tu privilegio {privilegeName}?
      </h2>
      <div className="mt-4 space-y-4">
        <Button onClick={() => handleRedeem('Hoy')}>Hoy</Button>
        <Button onClick={() => handleRedeem('Mañana')}>Mañana</Button>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="w-full mt-4 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <Button onClick={() => handleRedeem(selectedDate)}>Seleccionar Día</Button>
      </div>
    </Modal>
  );
};

export default PrivilegeRedemptionModal;
