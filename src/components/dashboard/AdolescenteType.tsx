import React from 'react';
import { Child } from '../../types/familyTypes';

interface ChildrenCardProps {
  child: Child;
}

const ChildrenCard: React.FC<ChildrenCardProps> = ({ child }) => {
  return (
    <div className="p-4 border rounded shadow-md">
      <h3 className="text-lg font-bold">{child.nombre}</h3>
      <p>Edad: {child.edad}</p>
      <p>Tipos de Adolescente: {child.tiposAdolescente.join(', ')}</p>
      <a href={child.rewardLink} className="text-blue-500 hover:underline">
        Acceder a su sistema de puntos
      </a>
    </div>
  );
};

export default ChildrenCard;
