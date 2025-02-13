
//Card.tsx
import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${className}`}>
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
    <div className={`border-b pb-2 mb-4 ${className}`}>
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
    <h2 className={`text-xl font-bold ${className}`}>{children}</h2>
  );
};

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => {
  return <div className={`${className}`}>{children}</div>;
};
