import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DescubrirTipo from '../components/tipo/DescubrirTipo';
import * as coach from '../services/coachService';
import { ErrorHttp } from '../services/http';

vi.mock('../services/coachService');
vi.mock('../firebase', () => ({ auth: {}, db: {} }));

const COLORES = [
  { id: 'k1', nombre: 'Rojo', descripcion: '[FICTICIO] descripción 1' },
  { id: 'k2', nombre: 'Azul', descripcion: '[FICTICIO] descripción 2' },
  { id: 'k3', nombre: 'Verde', descripcion: '[FICTICIO] descripción 3' },
  { id: 'k4', nombre: 'Amarillo', descripcion: '[FICTICIO] descripción 4' },
  { id: 'k5', nombre: 'Violeta', descripcion: '[FICTICIO] descripción 5' },
];
const AFIRMACIONES = [
  { id: 'x1', texto: '[FICTICIO] frase 1' },
  { id: 'x2', texto: '[FICTICIO] frase 2' },
];
const PERFIL = {
  colores: [
    { id: 'k1', nombre: 'Rojo', nivel: 'MUCHO' as const },
    { id: 'k2', nombre: 'Azul', nivel: 'ALGO' as const },
    { id: 'k3', nombre: 'Verde', nivel: 'NADA' as const },
    { id: 'k4', nombre: 'Amarillo', nivel: 'NADA' as const },
    { id: 'k5', nombre: 'Violeta', nivel: 'NADA' as const },
  ],
};

const pintar = () => render(<DescubrirTipo familyId="f1" hijoId="h1" nombreHijo="Leo" />);

const responderTodo = async (user: ReturnType<typeof userEvent.setup>) => {
  for (const a of AFIRMACIONES) {
    await user.selectOptions(await screen.findByLabelText(a.texto), 'A veces');
  }
};

const verPerfil = async (user: ReturnType<typeof userEvent.setup>) => {
  await responderTodo(user);
  await user.click(screen.getByRole('button', { name: 'Ver perfil' }));
  await screen.findByRole('checkbox', { name: /Rojo/ });
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(coach.getPreguntasTipo).mockResolvedValue({ colores: COLORES, afirmaciones: AFIRMACIONES });
  vi.mocked(coach.pedirPerfil).mockResolvedValue(PERFIL);
  vi.mocked(coach.getEleccionesTipo).mockResolvedValue({ elecciones: [], coinciden: true });
  vi.mocked(coach.guardarEleccionTipo).mockResolvedValue({ colores: [], elegidaEn: 'x' });
});

describe('DescubrirTipo', () => {
  it('noDejaPedirSinResponderTodo', async () => {
    const user = userEvent.setup();
    pintar();
    await user.selectOptions(await screen.findByLabelText(AFIRMACIONES[0].texto), 'Nunca');

    expect(screen.getByRole('button', { name: 'Ver perfil' })).toBeDisabled();
    expect(coach.pedirPerfil).not.toHaveBeenCalled();
  });

  it('pideElPerfilConTodasLasRespuestas', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    expect(coach.pedirPerfil).toHaveBeenCalledWith({ x1: 'A_VECES', x2: 'A_VECES' });
  });

  it('muestraLosCincoColoresConSuNivel', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getByRole('checkbox', { name: /Rojo.*Mucho/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Azul.*Algo/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Verde.*Nada/ })).toBeInTheDocument();
    expect(screen.getByText('[FICTICIO] descripción 2')).toBeInTheDocument();
  });

  it('premarcaAlgoYMucho', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    expect(screen.getByRole('checkbox', { name: /Rojo/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Azul/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Verde/ })).not.toBeChecked();
  });

  it('elAdultoPuedeCambiarLaMezcla: guarda lo marcado, no lo que dio el perfil', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    await user.click(screen.getByRole('checkbox', { name: /Rojo/ }));
    await user.click(screen.getByRole('checkbox', { name: /Verde/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    await waitFor(() =>
      expect(coach.guardarEleccionTipo).toHaveBeenCalledWith('f1', 'h1', { colores: ['k2', 'k3'], principal: null }),
    );
  });

  it('noDejaGuardarSinNingunColor', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    await user.click(screen.getByRole('checkbox', { name: /Rojo/ }));
    await user.click(screen.getByRole('checkbox', { name: /Azul/ }));

    expect(screen.getByRole('button', { name: 'Guardar mi elección' })).toBeDisabled();
  });

  it('principalSoloEntreLosMarcados', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    const principal = screen.getByLabelText(/principal/i);
    expect(within(principal).queryByRole('option', { name: 'Verde' })).not.toBeInTheDocument();
    await user.selectOptions(principal, 'Rojo');

    // Si se desmarca el principal, deja de serlo.
    await user.click(screen.getByRole('checkbox', { name: /Rojo/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    await waitFor(() =>
      expect(coach.guardarEleccionTipo).toHaveBeenCalledWith('f1', 'h1', { colores: ['k2'], principal: null }),
    );
  });

  it('guardaElPrincipalElegido', async () => {
    const user = userEvent.setup();
    pintar();
    await verPerfil(user);

    await user.selectOptions(screen.getByLabelText(/principal/i), 'Azul');
    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    await waitFor(() =>
      expect(coach.guardarEleccionTipo).toHaveBeenCalledWith('f1', 'h1', { colores: ['k1', 'k2'], principal: 'k2' }),
    );
  });

  it('muestraDiferenciasSinDecidir', async () => {
    vi.mocked(coach.getEleccionesTipo).mockResolvedValue({
      coinciden: false,
      elecciones: [
        { uid: 'secreto-uid-1', colores: ['k1'], elegidaEn: 'a', esMia: true },
        { uid: 'secreto-uid-2', colores: ['k3', 'k4'], principal: 'k3', elegidaEn: 'b', esMia: false },
      ],
    });
    pintar();

    expect(await screen.findByText('No coincidís: es un buen punto para hablarlo')).toBeInTheDocument();
    const mia = screen.getByRole('listitem', { name: 'Tu elección' });
    const otra = screen.getByRole('listitem', { name: 'Otro adulto' });
    expect(within(mia).getByText(/Rojo/)).toBeInTheDocument();
    expect(within(otra).getByText('Verde, Amarillo')).toBeInTheDocument();
    expect(within(otra).getByText('Principal: Verde')).toBeInTheDocument();
    expect(screen.queryByText(/secreto-uid/)).not.toBeInTheDocument();
    expect(screen.queryByText(/correct|la buena|ganad|acert/i)).not.toBeInTheDocument();
  });

  it('noAvisaSiCoinciden', async () => {
    vi.mocked(coach.getEleccionesTipo).mockResolvedValue({
      coinciden: true,
      elecciones: [{ uid: 'u', colores: ['k1'], elegidaEn: 'a', esMia: true }],
    });
    pintar();

    await screen.findByRole('listitem', { name: 'Tu elección' });
    expect(screen.queryByText(/No coincidís/)).not.toBeInTheDocument();
  });

  it('verPerfilQuedaDeshabilitadoMientrasHayUnaPeticionEnVuelo', async () => {
    const user = userEvent.setup();
    let resolver: () => void = () => {};
    vi.mocked(coach.guardarEleccionTipo).mockReturnValue(
      new Promise((r) => {
        resolver = () => r({ colores: [], elegidaEn: 'x' });
      }),
    );
    pintar();
    await verPerfil(user);

    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    expect(screen.getByRole('button', { name: 'Ver perfil' })).toBeDisabled();
    resolver();
    await screen.findByRole('status');
    expect(screen.getByRole('button', { name: 'Ver perfil' })).toBeEnabled();
  });

  it('errorDeRedSeMuestra', async () => {
    vi.mocked(coach.getPreguntasTipo).mockRejectedValue(new TypeError('Failed to fetch'));
    pintar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sin conexión con el servidor. Prueba de nuevo en un rato.',
    );
  });

  it('siFallanLasEleccionesElCuestionarioSigue', async () => {
    vi.mocked(coach.getEleccionesTipo).mockRejectedValue(new TypeError('Failed to fetch'));
    pintar();

    expect(await screen.findByLabelText(AFIRMACIONES[0].texto)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión con el servidor');
  });

  it('errorHttpMuestraSuMensaje', async () => {
    const user = userEvent.setup();
    vi.mocked(coach.pedirPerfil).mockRejectedValue(new ErrorHttp(400, 'Faltan respuestas'));
    pintar();
    await responderTodo(user);
    await user.click(screen.getByRole('button', { name: 'Ver perfil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan respuestas');
  });

  it('guardarConfirmaYSiFallaElRefrescoNoEsUnError', async () => {
    const user = userEvent.setup();
    vi.mocked(coach.getEleccionesTipo)
      .mockResolvedValueOnce({ elecciones: [], coinciden: true })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    pintar();
    await verPerfil(user);

    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Elección guardada');
    expect(screen.getByText(/no pudimos actualizar la lista/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('errorAlGuardarSeMuestra', async () => {
    const user = userEvent.setup();
    vi.mocked(coach.guardarEleccionTipo).mockRejectedValue(new ErrorHttp(404, 'No eres miembro'));
    pintar();
    await verPerfil(user);

    await user.click(screen.getByRole('button', { name: 'Guardar mi elección' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No eres miembro');
  });

  it('sinViolacionesDeAccesibilidad', async () => {
    const user = userEvent.setup();
    vi.mocked(coach.getEleccionesTipo).mockResolvedValue({
      coinciden: false,
      elecciones: [
        { uid: 'a', colores: ['k1'], elegidaEn: 'a', esMia: true },
        { uid: 'b', colores: ['k3'], elegidaEn: 'b', esMia: false },
      ],
    });
    const { container } = pintar();
    await verPerfil(user);

    expect(await axe(container)).toHaveNoViolations();
  });
});
