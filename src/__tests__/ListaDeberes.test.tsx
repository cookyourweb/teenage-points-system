import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ListaDeberes from '../components/deberes/ListaDeberes';
import * as svc from '../services/deberesService';
import type { Deber } from '../types/deberTypes';

vi.mock('../services/deberesService');
vi.mock('../firebase', () => ({ auth: {}, db: {} }));

const base = (id: string, extra: Partial<Deber>): Deber => ({
  id,
  familyId: 'fA',
  hijoId: 'leo',
  tipo: 'ENTREGA',
  asignatura: 'Lengua',
  titulo: `Titulo ${id}`,
  enlace: `https://classroom.google.com/c/EJEMPLO/a/${id}/details`,
  clave: `clave-${id}`,
  imprimir: false,
  isActive: true,
  ...extra,
});

const EXAMEN = base('e1', { tipo: 'EXAMEN', fecha: '2027-03-12', titulo: 'Examen de fracciones', asignatura: 'Mates' });
const ENTREGA = base('d1', { fecha: '2027-03-10', titulo: 'Ficha de verbos', estado: 'PENDIENTE' });
const AVISO = base('a1', { tipo: 'AVISO', titulo: 'Traer calculadora' });
const MATERIAL = base('m1', { tipo: 'MATERIAL', titulo: 'Apuntes de fracciones', examen: EXAMEN.enlace });
const AHORA = new Date('2027-03-09T20:00:00Z');

const render_ = () =>
  render(<ListaDeberes familyId="fA" hijoId="leo" ahora={AHORA} onImportar={vi.fn()} />);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(svc.getDeberes).mockResolvedValue([EXAMEN, ENTREGA, AVISO, MATERIAL]);
  vi.mocked(svc.getUltimaImportacion).mockResolvedValue('2027-03-08T08:00:00Z');
  vi.mocked(svc.actualizarDeber).mockResolvedValue(ENTREGA);
});

/** El titulo tambien va, solo para lectores de pantalla, dentro de los botones: se busca el <p>. */
const titulo_ = (t: string) => screen.findByText(t, { selector: 'p' });

const fila = async (titulo: string) => {
  const li = (await titulo_(titulo)).closest('li');
  if (!li) throw new Error(`sin fila para ${titulo}`);
  return within(li);
};

describe('ListaDeberes', () => {
  it('muestraUltimaImportacionYAvisa', async () => {
    render_();
    expect(await screen.findByText('Última importación: 8 de marzo de 2027')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hace más de un día que no importas. Los profesores publican a diario.',
    );
    expect(svc.getDeberes).toHaveBeenCalledWith('fA', 'leo', true);
  });

  it('sin importaciones previas lo dice', async () => {
    vi.mocked(svc.getUltimaImportacion).mockResolvedValue(undefined);
    render_();
    expect(await screen.findByText('Todavía no has importado deberes')).toBeInTheDocument();
  });

  it('una importacion reciente no avisa (guarda)', async () => {
    vi.mocked(svc.getUltimaImportacion).mockResolvedValue('2027-03-09T10:00:00Z');
    render_();
    await screen.findByText(/Última importación/);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('el material cuelga del examen y no tiene fila propia', async () => {
    render_();
    const examen = await fila('Examen de fracciones');
    expect(examen.getByText('Apuntes de fracciones', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('Apuntes de fracciones', { selector: 'p' })).toHaveLength(1);
  });

  it('el material huerfano sale en su grupo', async () => {
    vi.mocked(svc.getDeberes).mockResolvedValue([{ ...MATERIAL, examen: 'https://classroom.google.com/c/EJEMPLO/a/zz/details' }]);
    render_();
    expect(await titulo_('Apuntes de fracciones')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Material sin examen en la lista' })).toBeInTheDocument();
  });

  it('confirmarArchiva: Confirmar hecho archiva la entrega y la fila desaparece', async () => {
    const user = userEvent.setup();
    render_();
    const f = await fila('Ficha de verbos');
    await user.click(f.getByRole('button', { name: /Confirmar hecho/ }));
    expect(svc.actualizarDeber).toHaveBeenCalledWith(
      'fA',
      'leo',
      'd1',
      expect.objectContaining({ tipo: 'ENTREGA', titulo: 'Ficha de verbos', isActive: false }),
    );
    await waitFor(() => expect(screen.queryByText('Ficha de verbos', { selector: 'p' })).toBeNull());
    expect(screen.queryByText(/\+5|puntos/i)).toBeNull();
  });

  it('Confirmar hecho solo en examen y entrega, no en aviso ni material', async () => {
    render_();
    expect((await fila('Examen de fracciones')).getAllByRole('button', { name: /Confirmar hecho/ })).toHaveLength(1);
    expect((await fila('Traer calculadora')).queryByRole('button', { name: /Confirmar hecho/ })).toBeNull();
    const material = within((await titulo_('Apuntes de fracciones')).closest('li')!);
    expect(material.queryByRole('button', { name: /Confirmar hecho/ })).toBeNull();
  });

  it('todoSePuedeArchivar y pulsarlo en el aviso lo archiva', async () => {
    const user = userEvent.setup();
    render_();
    for (const t of ['Examen de fracciones', 'Ficha de verbos', 'Traer calculadora', 'Apuntes de fracciones']) {
      const li = within((await titulo_(t)).closest('li')!);
      expect(li.getAllByRole('button', { name: new RegExp(`^Archivar ${t}`) })).toHaveLength(1);
    }
    await user.click(screen.getByRole('button', { name: 'Archivar Traer calculadora' }));
    expect(svc.actualizarDeber).toHaveBeenCalledWith('fA', 'leo', 'a1', expect.objectContaining({ isActive: false }));
    await waitFor(() => expect(screen.queryByText('Traer calculadora', { selector: 'p' })).toBeNull());
  });

  it('si archivar falla, la fila se queda y sale un aviso fijo', async () => {
    vi.mocked(svc.actualizarDeber).mockRejectedValue(new Error('<html>502</html>'));
    const user = userEvent.setup();
    render_();
    await user.click(await screen.findByRole('button', { name: 'Archivar Traer calculadora' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido archivar. Inténtalo de nuevo.');
    expect(screen.getByText('Traer calculadora', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText(/502/)).toBeNull();
  });

  it('enlaceAbreClassroom', async () => {
    render_();
    const f = await fila('Ficha de verbos');
    const a = f.getByRole('link', { name: /Abrir en Classroom/ });
    expect(a).toHaveAttribute('href', ENTREGA.enlace);
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(a).toHaveAttribute('target', '_blank');
  });

  it('el texto con HTML se pinta como texto', async () => {
    vi.mocked(svc.getDeberes).mockResolvedValue([base('x', { titulo: '<b>negrita</b>' })]);
    render_();
    expect(await titulo_('<b>negrita</b>')).toBeInTheDocument();
  });

  it('el boton de importar llama a onImportar', async () => {
    const onImportar = vi.fn();
    const user = userEvent.setup();
    render(<ListaDeberes familyId="fA" hijoId="leo" ahora={AHORA} onImportar={onImportar} />);
    await user.click(await screen.findByRole('button', { name: /Importar deberes/ }));
    expect(onImportar).toHaveBeenCalledTimes(1);
  });

  it('accesible', async () => {
    const { container } = render_();
    await titulo_('Ficha de verbos');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ListaDeberes al cambiar de hijo', () => {
  it('cambiarDeHijoNuncaMuestraLosDeberesDelOtro', async () => {
    const DE_MIA = base('x1', { hijoId: 'mia', titulo: 'Deber de Mía', fecha: '2027-03-11' });
    let resolverMia: (l: Deber[]) => void = () => {};
    vi.mocked(svc.getDeberes).mockImplementation((_f, hijo) =>
      hijo === 'leo'
        ? Promise.resolve([ENTREGA])
        : new Promise<Deber[]>((r) => {
            resolverMia = r;
          }),
    );
    const { rerender } = render(<ListaDeberes familyId="fA" hijoId="leo" ahora={AHORA} onImportar={vi.fn()} />);
    expect(await titulo_('Ficha de verbos')).toBeInTheDocument();

    rerender(<ListaDeberes familyId="fA" hijoId="mia" ahora={AHORA} onImportar={vi.fn()} />);

    expect(screen.queryByText('Ficha de verbos', { selector: 'p' })).not.toBeInTheDocument();
    resolverMia([DE_MIA]);
    expect(await titulo_('Deber de Mía')).toBeInTheDocument();
  });
});
