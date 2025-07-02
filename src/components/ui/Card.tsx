// src/components/ui/Card.tsx
import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors ${className}`}>
      {children}
    </div>
  );
};

type CardHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 ${className}`}>
      {children}
    </div>
  );
};

type CardTitleProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => {
  return (
    <h2 className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </h2>
  );
};

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => {
  return <div className={`${className}`}>{children}</div>;
};

// Ejemplos de uso:
// 
// import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
// 
// <Card>
//   <CardHeader>
//     <CardTitle className="flex items-center gap-2">
//       <IconComponent />
//       Puntos de la Familia
//     </CardTitle>
//   </CardHeader>
//   <CardContent>
//     Contenido aquí
//   </CardContent>
// </Card>// src/components/ui/Card.tsx
