import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import ThemeToggle from "./ThemeToggle";

const meta = {
  title: "UI/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "El interruptor de dia y noche. Es quien pone la clase `dark` en `<html>`, que es donde viven los tokens. " +
          "El proyecto llevaba `darkMode: 'class'` configurado y 521 clases `dark:` que no se pintaban nunca, " +
          "porque nadie ponia esa clase en ningun sitio.",
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * El icono dice EN QUE MODO ESTAS, no a cual vas.
 *
 * De dia un sol, de noche una luna. La otra convencion, ensenar el destino,
 * obliga a pensarlo un segundo: ves una luna y tienes que deducir "entonces
 * ahora es de dia". Un conmutador no se piensa, se mira.
 *
 * Pulsalo y mira como cambia el fondo de TODA la pagina: no hay ni una clase
 * `dark:` de por medio, solo variables CSS que valen otra cosa bajo `.dark`.
 */
export const Interruptor: Story = {};

/**
 * Lo que hace al pulsarlo, paso a paso.
 *
 * Fijate en `aria-pressed`: para un lector de pantalla esto no es "hacer algo",
 * es "activar o desactivar algo". Sin ese atributo se anuncia solo "boton", y
 * quien no ve la pantalla no sabe si el modo oscuro esta puesto o no.
 */
export const CambiaElTemaDeTodaLaPagina: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const boton = canvas.getByRole("button");

    // Se apunta el estado previo en vez de suponerlo: al pulsar RUNS el guion
    // se reejecuta SIN volver a montar, y la clase sigue puesta de la vez
    // anterior.
    const empezabaOscuro = document.documentElement.classList.contains("dark");

    await step("Dice su estado con aria-pressed, no solo con el icono", async () => {
      await expect(boton).toHaveAttribute("aria-pressed", String(empezabaOscuro));
    });

    await step("Al pulsarlo cambia la clase de <html>", async () => {
      await userEvent.click(boton);
      await expect(document.documentElement.classList.contains("dark")).toBe(!empezabaOscuro);
    });

    await step("Y lo vuelve a anunciar", async () => {
      await expect(boton).toHaveAttribute("aria-pressed", String(!empezabaOscuro));
    });

    await step("Se deja como estaba, para no ensuciar las demas stories", async () => {
      await userEvent.click(boton);
      await expect(document.documentElement.classList.contains("dark")).toBe(empezabaOscuro);
    });
  },
};
