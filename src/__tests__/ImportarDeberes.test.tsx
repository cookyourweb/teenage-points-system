import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ImportarDeberes from '../components/deberes/ImportarDeberes';
import * as svc from '../services/deberesService';
import type { Deber, ItemImportado } from '../types/deberTypes';
import { claveDeDeber } from '../utils/deberes/enlaces';
import { parsearDeberes } from '../utils/deberes/formato';

vi.mock('../services/deberesService');
vi.mock('../firebase', () => ({ auth: {}, db: {} }));

const RECETA = readFileSync(join(__dirname, '../../docs/receta-classroom.md'), 'utf8');
// El único bloque ```text de la receta: el ejemplo ficticio.
const EJEMPLO = /\n```text\n([\s\S]*?)\n```/.exec(RECETA)?.[1] ?? '';
const ITEMS = parsearDeberes(EJEMPLO).items;
const EXAMEN = ITEMS.find((i) => i.tipo === 'EXAMEN')!;
const ENTREGA = ITEMS.find((i) => i.tipo === 'ENTREGA')!;

const aGuardado = (i: ItemImportado, extra: Partial<Deber> = {}): Deber => ({
  id: `d${i.linea}`,
  familyId: 'fA',
  hijoId: 'leo',
  tipo: i.tipo,
  asignatura: i.asignatura,
  ...(i.fecha ? { fecha: i.fecha } : {}),
  titulo: i.titulo,
  enlace: i.enlace,
  clave: claveDeDeber(i),
  ...(i.detalle ? { detalle: i.detalle } : {}),
  ...(i.estado ? { estado: i.estado } : {}),
  imprimir: i.imprimir,
  ...(i.examen ? { examen: i.examen } : {}),
  isActive: true,
  ...extra,
});

const EXAMEN_GUARDADO = aGuardado(EXAMEN, { fecha: '2027-03-12' });
const ENLACE_AUSENTE = 'https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO8/details';
const AUSENTE: Deber = {
  id: 'dx',
  familyId: 'fA',
  hijoId: 'leo',
  tipo: 'ENTREGA',
  asignatura: 'Lengua',
  fecha: '2027-03-11',
  titulo: 'Ficha de verbos',
  enlace: ENLACE_AUSENTE,
  clave: ENLACE_AUSENTE,
  estado: 'PENDIENTE',
  imprimir: false,
  isActive: true,
};

/** Mete líneas de datos antes de la cobertura del ejemplo. */
const conLineas = (...lineas: string[]) =>
  EJEMPLO.replace('COBERTURA | Matemáticas', `${lineas.join('\n')}\nCOBERTURA | Matemáticas`);
const LINEA_JAVASCRIPT = 'ENTREGA | Lengua | 2027-03-11 | Ficha | javascript:alert(1) | | PENDIENTE | NO |';

const onGuardado = vi.fn();
const CORTADA = 'La lista llegó cortada o con errores: vuelve a sacarla de Classroom para dar el día por revisado.';

const revisar = async (user: ReturnType<typeof userEvent.setup>, texto = EJEMPLO) => {
  const vista = render(
    <ImportarDeberes familyId="fA" hijoId="leo" nombreHijo="Leo" hoy="2027-03-09" onGuardado={onGuardado} />,
  );
  await user.click(screen.getByLabelText('Pega aquí la lista de Claude in Chrome'));
  await user.paste(texto);
  await user.click(screen.getByRole('button', { name: 'Ver qué cambia' }));
  await screen.findByRole('heading', { name: 'Cobertura' });
  return vista;
};

const fila = (titulo: string) => screen.getByText(titulo).closest('li') as HTMLElement;
const decisiones = () => vi.mocked(svc.guardarImportacion).mock.calls[0][2];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(svc.getDeberes).mockResolvedValue([EXAMEN_GUARDADO]);
  vi.mocked(svc.guardarImportacion).mockResolvedValue({ guardados: 0, fallidos: [] });
});

describe('ImportarDeberes', () => {
  it('agrupaLaPegada', async () => {
    const user = userEvent.setup();
    await revisar(user);

    expect(svc.getDeberes).toHaveBeenCalledWith('fA', 'leo', false);
    expect(screen.getByRole('heading', { name: 'Nuevos (3)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cambiaron (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dudas (1)' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Fecha.*2027-03-12.*2027-03-15/ })).toBeInTheDocument();
  });

  it('descartarNoGuarda', async () => {
    const user = userEvent.setup();
    await revisar(user);

    await user.click(within(fila('Traer bata al laboratorio')).getByRole('checkbox', { name: 'Guardar «Traer bata al laboratorio»' }));
    await user.click(screen.getByRole('button', { name: 'Guardar 3 deberes' }));

    expect(svc.guardarImportacion).toHaveBeenCalledWith('fA', 'leo', expect.any(Array), { registrar: true });
    const d = decisiones();
    expect(d).toHaveLength(3);
    expect(d.some((x) => x.item.tipo === 'AVISO')).toBe(false);
    // La DUDA nunca se guarda.
    expect(d.some((x) => x.item.asignatura === 'Inglés')).toBe(false);
    // El cambio va con su guardado (PUT, no alta).
    expect(d.find((x) => x.item.tipo === 'EXAMEN')?.guardado).toEqual(EXAMEN_GUARDADO);
  });

  it('el campo de texto no se edita mientras se carga ni mientras se guarda', async () => {
    const user = userEvent.setup();
    let soltarCarga: (d: Deber[]) => void = () => {};
    vi.mocked(svc.getDeberes).mockReturnValue(new Promise((r) => (soltarCarga = r)));
    render(<ImportarDeberes familyId="fA" hijoId="leo" nombreHijo="Leo" hoy="2027-03-09" onGuardado={onGuardado} />);
    const area = screen.getByLabelText('Pega aquí la lista de Claude in Chrome');
    await user.click(area);
    await user.paste(EJEMPLO);
    await user.click(screen.getByRole('button', { name: 'Ver qué cambia' }));
    expect(area).toBeDisabled();
    soltarCarga([]);
    await screen.findByRole('heading', { name: 'Cobertura' });
    expect(area).toBeEnabled();

    let soltarGuardado: (r: { guardados: number; fallidos: never[] }) => void = () => {};
    vi.mocked(svc.guardarImportacion).mockReturnValue(new Promise((r) => (soltarGuardado = r)));
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));
    expect(area).toBeDisabled();
    soltarGuardado({ guardados: 4, fallidos: [] });
  });

  it('cada titulo y fecha lleva el deber en su nombre accesible', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([]);
    await revisar(user);
    expect(screen.getByLabelText('Título de «Redacción sobre el invierno»')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de «Redacción sobre el invierno»')).toBeInTheDocument();
    expect(screen.queryByLabelText('Título')).toBeNull();
  });

  it('editarTitulo', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([]);
    await revisar(user);

    const titulo = within(fila('Redacción sobre el invierno')).getByLabelText('Título de «Redacción sobre el invierno»');
    await user.clear(titulo);
    await user.type(titulo, 'Redacción corregida');
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(decisiones().find((x) => x.item.tipo === 'ENTREGA')?.item.titulo).toBe('Redacción corregida');
    expect(screen.queryByLabelText(/puntos/i)).toBeNull();
    expect(screen.queryByText(/puntos/i)).toBeNull();
  });

  it('tituloVacioNoSeGuarda', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([]);
    await revisar(user);

    await user.clear(within(fila('Redacción sobre el invierno')).getByLabelText('Título de «Redacción sobre el invierno»'));
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(within(fila('Redacción sobre el invierno')).getByText('Falta el título')).toBeInTheDocument();
    expect(svc.guardarImportacion).not.toHaveBeenCalled();
  });

  it('elEnlaceNoSeEdita', async () => {
    const user = userEvent.setup();
    // El enlace es la identidad del deber: cambiarlo lo duplicaría en la próxima importación.
    await revisar(user);

    expect(screen.queryByLabelText('Enlace')).toBeNull();
    expect(screen.queryByRole('textbox', { name: /enlace/i })).toBeNull();
  });

  it('fechaMalEscritaNoSeGuarda', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([]);
    await revisar(user);

    const fecha = within(fila('Redacción sobre el invierno')).getByLabelText('Fecha de «Redacción sobre el invierno»');
    await user.clear(fecha);
    await user.type(fecha, '2027-13-01');
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(within(fila('Redacción sobre el invierno')).getByText('La fecha debe ser aaaa-mm-dd')).toBeInTheDocument();
    expect(svc.guardarImportacion).not.toHaveBeenCalled();

    await user.clear(fecha);
    await user.type(fecha, '2027-03-11');
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));
    expect(decisiones().find((x) => x.item.tipo === 'ENTREGA')?.item.fecha).toBe('2027-03-11');
  });

  it('cadaCasillaNombraSuDeber', async () => {
    const user = userEvent.setup();
    await revisar(user);

    expect(screen.getByRole('checkbox', { name: 'Guardar «Redacción sobre el invierno»' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Guardar' })).toBeNull();
  });

  it('listaLimpiaRegistraLaImportacion', async () => {
    const user = userEvent.setup();
    await revisar(user);
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(svc.guardarImportacion).toHaveBeenCalledWith('fA', 'leo', expect.any(Array), { registrar: true });
  });

  it('listaConErroresNoRegistraLaImportacion', async () => {
    const user = userEvent.setup();
    await revisar(user, conLineas(LINEA_JAVASCRIPT));

    expect(screen.getByText(CORTADA)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(svc.guardarImportacion).toHaveBeenCalledWith('fA', 'leo', expect.any(Array), { registrar: false });
    expect(await screen.findByText(CORTADA)).toBeInTheDocument();
  });

  it('listaCortadaNoRegistraLaImportacion', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue(ITEMS.map((i) => aGuardado(i)));
    await revisar(user, EJEMPLO.replace('=== FIN ===', ''));

    expect(screen.getByText(CORTADA)).toBeInTheDocument();
    const revisado = screen.getByRole('button', { name: 'Revisado, sin cambios' });
    expect(revisado).toBeDisabled();
    await user.click(revisado);
    expect(svc.guardarImportacion).not.toHaveBeenCalled();
  });

  it('nadaMarcadoEsRevisadoSinCambios', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([]);
    await revisar(user);
    for (const c of screen.getAllByRole('checkbox', { name: /^Guardar «/ })) await user.click(c);

    expect(screen.queryByRole('button', { name: /^Guardar \d/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Revisado, sin cambios' }));
    expect(svc.guardarImportacion).toHaveBeenCalledWith('fA', 'leo', [], { registrar: true });
  });

  it('cambiarElTextoBorraLaVistaPrevia', async () => {
    const user = userEvent.setup();
    await revisar(user);

    await user.type(screen.getByLabelText('Pega aquí la lista de Claude in Chrome'), 'x');

    expect(screen.queryByRole('heading', { name: 'Cobertura' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Guardar \d/ })).toBeNull();
  });

  it('unFalloAlRecargarBorraLaVistaPrevia', async () => {
    const user = userEvent.setup();
    await revisar(user);
    vi.mocked(svc.getDeberes).mockRejectedValue(new TypeError('Failed to fetch'));

    await user.click(screen.getByRole('button', { name: 'Ver qué cambia' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cobertura' })).toBeNull();
  });

  it('noSePuedeVolverAVerMientrasGuarda', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.guardarImportacion).mockReturnValue(new Promise(() => {}));
    await revisar(user);

    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(screen.getByRole('button', { name: 'Ver qué cambia' })).toBeDisabled();
  });

  it('sinCambiosRegistraLaImportacion', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue(ITEMS.map((i) => aGuardado(i)));
    await revisar(user);

    expect(screen.getByRole('heading', { name: 'Iguales (4)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Guardar \d/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Revisado, sin cambios' }));

    expect(svc.guardarImportacion).toHaveBeenCalledWith('fA', 'leo', [], { registrar: true });
  });

  it('unArchivadoNoVuelveComoNuevo', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([aGuardado(EXAMEN, { fecha: '2027-03-12', isActive: false })]);
    await revisar(user);

    expect(screen.getByRole('heading', { name: 'Nuevos (3)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cambiaron (1)' })).toBeInTheDocument();
    expect(screen.getByText('Archivado')).toBeInTheDocument();
  });

  it('erroresYYaNoAparece', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([AUSENTE]);
    await revisar(user, conLineas(LINEA_JAVASCRIPT));

    expect(screen.getByRole('heading', { name: 'Errores (1)' })).toBeInTheDocument();
    expect(screen.getByText('El enlace no es https:// seguro')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ya no aparecen (1)' })).toBeInTheDocument();
    expect(screen.getByText('Ficha de verbos')).toBeInTheDocument();
    expect(screen.getByText('No se borra nada. Si ya no hace falta, archívalo desde la lista.')).toBeInTheDocument();
    // Solo avisa: ni botón de archivar ni de borrar, ni va entre lo que se guarda.
    expect(screen.queryByRole('button', { name: /archiv|borr/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));
    expect(decisiones().some((x) => x.guardado?.id === AUSENTE.id)).toBe(false);
  });

  it('unaLineaConErrorNoEsYaNoAparece', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([AUSENTE]);
    // La entrega guardada llega, pero rota (estado inválido): no ha desaparecido.
    await revisar(user, conLineas(`ENTREGA | Lengua | 2027-03-11 | Ficha de verbos | ${ENLACE_AUSENTE} | | XX | NO |`));

    expect(screen.getByRole('heading', { name: 'Errores (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Ya no aparecen/ })).toBeNull();
  });

  it('noPintaHtml', async () => {
    const user = userEvent.setup();
    const { container } = await revisar(
      user,
      conLineas(
        'AVISO | Ciencias | 2027-03-09 | <img src=x onerror=alert(1)> | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO10 | | | |',
        '<b>hola</b>',
      ),
    );

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    // El texto de fuera de una línea con error va aislado en <bdi>.
    expect(screen.getByText('<b>hola</b>').closest('bdi')).not.toBeNull();
  });

  it('enlacesSeguros', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([EXAMEN_GUARDADO, AUSENTE]);
    await revisar(user, conLineas(LINEA_JAVASCRIPT));

    const enlaces = screen.getAllByRole('link');
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('coberturaPorAsignatura', async () => {
    const user = userEvent.setup();
    await revisar(user);

    const tabla = screen.getByRole('table', { name: 'Cobertura' });
    expect(within(tabla).getByRole('row', { name: /Matemáticas 1 0 1 0 0/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Inglés 0 0 0 0 1/ })).toBeInTheDocument();
  });

  it('unaPegadaIlegibleNoOfreceGuardar', async () => {
    const user = userEvent.setup();
    render(<ImportarDeberes familyId="fA" hijoId="leo" nombreHijo="Leo" hoy="2027-03-09" />);
    await user.click(screen.getByLabelText('Pega aquí la lista de Claude in Chrome'));
    await user.paste('hola');
    await user.click(screen.getByRole('button', { name: 'Ver qué cambia' }));

    expect(await screen.findByText('No encuentro la línea === DEBERES v1 ===')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisado|^Guardar \d/ })).toBeNull();
  });

  it('falloAlCargarLoGuardado', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<ImportarDeberes familyId="fA" hijoId="leo" nombreHijo="Leo" hoy="2027-03-09" />);
    await user.click(screen.getByLabelText('Pega aquí la lista de Claude in Chrome'));
    await user.paste(EJEMPLO);
    await user.click(screen.getByRole('button', { name: 'Ver qué cambia' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se han podido cargar los deberes guardados. Inténtalo de nuevo.',
    );
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });

  it('resumenConFallidos', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.guardarImportacion).mockResolvedValue({
      guardados: 3,
      fallidos: [{ item: ENTREGA, motivo: 'Ese deber ya no existe.' }],
    });
    await revisar(user);
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(await screen.findByText('Guardados: 3')).toBeInTheDocument();
    const fallidos = screen.getByRole('list', { name: 'No se guardaron (1)' });
    expect(within(fallidos).getByText('Redacción sobre el invierno')).toBeInTheDocument();
    expect(within(fallidos).getByText('Ese deber ya no existe.')).toBeInTheDocument();
    expect(onGuardado).toHaveBeenCalled();
  });

  it('avisaSiNoSeRegistroLaImportacion', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.guardarImportacion).mockResolvedValue({ guardados: 4, fallidos: [], importacionSinRegistrar: true });
    await revisar(user);
    await user.click(screen.getByRole('button', { name: 'Guardar 4 deberes' }));

    expect(await screen.findByText('Guardados: 4')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Se ha guardado todo, pero no se ha podido anotar la importación: el aviso de «más de un día» seguirá hasta la próxima.',
      ),
    ).toBeInTheDocument();
  });

  it('accesible', async () => {
    const user = userEvent.setup();
    vi.mocked(svc.getDeberes).mockResolvedValue([EXAMEN_GUARDADO, AUSENTE]);
    const { container } = await revisar(user, conLineas(LINEA_JAVASCRIPT));

    expect(await axe(container)).toHaveNoViolations();
  });
});
