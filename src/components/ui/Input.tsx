import React from "react";

type InputProps = {
  label?: string; // Etiqueta opcional para el campo de entrada
  type?: string; // Tipo de entrada, por defecto "text"
  value: string | number;
  placeholder?: string; // Texto de marcador de posición
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; // Función para manejar cambios
  className?: string; // Clases adicionales para estilizar
  errorMessage?: string; // Mensaje de error opcional
  required?: boolean; // Indicador de campo obligatorio
  disabled?: boolean; // Indicador de campo deshabilitado
  name?: string; // Nombre del campo, necesario para identificarlo
};

const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  value,
  placeholder,
  onChange,
  className,
  errorMessage,
  required = false,
  disabled = false,
  name,
}) => {
  return (
    <div className={`w-full ${className || ""}`}>
      {/* Etiqueta */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {/* Campo de entrada */}
      <input
        name={name} // Asegúrate de pasar el nombre
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-2 border ${
          errorMessage
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        } rounded-md shadow-sm focus:outline-none focus:ring-1 ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        }`}
      />
      {/* Mensaje de error */}
      {errorMessage && (
        <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default Input;
