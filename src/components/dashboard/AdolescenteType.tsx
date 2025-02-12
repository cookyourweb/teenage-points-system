//adolescenteType.tsx
import React from "react";
import { Child } from "../../types/familyTypes";

interface ChildrenCardProps {
  child: Child;
}

const ChildrenCard: React.FC<ChildrenCardProps> = ({ child }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
        {child.nombre}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-1">
        <strong>Edad:</strong> {child.edad}
      </p>
      <p className="text-gray-600 dark:text-gray-300 mb-3">
        <strong>Tipos de Adolescente:</strong>{" "}
        {child.tiposAdolescente.length > 0
          ? child.tiposAdolescente.join(", ")
          : "No asignado"}
      </p>
      <a
        href={child.rewardLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 dark:text-blue-400 hover:underline"
        aria-label={`Acceder al sistema de puntos de ${child.nombre}`}
      >
        Acceder a su sistema de puntos
      </a>
    </div>
  );
};

export default ChildrenCard;
