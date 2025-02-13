//Modal.tsx 
import React from 'react';

interface ModalProps {
  onClose: () => void;
  isOpen: boolean; // Add isOpen prop
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, isOpen, children }) => {
  if (!isOpen) return null; // Return null if the modal is not open

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 dark:text-gray-300">X</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
