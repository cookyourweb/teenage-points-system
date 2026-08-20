import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import Button from "../ui/Button";
import PrivilegeRedeemDialog from "./PrivilegeRedeemDialog";

const meta = {
  title: "Producto/PrivilegeRedeemDialog",
  component: PrivilegeRedeemDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "El dialogo de canje de privilegios. Hallazgo D2 de la auditoria, CRITICO. Habia CUATRO implementaciones " +
          "de esta misma pantalla, y dos de ellas eran byte a byte identicas. Las tres escritas a mano eran un " +
          "`<div className=\"fixed inset-0\">`: sin `role=\"dialog\"`, sin nombre, sin trampa de foco, sin Escape y " +
          "sin devolver el foco. Todo lo que ya estaba resuelto en `ui/Modal` y que se saltaban por ir por libre.",
      },
    },
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onRedeem: fn(),
    privilegeName: "Una hora extra de consola",
  },
} satisfies Meta<typeof PrivilegeRedeemDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Abierto: Story = {};

/** Con limites de calendario: de hoy a tres meses vista, que es lo que pone
 *  RewardTracker. Los pone quien sabe las reglas de la familia, no el dialogo. */
export const ConLimitesDeFecha: Story = {
  args: { minDate: "2026-08-20", maxDate: "2026-11-20" },
};

/** El caso que encuentra los fallos: un nombre de privilegio de verdad. */
export const NombreLargo: Story = {
  args: { privilegeName: "Quedarse a dormir en casa de un amigo el fin de semana" },
};

/**
 * Lo que hace, comprobado.
 *
 * Fijate en el boton de confirmar: **no existe hasta que hay una fecha
 * elegida**. Un boton que no hace nada es peor que un boton que no esta, porque
 * quien lo pulsa se cree que ha pasado algo.
 *
 * Y el dialogo entero hereda de `ui/Modal` la trampa de foco, el cierre con
 * Escape y la devolucion del foco. No lo reimplementa: se apoya.
 */
export const ElegirUnaFecha: Story = {
  render: (args) => {
    const [abierto, setAbierto] = useState(false);
    return (
      <>
        <Button onClick={() => setAbierto(true)}>Desbloquear privilegio</Button>
        <PrivilegeRedeemDialog {...args} isOpen={abierto} onClose={() => setAbierto(false)} />
      </>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Se abre y es un dialogo con el nombre del privilegio", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Desbloquear privilegio" }));
      await expect(
        await canvas.findByRole("dialog", { name: /Una hora extra de consola/ }),
      ).toBeInTheDocument();
    });

    await step("Sin fecha elegida NO hay boton de confirmar", async () => {
      await expect(canvas.queryByRole("button", { name: /Confirmar/ })).not.toBeInTheDocument();
    });

    await step("El campo de fecha tiene etiqueta, no solo un hueco", async () => {
      await expect(canvas.getByLabelText(/fecha/i)).toHaveAttribute("type", "date");
    });

    await step("Al elegir fecha aparece el boton", async () => {
      await userEvent.type(canvas.getByLabelText(/fecha/i), "2026-09-15");
      await expect(await canvas.findByRole("button", { name: /Confirmar/ })).toBeInTheDocument();
    });
  },
};
