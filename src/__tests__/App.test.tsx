import React from 'react'; // Agregar importación de React
import { render, screen } from '@testing-library/react';
import App from '../App';
import { describe, it, expect } from 'vitest'; // Importar describe, it y expect de Vitest
import '@testing-library/jest-dom'; // Importar jest-dom para los matchers

describe('App Component', () => {
  it('renderiza correctamente el componente en estado de carga', () => {
    render(<App />);
    console.log(screen.debug()); // Verificar el contenido renderizado
    expect(screen.getByText(/cargando/i)).toBeInTheDocument(); // Verificar que el texto "Cargando..." esté presente
  });
});
