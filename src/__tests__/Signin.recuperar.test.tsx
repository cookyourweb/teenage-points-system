import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import Signin from '../components/auth/Signin';
import { pedirCambioDeContrasena } from '../services/authService';

vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }));
vi.mock('../services/authService', async (original) => ({
  ...(await original<typeof import('../services/authService')>()),
  pedirCambioDeContrasena: vi.fn(),
}));

const ENVIADO =
  'Si hay una cuenta con ese correo, te hemos enviado un enlace para cambiar la contraseña. Mira también en spam.';

const abrir = (correo?: string) => {
  render(
    <MemoryRouter>
      <Signin />
    </MemoryRouter>,
  );
  if (correo !== undefined) {
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: correo } });
  }
};
const pulsar = () => fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));

describe('Signin: ¿Olvidaste tu contraseña?', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('con el correo vacío avisa y no llama al servicio', () => {
    abrir();
    pulsar();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu correo arriba y vuelve a pulsar.');
    expect(pedirCambioDeContrasena).not.toHaveBeenCalled();
  });

  it('con un correo inválido avisa y no llama al servicio', () => {
    abrir('no-es-correo');
    pulsar();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu correo arriba y vuelve a pulsar.');
    expect(pedirCambioDeContrasena).not.toHaveBeenCalled();
  });

  it('con un correo válido llama al servicio y confirma en role=status', async () => {
    vi.mocked(pedirCambioDeContrasena).mockResolvedValue(undefined);
    abrir('  ana@correo.com ');
    pulsar();
    expect(await screen.findByRole('status')).toHaveTextContent(ENVIADO);
    expect(pedirCambioDeContrasena).toHaveBeenCalledWith('ana@correo.com');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si la cuenta no existe el servicio resuelve y se ve el MISMO mensaje', async () => {
    // El servicio ya convierte user-not-found en exito; aqui se fija que la pantalla no distingue.
    vi.mocked(pedirCambioDeContrasena).mockResolvedValue(undefined);
    abrir('nadie@correo.com');
    pulsar();
    expect(await screen.findByRole('status')).toHaveTextContent(ENVIADO);
  });

  it('too-many-requests se muestra en role=alert', async () => {
    vi.mocked(pedirCambioDeContrasena).mockRejectedValue({ code: 'auth/too-many-requests' });
    abrir('ana@correo.com');
    pulsar();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Has pedido demasiados correos. Espera unos minutos y vuelve a intentarlo.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un fallo de red muestra el aviso de conexión', async () => {
    vi.mocked(pedirCambioDeContrasena).mockRejectedValue({ code: 'auth/network-request-failed' });
    abrir('ana@correo.com');
    pulsar();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión. Revisa internet y vuelve a intentarlo.');
  });

  it('un código desconocido da el genérico y no enseña el texto crudo', async () => {
    vi.mocked(pedirCambioDeContrasena).mockRejectedValue({ code: 'auth/rarisimo', message: 'Firebase: Error interno XYZ' });
    abrir('ana@correo.com');
    pulsar();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido enviar el correo. Inténtalo de nuevo.');
    expect(screen.queryByText(/XYZ/)).not.toBeInTheDocument();
  });

  it('mientras se envía el botón está deshabilitado y no hay doble envío', async () => {
    let resolver!: () => void;
    vi.mocked(pedirCambioDeContrasena).mockReturnValue(new Promise<void>((r) => (resolver = r)));
    abrir('ana@correo.com');
    pulsar();
    const boton = screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(pedirCambioDeContrasena).toHaveBeenCalledTimes(1);
    resolver();
    await waitFor(() => expect(boton).toBeEnabled());
  });
});
