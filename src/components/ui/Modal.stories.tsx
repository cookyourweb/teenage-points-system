import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import Button from "./Button";
import Field from "./Field";
import Modal from "./Modal";

const meta = {
  title: "UI/Modal",
  component: Modal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "El dialogo del sistema. Era el hallazgo D1 de la auditoria, el unico CRITICO: sin `role=\"dialog\"`, sin " +
          "`aria-modal`, sin nombre, sin trampa de foco y sin devolver el foco al cerrar. Los 8 usos ya pasaban por " +
          "este fichero, asi que arreglarlo aqui arreglo los 8 sitios sin tocar una linea de las pantallas.",
      },
    },
  },
  args: { isOpen: false, onClose: () => {}, title: "Nueva tarea", children: null },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Un caso realista: un boton lo abre y dentro hay un formulario. */
const Demo = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Nueva tarea</Button>

      <Modal isOpen={abierto} onClose={() => setAbierto(false)} title="Nueva tarea">
        <div className="flex w-80 flex-col gap-4">
          <Field label="Nombre de la tarea" name="nombre" maxLength={50} />
          <Field label="Puntos" name="puntos" type="number" min={0} max={100} />

          <div className="flex gap-3">
            <Button layout="grow" onClick={() => setAbierto(false)}>
              Guardar
            </Button>
            <Button variant="neutral" layout="grow" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/**
 * Abrelo y prueba con el TECLADO, que es donde estaba todo roto:
 *
 *  - Al abrir, el foco entra solo en el primer campo. Antes se quedaba en el
 *    boton de detras y no pasaba nada visible.
 *  - Tabula hasta el final y sigue: el foco DA LA VUELTA dentro del dialogo.
 *    Antes se escapaba a la pagina de atras, que seguia entera en el orden de
 *    tabulacion aunque no se viera.
 *  - Escape lo cierra.
 *  - Y al cerrarlo, el foco VUELVE al boton que lo abrio. Sin eso te quedas al
 *    principio del documento y hay que tabular la pagina otra vez.
 */
export const Dialogo: Story = {
  render: () => <Demo />,
};

/**
 * Lo mismo, pero comprobado paso a paso.
 *
 * El titulo es una prop OBLIGATORIA: un dialogo sin nombre no se puede
 * anunciar. Antes cada pantalla ponia su propio `<h2>` suelto y ninguno estaba
 * conectado al dialogo, asi que para un lector de pantalla el dialogo no tenia
 * nombre aunque en la pantalla se leyera un titulo.
 */
export const AtrapaElFocoYLoDevuelve: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const abrir = canvas.getByRole("button", { name: "Nueva tarea" });

    await step("Se abre y es un dialogo CON NOMBRE", async () => {
      await userEvent.click(abrir);
      await expect(await canvas.findByRole("dialog", { name: "Nueva tarea" })).toBeInTheDocument();
    });

    await step("El foco entra solo, no se queda detras", async () => {
      const dialogo = canvas.getByRole("dialog");
      await expect(dialogo.contains(document.activeElement)).toBe(true);
    });

    await step("Tabulando ocho veces el foco NO se escapa", async () => {
      const dialogo = canvas.getByRole("dialog");
      for (let i = 0; i < 8; i += 1) {
        await userEvent.tab();
        await expect(dialogo.contains(document.activeElement)).toBe(true);
      }
    });

    await step("Escape lo cierra", async () => {
      await userEvent.keyboard("{Escape}");
      await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await step("Y el foco VUELVE al boton que lo abrio", async () => {
      await expect(abrir).toHaveFocus();
    });
  },
};
