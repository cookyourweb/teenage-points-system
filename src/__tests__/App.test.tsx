import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renderiza correctamente el componente', () => {
    render(<App />);
    expect(screen.getByText(/Sistema de Puntos y privilegios para Adolescentes/i)).toBeInTheDocument();
  });
});
