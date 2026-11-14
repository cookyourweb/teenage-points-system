import React from 'react'; // Agregar importación de React
import { render, screen } from '@testing-library/react';
import App from '../App';
import { beforeEach, describe, it, expect, vi } from 'vitest'; // Importar describe, it y expect de Vitest
import '@testing-library/jest-dom'; // Importar jest-dom para los matchers
import { useSesion } from '../auth/useSesion';

vi.mock('../auth/useSesion', () => ({ useSesion: vi.fn() }));
vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('../components/auth/AuthPage', () => ({ default: () => <div>pantalla-de-entrada</div> }));
vi.mock('../components/PaginaFaqs', () => ({ default: () => <div>pagina-faqs</div> }));

describe('App Component', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renderiza correctamente el componente en estado de carga', () => {
    vi.mocked(useSesion).mockReturnValue({ tipo: 'cargando' } as never);
    render(<App />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument(); // Verificar que el texto "Cargando..." esté presente
  });

  it('sin sesión, /faqs lleva a la pantalla de entrada y no muestra las FAQs', () => {
    vi.mocked(useSesion).mockReturnValue({ tipo: 'anonimo' } as never);
    window.history.pushState({}, '', '/faqs');
    render(<App />);
    expect(screen.getByText('pantalla-de-entrada')).toBeInTheDocument();
    expect(screen.queryByText('pagina-faqs')).not.toBeInTheDocument();
  });
});
