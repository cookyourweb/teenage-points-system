
//Input.tsx

import React from "react";

type InputProps = {
  label?: string; // Optional label for the input field
  type?: string; // Input type, defaults to "text"
  value: string | number; // Value of the input
  placeholder?: string; // Placeholder text
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; // Change event handler
  className?: string; // Additional classes for styling
  errorMessage?: string; // Optional error message
  required?: boolean; // Required field indicator
  disabled?: boolean; // Disabled field indicator
  name?: string; // Name of the field, necessary for identification
};

const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  value,
  placeholder,
  onChange,
  className = "",
  errorMessage,
  required = false,
  disabled = false,
  name,
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {/* Input field */}
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors ${
          errorMessage
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600 focus:ring-primary-500"
        } ${
          disabled 
            ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
            : "bg-white dark:bg-gray-800"
        } text-gray-900 dark:text-gray-100`}
      />
      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default Input;