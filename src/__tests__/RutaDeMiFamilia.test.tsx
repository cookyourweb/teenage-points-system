import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import RutaDeMiFamilia from '../components/RutaDeMiFamilia';

/**
 * La guarda de PERTENENCIA.
 *
 * Es una pregunta distinta de la del rol, y por eso es otro componente:
 *
 *   RutaSoloAdmin   pregunta "¿QUIEN ERES?"      -> se resuelve con el rol
 *   RutaDeMiFamilia pregunta "¿ESTO ES TUYO?"    -> se resuelve comparando
 *
 * El agujero que cierra: `/reward-tracker/:familyId/:childId` cogia el
 * `familyId` de la URL y NO comprobaba que fuera el tuyo. Cualquiera con
 * cuenta que cambiara el identificador entraba en el seguimiento de puntos de
 * OTRA familia. Y no solo a mirar: podia marcar tareas y canjear privilegios.
 *
 * AVISO QUE NO HAY QUE PERDER: esto es COMODIDAD, NO SEGURIDAD. Vive en el
 * navegador y quien quiera se lo salta. Lo que impide de verdad leer los datos
 * de otra familia son las reglas de Firestore, que estan en
 * `firestore.rules`. Esta guarda evita llegar por accidente y da un mensaje
 * decente en vez de una pantalla rota.
 */

const mockFamilia = vi.fn();
vi.mock('../hooks/useMiFamilia', () => ({
  useMiFamilia: () => mockFamilia(),
}));

const montar = (miFamilia: string | null, familiaDeLaUrl: string, cargando = false) => {
  mockFamilia.mockReturnValue({ familyId: miFamilia, isLoading: cargando });

  render(
    <MemoryRouter initialEntries={[`/reward-tracker/${familiaDeLaUrl}/hijo1`]}>
      <Routes>
        <Route path="/dashboard" element={<p>Panel</p>} />
        <Route
          path="/reward-tracker/:familyId/:childId"
          element={
            <RutaDeMiFamilia uid="u1">
              <p>Puntos de la familia</p>
            </RutaDeMiFamilia>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('RutaDeMiFamilia deja pasar solo a los datos propios', () => {
  it('si la familia de la URL es la tuya, entras', () => {
    montar('familia-A', 'familia-A');

    expect(screen.getByText('Puntos de la familia')).toBeInTheDocument();
  });

  it('SI ES OTRA FAMILIA, no entras', () => {
    // El agujero: antes con esto se veian y se editaban los puntos ajenos.
    montar('familia-A', 'familia-B');

    expect(screen.queryByText('Puntos de la familia')).not.toBeInTheDocument();
  });

  it('y se explica por que, en vez de echar en silencio', () => {
    // Una redireccion muda parece que la aplicacion esta rota. Se dice lo que
    // pasa, sin dar pistas sobre si esa otra familia existe o no.
    montar('familia-A', 'familia-B');

    expect(screen.getByRole('alert')).toHaveTextContent(/no.*acceso|no pertenece/i);
  });

  it('sin familia asignada tampoco entras', () => {
    // Denegar por defecto: un usuario a medio configurar no ve datos ajenos.
    montar(null, 'familia-A');

    expect(screen.queryByText('Puntos de la familia')).not.toBeInTheDocument();
  });

  it('sin sesion tampoco', () => {
    mockFamilia.mockReturnValue({ familyId: null, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/reward-tracker/familia-A/hijo1']}>
        <Routes>
          <Route path="/" element={<p>Portada</p>} />
          <Route
            path="/reward-tracker/:familyId/:childId"
            element={
              <RutaDeMiFamilia uid={undefined}>
                <p>Puntos de la familia</p>
              </RutaDeMiFamilia>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Puntos de la familia')).not.toBeInTheDocument();
  });
});

describe('RutaDeMiFamilia no decide antes de tiempo', () => {
  it('mientras carga la familia no echa a nadie', () => {
    // Sin esto, alguien legitimo saldria rebotado en el instante entre que se
    // pinta la pagina y llega su familyId de Firestore.
    montar(null, 'familia-A', true);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
