// src/components/ui/Button.tsx
import React from "react";

// Extender las propiedades nativas del botón HTML
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  disabled = false,
  variant = 'primary',
  size = 'md',
  loading = false,
  type = "button",
  ...props
}) => {
  // Clases base del botón
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Variantes de color
  const variantClasses = {
    primary: "bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700",
    secondary: "bg-neutral-500 hover:bg-neutral-600 text-white focus:ring-neutral-500 dark:bg-neutral-600 dark:hover:bg-neutral-700",
    success: "bg-success-500 hover:bg-success-600 text-white focus:ring-success-500 dark:bg-success-600 dark:hover:bg-success-700",
    danger: "bg-danger-500 hover:bg-danger-600 text-white focus:ring-danger-500 dark:bg-danger-600 dark:hover:bg-danger-700",
    warning: "bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500 dark:bg-warning-600 dark:hover:bg-warning-700",
    info: "bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700"
  };
  
  // Tamaños
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  
  // Clases cuando está deshabilitado
  const disabledClasses = disabled || loading 
    ? "bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-400 cursor-not-allowed hover:bg-neutral-300 dark:hover:bg-neutral-600"
    : variantClasses[variant];
  
  const finalClassName = `${baseClasses} ${sizeClasses[size]} ${disabledClasses} ${className}`;

  return (
    <button
      type={type}
      className={finalClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;