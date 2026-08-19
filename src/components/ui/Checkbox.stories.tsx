import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Checkbox from "./Checkbox";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "La casilla de verificacion. Va aparte de `Field` a proposito: la etiqueta va DESPUES del control, el " +
          "estado se lleva en `checked` y no en `value`, y no quiere la caja con borde y ancho completo.",
      },
    },
  },
  args: { label: "Tarea activa", name: "isActive", onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basico: Story = {};

/**
 * Con texto de apoyo. La descripcion se enlaza con `aria-describedby`, asi que
 * se anuncia junto a la casilla y no queda como decoracion para los que ven.
 */
export const ConDescripcion: Story = {
  args: {
    description: "Si la desmarcas, tus hijos dejan de ver esta tarea",
  },
};

export const Marcada: Story = {
  args: { defaultChecked: true },
};

export const Deshabilitada: Story = {
  args: { disabled: true, defaultChecked: true },
};

/**
 * PULSAR EL TEXTO TAMBIEN LA MARCA.
 *
 * Esto es la mitad del valor de un checkbox bien hecho y no se ve en una
 * captura: la zona pulsable es la etiqueta entera, no el cuadrado de 16 px.
 * En movil es la diferencia entre acertar y fallar.
 *
 * Mira el panel Interactions: el clic va sobre el TEXTO, y la casilla se
 * marca. Eso pasa porque el `htmlFor` del label apunta al id del control.
 */
export const PulsarElTextoTambienFunciona: Story = {
  args: { description: "Prueba a pulsar sobre esta frase, no sobre el cuadrado" },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const casilla = canvas.getByRole("checkbox") as HTMLInputElement;

    // Se apunta como estaba en vez de suponer que empieza sin marcar: al pulsar
    // RUNS, Storybook reejecuta el guion SIN volver a montar el componente.
    const antes = casilla.checked;

    await step("Se pulsa el TEXTO de la etiqueta, no el cuadrado", async () => {
      await userEvent.click(canvas.getByText("Tarea activa"));
    });

    await step("La casilla ha cambiado de estado", async () => {
      await expect(casilla.checked).toBe(!antes);
    });
  },
};

/**
 * Dos casillas con el mismo `name` en la misma pantalla.
 *
 * En el repo habia dos `id="isActive"` escritos a mano en ficheros distintos.
 * Si coincidian en pantalla, el segundo label apuntaba al PRIMER control y
 * pulsarlo marcaba la casilla equivocada. Aqui el id sale de `useId`.
 */
export const DosCasillasNoChocan: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Checkbox {...args} label="Activa en tareas" />
      <Checkbox {...args} label="Activa en privilegios" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const [primera, segunda] = canvas.getAllByRole("checkbox");

    await step("Los dos controles tienen ids distintos", async () => {
      await expect(primera.id).not.toBe(segunda.id);
    });

    await step("Pulsar el texto de la SEGUNDA solo mueve la segunda", async () => {
      const primeraAntes = (primera as HTMLInputElement).checked;
      const segundaAntes = (segunda as HTMLInputElement).checked;

      await userEvent.click(canvas.getByText("Activa en privilegios"));

      await expect((segunda as HTMLInputElement).checked).toBe(!segundaAntes);
      await expect((primera as HTMLInputElement).checked).toBe(primeraAntes);
    });
  },
};
