//PrivilegeRedemptionModal tsx
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface PrivilegeRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeem: (date: string) => void;
}

const PrivilegeRedemptionModal: React.FC<PrivilegeRedemptionModalProps> = ({ isOpen, onClose, onRedeem }) => {
  const [selectedDate, setSelectedDate] = useState<string>(''); // State for selected date

  const handleRedeem = (date: string) => {
    console.log(`Redeem button clicked for date: ${date}`); // Console log added
    onRedeem(date);
    onClose();
  };

  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <h2 className="text-lg font-bold">¿Qué día quieres disfrutar tu privilegio?</h2>
      <div className="mt-4">
        <Button onClick={() => handleRedeem('Hoy')}>Hoy</Button>
        <Button onClick={() => handleRedeem('Mañana')}>Mañana</Button>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="mt-4"
        />
        <Button onClick={() => handleRedeem(selectedDate)}>Seleccionar Día</Button>
      </div>
    </Modal>
  );
};

export default PrivilegeRedemptionModal;
