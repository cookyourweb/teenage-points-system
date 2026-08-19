import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import Tabs from "./Tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Navegacion por pestanas, patron Tabs de WAI-ARIA APG. Sustituye a cuatro `<button>` sueltos que no tenian " +
          "ni un `role`, ni `aria-selected`, ni navegacion por flechas: el estado activo se comunicaba solo con color, " +
          "asi que para un lector de pantalla no existia. Son los hallazgos C9 y F7 de la auditoria de accesibilidad.",
      },
    },
  },
  // Tabs tiene props obligatorias y cada story lleva su propio estado, asi que
  // las de aqui son solo el minimo que exige el tipo. Las stories las pisan.
  args: {
    label: "Secciones del panel",
    tabs: [],
    active: "general",
    onChange: () => {},
    children: null,
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const PESTANAS = [
  { id: "general", label: "Vista General" },
  { id: "hijos", label: "Gestion de Hijos" },
  { id: "tareas", label: "Tareas" },
  { id: "privilegios", label: "Privilegios" },
];

/**
 * Pruebalo con el teclado, que es donde se nota la diferencia:
 *
 *  - Tab entra en la barra y sale de ella con UNA sola pulsacion, porque solo
 *    la pestana activa es tabulable. Es el tabindex movil.
 *  - Las flechas se mueven entre pestanas y dan la vuelta por el borde.
 *  - Inicio y Fin van a la primera y a la ultima.
 */
export const Navegacion: Story = {
  render: () => {
    const [activa, setActiva] = useState("general");
    return (
      <Tabs label="Secciones del panel" tabs={PESTANAS} active={activa} onChange={setActiva}>
        <p className="py-6 text-content">Contenido de la seccion: {activa}</p>
      </Tabs>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // NADA de dar por hecho en que pestana empieza. Al pulsar RUNS, Storybook
    // vuelve a ejecutar el guion SIN volver a montar el componente, asi que el
    // estado se queda donde lo dejo la vez anterior. Un test que solo pasa la
    // primera vez esta roto.
    const pestanas = () => canvas.getAllByRole("tab");
    const activa = () => pestanas().find((t) => t.getAttribute("aria-selected") === "true")!;
    const nombre = (t: HTMLElement) => t.textContent?.trim();

    await step("Solo la activa es tabulable, las demas no", async () => {
      for (const t of pestanas()) {
        const esperado = t === activa() ? "0" : "-1";
        await expect(t).toHaveAttribute("tabindex", esperado);
      }
    });

    await step("Un solo Tab entra en la barra, y cae en la activa", async () => {
      (document.activeElement as HTMLElement | null)?.blur();
      await userEvent.tab();
      await expect(activa()).toHaveFocus();
    });

    await step("La flecha derecha pasa a la SIGUIENTE, sea cual sea", async () => {
      const antes = pestanas();
      const i = antes.indexOf(activa());
      const siguiente = nombre(antes[(i + 1) % antes.length]);

      await userEvent.keyboard("{ArrowRight}");

      await expect(nombre(activa())).toBe(siguiente);
    });

    await step("Inicio va a la primera y Fin a la ultima", async () => {
      await userEvent.keyboard("{End}");
      await expect(nombre(activa())).toBe(nombre(pestanas().at(-1)!));

      await userEvent.keyboard("{Home}");
      await expect(nombre(activa())).toBe(nombre(pestanas()[0]));
    });

    await step("El panel se anuncia con el nombre de su pestana", async () => {
      await expect(canvas.getByRole("tabpanel", { name: nombre(activa())! })).toBeInTheDocument();
    });
  },
};

/**
 * Una pestana bloqueada.
 *
 * Dos cosas que no se ven en la captura y son las que importan: las flechas se
 * la SALTAN, en vez de atascarse, y `disabledReason` va al nombre accesible,
 * asi que se anuncia "Tareas, solo disponible para padres" en lugar de dejar
 * el motivo solo en el color atenuado. Es el hallazgo B10.
 */
export const ConPestanaBloqueada: Story = {
  render: () => {
    const [activa, setActiva] = useState("general");
    return (
      <Tabs
        label="Secciones del panel"
        active={activa}
        onChange={setActiva}
        tabs={[
          PESTANAS[0],
          PESTANAS[1],
          { ...PESTANAS[2], disabled: true, disabledReason: "solo disponible para padres" },
          { ...PESTANAS[3], disabled: true, disabledReason: "solo disponible para padres" },
        ]}
      >
        <p className="py-6 text-content">Contenido de la seccion: {activa}</p>
      </Tabs>
    );
  },
};

/**
 * Con muchas pestanas y etiquetas largas la barra hace scroll horizontal en
 * lugar de romper la linea. Es el caso que aparece en movil y el que nadie
 * prueba hasta que se rompe.
 */
export const EtiquetasLargas: Story = {
  render: () => {
    const [activa, setActiva] = useState("general");
    return (
      <div className="max-w-md">
        <Tabs
          label="Secciones del panel"
          active={activa}
          onChange={setActiva}
          tabs={[
            { id: "general", label: "Vista General del Panel" },
            { id: "hijos", label: "Gestion de Hijos y Miembros" },
            { id: "tareas", label: "Tareas Personalizadas" },
            { id: "privilegios", label: "Privilegios Personalizados" },
          ]}
        >
          <p className="py-6 text-content">Contenido de la seccion: {activa}</p>
        </Tabs>
      </div>
    );
  },
};
