import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Button from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "El boton del sistema. Cuatro variantes que son INTENCIONES, no colores, tres tamanos y estado de carga. " +
          "`className` y `style` estan fuera del contrato: TypeScript los rechaza en compilacion. " +
          "Antes de cerrarlo, la foto medida del repo era que `variant` se usaba 6 veces en todo src/ y " +
          "`className` con colores 30 veces. La API existia y nadie la usaba.",
      },
    },
  },
  args: { onClick: fn(), children: "Guardar" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Las cuatro variantes. Cada una es una INTENCION, no un color.
 *
 * Antes eran seis y tres sobraban. `success`, `warning` e `info` se eliminaron
 * porque un boton no es un estado, es una accion: un boton verde de "guardar"
 * comunica lo mismo que uno azul y anade un color al sistema. `warning` ademas
 * era una trampa de contraste, amarillo con blanco da 1,92:1.
 */
export const Variantes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args} variant="primary">La accion que quieres</Button>
      <Button {...args} variant="neutral">Cancelar</Button>
      <Button {...args} variant="danger">Borrar</Button>
      <Button {...args} variant="ghost">Terciaria</Button>
    </div>
  ),
};

/**
 * Los tres tamanos. Todos cumplen 44 px de alto minimo.
 *
 * El minimo que exige WCAG 2.2 son 24 px (criterio 2.5.8, nivel AA). Los 44
 * son el 2.5.5, que es AAA, y coinciden con las guias de Apple y Google. Se
 * elige el de 44 a proposito, porque esto se usa en el movil y ahi la
 * diferencia entre 24 y 44 se nota al pulsar.
 */
export const Tamanos: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">Pequeno</Button>
      <Button {...args} size="md">Mediano</Button>
      <Button {...args} size="lg">Grande</Button>
    </div>
  ),
};

/**
 * Los estados. Cargando lleva `aria-busy`, que es lo que hace que un lector de
 * pantalla anuncie que esta ocupado; sin el, para alguien ciego el boton
 * simplemente deja de responder.
 */
export const Estados: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args}>Normal</Button>
      <Button {...args} disabled>Deshabilitado</Button>
      <Button {...args} loading>Cargando</Button>
    </div>
  ),
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const [normal, , cargando] = canvas.getAllByRole("button");

    // El espia acumula llamadas entre reejecuciones del guion, asi que se
    // pone a cero antes de contar. Si no, a la segunda vuelta hay dos.
    const alPulsar = args.onClick!;
    alPulsar.mockClear();

    await step("El normal responde", async () => {
      await userEvent.click(normal);
      await expect(alPulsar).toHaveBeenCalledOnce();
    });

    await step("El que carga se anuncia ocupado, no solo gira", async () => {
      await expect(cargando).toHaveAttribute("aria-busy", "true");
    });

    await step("Y no se puede pulsar dos veces por error", async () => {
      await userEvent.click(cargando);
      await expect(alPulsar).toHaveBeenCalledOnce();
    });
  },
};

/**
 * La disposicion es lo UNICO que puede aportar quien lo usa.
 *
 * Es una union cerrada de tres valores, y sale de mirar los className reales
 * del repo: los legitimos eran todos de esta forma. El resto eran colores, que
 * es justo lo que se cierra.
 */
export const Disposicion: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-3">
      <Button {...args} layout="full">Ancho completo</Button>
      <div className="flex gap-3">
        <Button {...args} layout="grow">Crece</Button>
        <Button {...args} variant="neutral" layout="grow">Crece</Button>
      </div>
    </div>
  ),
};

/**
 * El caso que nadie escribe y el que encuentra los fallos.
 *
 * Con "Guardar" todo se ve bien. Con el texto de una tarea real, no.
 */
export const TextoLargo: Story = {
  args: {
    children: "Recoger la habitacion y sacar la basura antes de cenar",
  },
};

/**
 * LA PUERTA CERRADA.
 *
 * Aqui habia una story llamada `FalloDeOverride` que documentaba el agujero:
 * `Button` concatenaba `className` al final, asi que dos clases de fondo
 * convivian en el atributo y decidia el orden alfabetico del CSS generado.
 * Los botones funcionaban por casualidad, y uno de ellos dejaba texto blanco
 * sobre gris claro con 1,47:1 de contraste.
 *
 * Ese agujero ya no existe. `ButtonProps` extiende
 * `Omit<ButtonHTMLAttributes, 'className' | 'style'>`, asi que esto:
 *
 *     <Button className="bg-accent-500">Guardar</Button>
 *
 * ya no compila. Y por si alguien construye las props dinamicamente o entra
 * desde JavaScript sin tipos, el componente tambien las descarta en ejecucion.
 *
 * Lo que se ve abajo es la traduccion de aquellos overrides a la API: los
 * cuatro grises distintos de "Cancelar" son un solo `variant="neutral"`.
 */
export const AntesYDespues: Story = {
  render: (args) => (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button {...args} variant="neutral">Cancelar</Button>
        <Button {...args} variant="neutral">Cerrar</Button>
        <Button {...args} variant="neutral">Volver</Button>
      </div>
      <p className="text-sm text-content-muted">
        Estos tres llevaban <code>bg-neutral-500</code>,{" "}
        <code>bg-neutral-300</code> y <code>bg-gray-500</code> escritos a mano.
        Ahora son la misma intencion, y el dia que cambie el gris de cancelar
        cambia en los tres a la vez.
      </p>
    </div>
  ),
};
