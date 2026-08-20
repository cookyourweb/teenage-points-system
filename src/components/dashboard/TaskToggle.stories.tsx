import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import TaskToggle from "./TaskToggle";

const meta = {
  title: "Producto/TaskToggle",
  component: TaskToggle,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "La fila de tarea que el hijo marca y desmarca. Era el hallazgo C1 de la auditoria, CRITICO: un " +
          "`<div onClick>` sin `tabIndex`, sin `role` y sin teclado. Y no es un boton secundario: **marcar tareas " +
          "es LO QUE SE HACE en la vista del hijo**. La unica accion de la pantalla, y no existia para el teclado.",
      },
    },
  },
  args: {
    nombre: "Recoger la habitacion",
    puntos: 10,
    completada: false,
    tipo: "diaria",
    onToggle: fn(),
  },
} satisfies Meta<typeof TaskToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pendiente: Story = {};

export const Completada: Story = {
  args: { completada: true },
};

/** Las extra usan el acento, que en la capa de tokens es justo el papel que
 *  tiene: lo que distingue y premia. */
export const Extra: Story = {
  args: { tipo: "extra", nombre: "Ayudar con la compra", puntos: 25 },
};

export const ExtraCompletada: Story = {
  args: { tipo: "extra", nombre: "Ayudar con la compra", puntos: 25, completada: true },
};

/** El caso que encuentra los fallos: un nombre de tarea de verdad, no "Tarea 1". */
export const NombreLargo: Story = {
  args: { nombre: "Recoger la habitacion y sacar la basura antes de cenar", puntos: 15 },
};

/**
 * AHORA EXISTE PARA EL TECLADO.
 *
 * Un `<button>` de verdad trae gratis lo que el `<div>` no tenia: entra en el
 * orden de tabulacion, responde a Intro y a la barra espaciadora, y se anuncia
 * como boton. No hay que programar nada de eso, hay que usar el elemento.
 *
 * Y `aria-pressed` es lo que hace que se anuncie el estado. Antes se
 * comunicaba con color de fondo, un icono y un tachado: las tres cosas son
 * visuales y ninguna llegaba a quien escucha la pantalla.
 */
export const SeManejaConElTeclado: Story = {
  render: (args) => {
    const [hecha, setHecha] = useState(false);
    return <TaskToggle {...args} completada={hecha} onToggle={() => setHecha((h) => !h)} />;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const boton = canvas.getByRole("button");

    // Se apunta el estado previo: al pulsar RUNS el guion se reejecuta sin
    // volver a montar el componente.
    const antes = boton.getAttribute("aria-pressed") === "true";

    await step("Se llega tabulando, no solo con el raton", async () => {
      (document.activeElement as HTMLElement | null)?.blur();
      await userEvent.tab();
      await expect(boton).toHaveFocus();
    });

    await step("El nombre accesible lleva la tarea Y sus puntos", async () => {
      await expect(boton).toHaveAccessibleName(/Recoger la habitacion/);
      await expect(boton).toHaveAccessibleName(/10 puntos/);
    });

    await step("Intro la marca", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(boton).toHaveAttribute("aria-pressed", String(!antes));
    });

    await step("La barra espaciadora la desmarca", async () => {
      await userEvent.keyboard(" ");
      await expect(boton).toHaveAttribute("aria-pressed", String(antes));
    });
  },
};
