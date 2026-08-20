import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import RutaSoloAdmin from '../components/RutaSoloAdmin';

/**
 * La guarda de rol.
 *
 * Existe por un agujero real: `/admin/faqs` estaba protegida asi
 *
 *     element={user ? <FaqAdmin /> : <Navigate to="/" replace />}
 *
 * La condicion era `user`, o sea "has iniciado sesion". NO "eres
 * administrador". Cualquiera con cuenta que escribiera esa URL podia borrar
 * las FAQs de todo el mundo, un hijo incluido. Y el rol ya estaba calculado en
 * Dashboard, sin usarse aqui.
 *
 * AVISO que conviene no perder: esta guarda es COMODIDAD, no seguridad. Vive
 * en el navegador y quien quiera se la salta. Lo que impide de verdad que un
 * hijo borre las FAQs es que el servidor lo compruebe. Esto solo evita que
 * alguien llegue por accidente y que se le ensene una puerta que no puede
 * abrir.
 */

const mockRol = vi.fn();
vi.mock('../hooks/useUserRole', () => ({
  useUserRole: () => mockRol(),
}));

const montar = (rol: string | null, cargando = false) => {
  mockRol.mockReturnValue({ role: rol, isLoading: cargando, error: null });

  render(
    <MemoryRouter initialEntries={['/admin/faqs']}>
      <Routes>
        <Route path="/" element={<p>Portada</p>} />
        <Route
          path="/admin/faqs"
          element={
            <RutaSoloAdmin uid="u1">
              <p>Panel de administracion</p>
            </RutaSoloAdmin>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('RutaSoloAdmin deja pasar solo a quien debe', () => {
  it('un administrador entra', () => {
    montar('admin');

    expect(screen.getByText('Panel de administracion')).toBeInTheDocument();
  });

  it('un padre NO entra', () => {
    // Ser padre no es ser administrador. Antes bastaba con tener sesion.
    montar('padre');

    expect(screen.queryByText('Panel de administracion')).not.toBeInTheDocument();
    expect(screen.getByText('Portada')).toBeInTheDocument();
  });

  it('un hijo NO entra', () => {
    montar('hijo');

    expect(screen.queryByText('Panel de administracion')).not.toBeInTheDocument();
  });

  it('sin rol asignado NO entra', () => {
    // Si el documento del usuario no trae rol, se deniega. Denegar por defecto:
    // un fallo al leer el rol no puede acabar en acceso concedido.
    montar(null);

    expect(screen.queryByText('Panel de administracion')).not.toBeInTheDocument();
  });

  it('sin sesion NO entra', () => {
    mockRol.mockReturnValue({ role: null, isLoading: false, error: null });
    render(
      <MemoryRouter initialEntries={['/admin/faqs']}>
        <Routes>
          <Route path="/" element={<p>Portada</p>} />
          <Route
            path="/admin/faqs"
            element={
              <RutaSoloAdmin uid={undefined}>
                <p>Panel de administracion</p>
              </RutaSoloAdmin>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Panel de administracion')).not.toBeInTheDocument();
  });
});

describe('RutaSoloAdmin no decide antes de tiempo', () => {
  it('mientras carga el rol no echa a nadie', () => {
    // Sin esto, un administrador legitimo saldria rebotado a la portada en el
    // instante entre que carga la pagina y llega su rol de Firestore.
    montar(null, true);

    expect(screen.queryByText('Portada')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
