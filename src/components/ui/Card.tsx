import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => {
  return (
    <div className={`border rounded-lg shadow-md p-4 bg-white ${className}`}>
      {children}
    </div>
  );
};

type CardHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardHeader = ({ children, className }: CardHeaderProps) => {
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

export const CardTitle = ({ children, className }: CardTitleProps) => {
  return (
    <h2 className={`text-xl font-bold ${className}`}>{children}</h2>
  );
};

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={`${className}`}>{children}</div>;
};
