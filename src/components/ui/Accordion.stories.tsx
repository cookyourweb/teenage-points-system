import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import Accordion from "./Accordion";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "El patron `disclosure` de WAI-ARIA. NO es `tabs`, y la diferencia decide cual usar: con pestañas se ve UNO " +
          "de los paneles y sirve para elegir seccion; con acordeon se pueden abrir VARIOS a la vez y sirve para " +
          "comparar. En unas preguntas frecuentes se quiere lo segundo, asi que las categorias van en `Tabs` y las " +
          "preguntas aqui.",
      },
    },
  },
  args: {
    items: [
      {
        id: "impulsividad",
        titulo: "¿Qué es un adolescente impulsivo?",
        contenido: <p>Actúa antes de pensar en las consecuencias.</p>,
      },
      {
        id: "desmotivacion",
        titulo: "¿Cómo trato la desmotivación?",
        contenido: (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Objetivos cortos y alcanzables</li>
            <li>Reconocer el esfuerzo, no solo el resultado</li>
          </ul>
        ),
      },
      {
        id: "limites",
        titulo: "¿Cuántos límites pongo?",
        contenido: <p>Pocos, claros y sostenidos en el tiempo.</p>,
      },
    ],
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cerrado: Story = {};

/**
 * El nivel de encabezado lo elige quien lo coloca.
 *
 * No es un capricho: un encabezado en el nivel equivocado rompe el esquema del
 * documento, y quien navega saltando por encabezados se pierde. Si encima hay
 * un `h1` y un `h2`, estos van en `h3`.
 */
export const DentroDeUnaPaginaConH1YH2: Story = {
  args: { headingLevel: 4 },
};

/**
 * SE PUEDEN ABRIR VARIAS A LA VEZ.
 *
 * Es la diferencia con unas pestañas y la razon de usar este patron aqui: en
 * unas preguntas frecuentes quieres abrir dos respuestas y mirarlas juntas.
 *
 * Y fijate en el panel Interactions: los titulos son ENCABEZADOS. Es lo que
 * mas se usa con lector de pantalla en una pagina de preguntas, porque se
 * navega saltando de encabezado en encabezado en vez de tabulando por todo.
 */
export const VariasAbiertasALaVez: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Los titulos son encabezados, no solo botones", async () => {
      await expect(canvas.getAllByRole("heading")).toHaveLength(3);
    });

    await step("Cada uno dice si esta abierto o cerrado", async () => {
      const primero = canvas.getByRole("button", { name: /impulsivo/i });
      await expect(primero).toHaveAttribute("aria-expanded", "false");
    });

    await step("Se abre el primero", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /impulsivo/i }));
      await expect(canvas.getByText(/antes de pensar/i)).toBeInTheDocument();
    });

    await step("Y el segundo, sin que se cierre el primero", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /desmotivación/i }));
      await expect(canvas.getByText(/antes de pensar/i)).toBeInTheDocument();
      await expect(canvas.getByText(/Objetivos cortos/i)).toBeInTheDocument();
    });

    await step("Se dejan como estaban, para no ensuciar las demas stories", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /impulsivo/i }));
      await userEvent.click(canvas.getByRole("button", { name: /desmotivación/i }));
    });
  },
};
