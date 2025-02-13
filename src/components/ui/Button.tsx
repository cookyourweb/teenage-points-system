//Button.tsx
import React from "react";
import { ButtonProps } from "../../types/uiTypes"; // Import ButtonProps from uiTypes

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        disabled
          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
          : "bg-blue-500 text-white hover:bg-blue-600"
      } ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
     );
    };
    
    export default Button;

    