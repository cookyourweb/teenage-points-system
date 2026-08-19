import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Button from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "El boton del sistema. Tiene una API tipada con seis variantes, tres tamanos y estado de carga. " +
          "Hoy esa API no la usa nadie: en el codigo hay catorce llamadas que le pasan el color por className.",
      },
    },
  },
  args: { onClick: fn(), children: "Guardar" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Las seis variantes juntas. Vistas asi se nota que son seis colores sin jerarquia:
 *  nada dice cual es la accion principal de una pantalla. */
export const Variantes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args} variant="primary">Primary</Button>
      <Button {...args} variant="secondary">Secondary</Button>
      <Button {...args} variant="success">Success</Button>
      <Button {...args} variant="danger">Danger</Button>
      <Button {...args} variant="warning">Warning</Button>
      <Button {...args} variant="info">Info</Button>
    </div>
  ),
};

export const Tamanos: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">Pequeno</Button>
      <Button {...args} size="md">Mediano</Button>
      <Button {...args} size="lg">Grande</Button>
    </div>
  ),
};

export const Estados: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args}>Normal</Button>
      <Button {...args} disabled>Deshabilitado</Button>
      <Button {...args} loading>Cargando</Button>
    </div>
  ),
};

/** El caso que nadie escribe y el que encuentra los fallos.
 *  Con "Guardar" todo se ve bien; con el texto de una tarea real, no. */
export const TextoLargo: Story = {
  args: {
    children: "Recoger la habitacion y sacar la basura antes de cenar",
  },
};

/**
 * ESTO ES UN FALLO, no una variante.
 *
 * `Button.tsx:47` concatena `className` al final sin `tailwind-merge`, asi que
 * las dos clases de fondo conviven en el atributo y decide el orden del CSS
 * generado, que Tailwind emite alfabeticamente por familia de color.
 *
 * `gray` y `purple` van despues de `blue` en el alfabeto, asi que ganan.
 * Funcionan por casualidad. Con `bg-warning-500` saldria azul.
 *
 * Y hay dano real: el boton gris conserva el `text-white` y el
 * `hover:bg-primary-600` de la variante. Texto blanco sobre gris 300 da 1,47:1
 * de contraste, cuando WCAG AA pide 4,5:1. Y al pasar el raton se vuelve azul.
 *
 * Abre la pestana Accessibility con esta story seleccionada para verlo.
 */
export const FalloDeOverride: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button {...args} className="bg-neutral-300">Cancelar</Button>
        <Button {...args} className="bg-accent-500">Funciona por alfabeto</Button>
        <Button {...args} className="bg-warning-500">Deberia ser ambar</Button>
      </div>
      <p className="max-w-md text-sm text-neutral-700">
        El tercero sale azul: <code>amber</code> va antes que <code>blue</code>{" "}
        en el alfabeto, asi que pierde. Los otros dos ganan por casualidad.
      </p>
    </div>
  ),
};
