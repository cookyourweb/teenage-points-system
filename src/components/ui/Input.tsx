
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
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && <span className="text-danger-500"> *</span>}
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
            ? "border-danger-500 focus:ring-danger-500"
            : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
        } ${
          disabled 
            ? "bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed" 
            : "bg-white dark:bg-neutral-800"
        } text-neutral-900 dark:text-neutral-100`}
      />
      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-danger-500 mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default Input;