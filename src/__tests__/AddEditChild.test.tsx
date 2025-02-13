import React from 'react'; // Agregar importación de React
import { render, screen } from '@testing-library/react';
import AddEditChild from '../components/dashboard/AddEditChild';
import { Child } from '../types/familyTypes';
import { describe, it, expect } from 'vitest'; // Importar describe, it y expect de Vitest
import '@testing-library/jest-dom'; // Importar jest-dom para los matchers

describe('AddEditChild Component', () => {
  const mockOnSave = async (child: Child) => {
    console.log("Child saved:", child); // Usar el parámetro child
  };
  const mockOnCancel = () => {};
  const familyId = 'test-family-id';

  it('renders AddEditChild component for adding a new child', () => {
    render(<AddEditChild familyId={familyId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    console.log(screen.debug()); // Verificar el contenido renderizado
    expect(screen.getByText(/vamos a añadir a tu hijo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edad/i)).toBeInTheDocument();
  });

  it('renders AddEditChild component for editing an existing child', () => {
    const childToEdit: Child = {
      id: '1',
      nombre: 'Juan',
      edad: 12,
      tiposAdolescente: ['tipo1'],
      rewardLink: '/family/juan/1', // Cambiado a enlace relativo
    };

    render(<AddEditChild childToEdit={childToEdit} familyId={familyId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    console.log(screen.debug()); // Verificar el contenido renderizado
    expect(screen.getByDisplayValue(/juan/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/12/i)).toBeInTheDocument();
  });
});
