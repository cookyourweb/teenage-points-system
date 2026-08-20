import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import Accordion from '../components/ui/Accordion';

/**
 * El acordeon: una lista de cosas que se abren y se cierran.
 *
 * Es el patron `disclosure` de WAI-ARIA, no el de `tabs`. La diferencia
 * importa y decide cual usar:
 *
 *   - TABS: se ve UNO de los paneles. Sirve para elegir seccion.
 *   - ACORDEON: se pueden abrir VARIOS a la vez. Sirve para comparar.
 *
 * En unas FAQs se quiere lo segundo: abrir dos preguntas y mirarlas juntas.
 *
 * Lo que no se ve y es lo que mas se usa: cada titulo va DENTRO de un
 * encabezado. En una pagina de preguntas frecuentes, quien usa lector de
 * pantalla navega saltando por encabezados, no tabulando. Sin eso hay que
 * recorrer las preguntas una a una.
 */

const ELEMENTOS = [
  { id: 'a', titulo: '¿Qué es la impulsividad?', contenido: <p>Actuar sin pensar</p> },
  { id: 'b', titulo: '¿Cómo la trato?', contenido: <p>Con paciencia</p> },
];

describe('Accordion abre y cierra', () => {
  it('empieza todo cerrado', () => {
    render(<Accordion items={ELEMENTOS} />);

    expect(screen.queryByText('Actuar sin pensar')).not.toBeInTheDocument();
  });

  it('al pulsar un titulo se abre su contenido', async () => {
    render(<Accordion items={ELEMENTOS} />);

    await userEvent.click(screen.getByRole('button', { name: /impulsividad/i }));

    expect(screen.getByText('Actuar sin pensar')).toBeInTheDocument();
  });

  it('al volver a pulsarlo se cierra', async () => {
    render(<Accordion items={ELEMENTOS} />);
    const titulo = screen.getByRole('button', { name: /impulsividad/i });

    await userEvent.click(titulo);
    await userEvent.click(titulo);

    expect(screen.queryByText('Actuar sin pensar')).not.toBeInTheDocument();
  });

  it('se pueden abrir VARIAS a la vez, que es la gracia', async () => {
    // Si al abrir una se cerrara la otra, esto seria un tabs disfrazado y no
    // se podrian comparar dos respuestas.
    render(<Accordion items={ELEMENTOS} />);

    await userEvent.click(screen.getByRole('button', { name: /impulsividad/i }));
    await userEvent.click(screen.getByRole('button', { name: /Cómo la trato/i }));

    expect(screen.getByText('Actuar sin pensar')).toBeInTheDocument();
    expect(screen.getByText('Con paciencia')).toBeInTheDocument();
  });
});

describe('Accordion se anuncia bien', () => {
  it('cada titulo dice si esta abierto o cerrado', () => {
    render(<Accordion items={ELEMENTOS} />);

    expect(screen.getByRole('button', { name: /impulsividad/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('al abrirlo lo dice', async () => {
    render(<Accordion items={ELEMENTOS} />);
    const titulo = screen.getByRole('button', { name: /impulsividad/i });

    await userEvent.click(titulo);

    expect(titulo).toHaveAttribute('aria-expanded', 'true');
  });

  it('el titulo apunta al panel que abre', async () => {
    render(<Accordion items={ELEMENTOS} />);
    const titulo = screen.getByRole('button', { name: /impulsividad/i });

    await userEvent.click(titulo);

    const idPanel = titulo.getAttribute('aria-controls');
    expect(idPanel).toBeTruthy();
    expect(document.getElementById(idPanel!)).toContainElement(
      screen.getByText('Actuar sin pensar'),
    );
  });

  it('los titulos son ENCABEZADOS, para poder navegar saltando', () => {
    // Es lo que mas se usa en unas FAQs con lector de pantalla, y lo que casi
    // nadie implementa.
    render(<Accordion items={ELEMENTOS} />);

    expect(screen.getAllByRole('heading')).toHaveLength(2);
  });

  it('el nivel de encabezado se puede ajustar al de la pagina', () => {
    // Un encabezado suelto en el nivel equivocado rompe el esquema del
    // documento. Quien lo coloca sabe en que nivel va.
    render(<Accordion items={ELEMENTOS} headingLevel={4} />);

    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2);
  });
});

describe('Accordion no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Accordion.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  it('no menciona ninguna familia de la paleta cruda', () => {
    expect(
      fuente.match(
        /\b(bg|text|border|ring|from|to|via)-(primary|neutral|success|danger|warning|accent)-\d{2,3}/g,
      ),
    ).toBeNull();
  });

  it('no lleva ni una clase dark:', () => {
    expect(fuente).not.toMatch(/dark:/);
  });
});
