import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Field from '../components/ui/Field';

/**
 * El campo de formulario del sistema.
 *
 * Sustituye a `ui/Input`, que era codigo muerto: 0 ficheros lo importaban y
 * habia 41 `<input>` crudos por el repo. Murio por dos motivos concretos, y
 * los dos estan corregidos aqui:
 *
 *  1. Tenia `label?: string`, OPCIONAL. Por eso ninguno de los 41 inputs
 *     crudos tiene etiqueta: nada obligaba. Aqui es obligatorio, y el
 *     problema desaparece de raiz porque no compila sin ella.
 *  2. Definia `value` y `onChange` a mano y NO pasaba el resto de props. No se
 *     podia usar con maxLength, min, max ni type="date", que es justo lo que
 *     necesitaban taskForm y RewardTracker. Asi que nadie lo uso.
 */

describe('Field tiene siempre nombre accesible', () => {
  it('la etiqueta queda asociada al control', () => {
    // getByLabelText solo encuentra el control si la asociacion es real.
    render(<Field label="Nombre de la tarea" name="nombre" />);

    expect(screen.getByLabelText(/Nombre de la tarea/)).toBeInTheDocument();
  });

  it('labelHidden la oculta a la vista pero no al lector de pantalla', () => {
    render(<Field label="Buscar" name="q" labelHidden />);

    const etiqueta = screen.getByText('Buscar');
    expect(etiqueta).toHaveClass('sr-only');
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument();
  });

  it('marca lo obligatorio en el control, no solo con un asterisco', () => {
    render(<Field label="Nombre" name="nombre" required />);

    expect(screen.getByLabelText(/Nombre/)).toBeRequired();
  });
});

describe('Field cablea solo los avisos de error y ayuda', () => {
  it('el error se anuncia y marca el control como invalido', () => {
    // aria-invalid es lo que hace que el lector diga "invalido" al entrar.
    // aria-describedby es lo que hace que ademas lea POR QUE.
    render(<Field label="Correo" name="email" error="No es un correo valido" />);

    const control = screen.getByLabelText(/Correo/);
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription(/No es un correo valido/);
  });

  it('la ayuda tambien se anuncia', () => {
    render(<Field label="Nombre" name="nombre" hint="Maximo 50 caracteres" />);

    expect(screen.getByLabelText(/Nombre/)).toHaveAccessibleDescription(/Maximo 50 caracteres/);
  });

  it('con error y ayuda a la vez se anuncian los dos', () => {
    render(
      <Field label="Nombre" name="nombre" hint="Maximo 50 caracteres" error="Esta vacio" />,
    );

    const descripcion = screen.getByLabelText(/Nombre/).getAttribute('aria-describedby') ?? '';
    expect(descripcion.split(' ')).toHaveLength(2);
  });

  it('sin error, el control no se marca invalido', () => {
    render(<Field label="Nombre" name="nombre" />);

    expect(screen.getByLabelText(/Nombre/)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('el mensaje de error se anuncia aunque aparezca despues', () => {
    // role="alert" hace que un error que sale al validar se lea sin que el
    // usuario tenga que ir a buscarlo.
    render(<Field label="Correo" name="email" error="No es valido" />);

    expect(screen.getByRole('alert')).toHaveTextContent('No es valido');
  });
});

describe('Field sirve para los tres controles', () => {
  it('por defecto es un input', () => {
    render(<Field label="Nombre" name="nombre" />);

    expect(screen.getByLabelText(/Nombre/).tagName).toBe('INPUT');
  });

  it('as="textarea" da un area de texto', () => {
    render(<Field as="textarea" label="Descripcion" name="desc" rows={4} />);

    const control = screen.getByLabelText(/Descripcion/);
    expect(control.tagName).toBe('TEXTAREA');
    expect(control).toHaveAttribute('rows', '4');
  });

  it('as="select" pinta sus opciones', () => {
    render(
      <Field
        as="select"
        label="Tipo"
        name="tipo"
        options={[
          { value: 'diaria', label: 'Diaria' },
          { value: 'semanal', label: 'Semanal' },
        ]}
      />,
    );

    expect(screen.getByLabelText(/Tipo/).tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Semanal' })).toBeInTheDocument();
  });
});

describe('Field deja pasar las props del control, que es por lo que murio Input', () => {
  it('acepta maxLength', () => {
    render(<Field label="Nombre" name="nombre" maxLength={50} />);

    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute('maxlength', '50');
  });

  it('acepta type="date" con min y max', () => {
    render(<Field label="Fecha" name="fecha" type="date" min="2026-01-01" max="2026-12-31" />);

    const control = screen.getByLabelText(/Fecha/);
    expect(control).toHaveAttribute('type', 'date');
    expect(control).toHaveAttribute('min', '2026-01-01');
  });

  it('escribir avisa al consumidor', async () => {
    const alCambiar = vi.fn();
    render(<Field label="Nombre" name="nombre" onChange={alCambiar} />);

    await userEvent.type(screen.getByLabelText(/Nombre/), 'ab');

    expect(alCambiar).toHaveBeenCalledTimes(2);
  });
});

describe('Field tiene la puerta cerrada, igual que Button', () => {
  it('un className colado en ejecucion no llega al control', () => {
    const colado = { className: 'bg-accent-500' } as Record<string, unknown>;

    render(<Field label="Nombre" name="nombre" {...colado} />);

    expect(screen.getByLabelText(/Nombre/).className).not.toContain('bg-accent-500');
  });
});

describe('Field no conoce ni un color', () => {
  const fuente = readFileSync(join(__dirname, '..', 'components/ui/Field.tsx'), 'utf8')
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
