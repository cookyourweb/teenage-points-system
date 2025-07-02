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
    primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700",
    success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700",
    info: "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-500 dark:bg-cyan-600 dark:hover:bg-cyan-700"
  };
  
  // Tamaños
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  
  // Clases cuando está deshabilitado
  const disabledClasses = disabled || loading 
    ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
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