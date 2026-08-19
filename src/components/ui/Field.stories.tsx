import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Field from "./Field";

const meta = {
  title: "UI/Field",
  component: Field,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "El campo de formulario del sistema: input, select y textarea en una sola pieza, porque los tres comparten " +
          "la misma estructura de etiqueta, control, error y ayuda. Sustituye a `ui/Input`, que era codigo muerto: " +
          "0 ficheros lo importaban y habia 41 `<input>` crudos por el repo.",
      },
    },
  },
  args: { label: "Nombre de la tarea", name: "nombre", onChange: fn() },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Lo normal.
 *
 * La etiqueta es obligatoria en el TIPO, no una recomendacion. Ese es el
 * arreglo de fondo: el `Input` viejo la tenia opcional (`label?: string`) y por
 * eso ninguno de los 41 inputs crudos del repo tiene etiqueta. Nada obligaba.
 */
export const Basico: Story = {};

/**
 * Con ayuda debajo.
 *
 * El texto de ayuda se enlaza con `aria-describedby`, asi que un lector de
 * pantalla lo lee al entrar en el campo, en lugar de dejarlo como decoracion
 * que solo ven los que ven.
 */
export const ConAyuda: Story = {
  args: { hint: "Maximo 50 caracteres", maxLength: 50 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const control = canvas.getByLabelText(/Nombre de la tarea/);

    await step("La ayuda se anuncia junto al campo, no es decoracion", async () => {
      await expect(control).toHaveAccessibleDescription(/Maximo 50 caracteres/);
    });

    await step("Se escribe y el valor llega", async () => {
      // Se limpia primero: userEvent.type ACUMULA, y al reejecutar el guion sin
      // remontar el campo ya traia el texto de la vez anterior.
      await userEvent.clear(control);
      await userEvent.type(control, "Recoger la habitacion");
      await expect(control).toHaveValue("Recoger la habitacion");
    });
  },
};

/**
 * Con error.
 *
 * Tres cosas a la vez, y las tres las cablea el componente para que quien lo
 * usa no pueda olvidarse: `aria-invalid` en el control, el mensaje enlazado
 * con `aria-describedby`, y `role="alert"` para que un error que aparece al
 * validar se anuncie sin ir a buscarlo.
 *
 * El borde rojo sale de `aria-[invalid=true]`, no de una prop de color. Asi
 * el estilo sigue al estado real y no se pueden desincronizar.
 */
export const ConError: Story = {
  args: { error: "Este campo no puede estar vacio", value: "" },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const control = canvas.getByLabelText(/Nombre de la tarea/);

    await step("El control se declara invalido", async () => {
      await expect(control).toHaveAttribute("aria-invalid", "true");
    });

    await step("Y ademas dice POR QUE, no solo que esta mal", async () => {
      await expect(control).toHaveAccessibleDescription(/no puede estar vacio/);
    });

    await step("El mensaje es una alerta, para que se anuncie al aparecer", async () => {
      await expect(canvas.getByRole("alert")).toBeInTheDocument();
    });
  },
};

/** Error y ayuda juntos: se anuncian los dos, en ese orden. */
export const ConErrorYAyuda: Story = {
  args: { hint: "Maximo 50 caracteres", error: "Te has pasado de largo" },
};

/** Obligatorio. El asterisco es decorativo y va con aria-hidden: quien lo
 *  anuncia de verdad es el atributo `required` del control. */
export const Obligatorio: Story = {
  args: { required: true },
};

export const Deshabilitado: Story = {
  args: { disabled: true, value: "No se puede tocar" },
};

/**
 * Etiqueta oculta a la vista.
 *
 * Para un buscador donde la etiqueta sobra visualmente. Lo que NO se hace es
 * quitarla: se oculta con `sr-only` y sigue existiendo para el lector de
 * pantalla. Un placeholder no es una etiqueta.
 */
export const EtiquetaOculta: Story = {
  args: { label: "Buscar tareas", labelHidden: true, placeholder: "Buscar..." },
};

/** Area de texto. Misma estructura, otro control. */
export const AreaDeTexto: Story = {
  args: { as: "textarea", label: "Descripcion", name: "desc", rows: 4 },
};

/** Desplegable. Las opciones son datos, no JSX suelto. */
export const Desplegable: Story = {
  args: {
    as: "select",
    label: "Tipo de tarea",
    name: "tipo",
    options: [
      { value: "diaria", label: "Diaria" },
      { value: "semanal", label: "Semanal" },
      { value: "puntual", label: "Puntual" },
    ],
  },
};

/**
 * La razon por la que murio el componente viejo.
 *
 * `Input` definia `value` y `onChange` a mano y NO pasaba el resto de props,
 * asi que no se podia usar con `maxLength`, `min`, `max` ni `type="date"`, que
 * es justo lo que necesitaban `taskForm` y `RewardTracker`. Aqui pasan todas.
 */
export const FechaConLimites: Story = {
  args: {
    label: "Fecha de entrega",
    name: "fecha",
    type: "date",
    min: "2026-01-01",
    max: "2026-12-31",
    hint: "Solo dentro de este curso",
  },
};
