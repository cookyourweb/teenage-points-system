import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PanelDeberes from '../components/deberes/PanelDeberes';
import * as svc from '../services/deberesService';

vi.mock('../services/deberesService');
vi.mock('../firebase', () => ({ auth: {}, db: {} }));
// ImportarDeberes tiene su propio test: aqui solo importa que el panel lo abre y recarga al guardar.
vi.mock('../components/deberes/ImportarDeberes', () => ({
  default: ({ onGuardado }: { onGuardado?: () => void }) => (
    <button onClick={onGuardado}>Simular guardado</button>
  ),
}));

const HIJOS = [
  { id: 'leo', nombre: 'Leo' },
  { id: 'mia', nombre: 'Mía' },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(svc.getDeberes).mockResolvedValue([]);
  vi.mocked(svc.getUltimaImportacion).mockResolvedValue(undefined);
});

describe('PanelDeberes', () => {
  it('eligeHijoYListaSusDeberes', async () => {
    render(<PanelDeberes familyId="fA" hijos={HIJOS} />);
    await waitFor(() => expect(svc.getDeberes).toHaveBeenCalledWith('fA', 'leo', true));

    await userEvent.selectOptions(screen.getByLabelText('Hijo'), 'mia');

    await waitFor(() => expect(svc.getDeberes).toHaveBeenCalledWith('fA', 'mia', true));
  });

  it('importarAbreElDialogoYRecargaAlGuardar', async () => {
    render(<PanelDeberes familyId="fA" hijos={HIJOS} />);
    await screen.findByText('No tienes deberes pendientes.');
    expect(svc.getDeberes).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Importar deberes' }));
    expect(screen.getByRole('dialog', { name: 'Importar deberes de Leo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Simular guardado' }));
    await waitFor(() => expect(svc.getDeberes).toHaveBeenCalledTimes(2));
  });

  it('sinHijos', () => {
    render(<PanelDeberes familyId="fA" hijos={[]} />);
    expect(screen.getByText('Añade un hijo para importar sus deberes.')).toBeInTheDocument();
    expect(svc.getDeberes).not.toHaveBeenCalled();
  });
});
