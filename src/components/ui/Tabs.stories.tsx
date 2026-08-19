import type { Meta, StoryObj } from "@storybook/react-vite";
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
