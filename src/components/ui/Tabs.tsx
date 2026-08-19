import type { KeyboardEvent, ReactNode } from 'react';
import React, { useRef } from 'react';

/**
 * Navegacion por pestanas, patron Tabs de WAI-ARIA APG.
 *
 * Sale de dos hallazgos de docs/AUDITORIA-ACCESIBILIDAD.md:
 *
 *   C9 (Alto)  Cuatro botones haciendo de pestanas, sin role="tablist",
 *              role="tab", role="tabpanel", aria-selected ni aria-controls. El
 *              estado activo se comunicaba SOLO con color de borde y de texto,
 *              o sea que para un lector de pantalla no existia.
 *   F7 (Medio) Al cambiar de pestana se sustituia todo el contenido, el foco
 *              se quedaba en el boton y nada anunciaba el cambio.
 *
 * Tres cosas hacen que esto sea un tablist y no cuatro botones seguidos:
 *
 *  1. Los roles y el emparejamiento id / aria-controls / aria-labelledby.
 *  2. El TABINDEX MOVIL: solo la pestana activa es tabulable. Dentro de la
 *     barra se navega con flechas. Si las cuatro fueran tabulables, pasar de
 *     largo la navegacion costaria cuatro pulsaciones de Tab en vez de una.
 *  3. Que el panel se anuncie con el nombre de su pestana, que es lo que
 *     arregla F7.
 *
 * Los colores salen de los tokens, asi que no hay ni una clase dark: aqui.
 */

export interface TabDef {
  id: string;
  label: string;
  /** Icono opcional. Es ReactNode para no atar el sistema a una libreria. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Se anade al nombre accesible: "Tareas, solo para padres". */
  disabledReason?: string;
}

export interface TabsProps {
  /** Nombre de la barra de navegacion. Obligatorio: un tablist sin nombre no dice de que es. */
  label: string;
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
}

const idTab = (id: string) => `tab-${id}`;
const idPanel = (id: string) => `panel-${id}`;

const Tabs: React.FC<TabsProps> = ({ label, tabs, active, onChange, children }) => {
  const barra = useRef<HTMLDivElement>(null);

  const activables = tabs.filter((t) => !t.disabled);
  const activa = tabs.find((t) => t.id === active);

  /** Mueve a la siguiente activable, dando la vuelta. Se salta las bloqueadas. */
  const mover = (desde: string, paso: number) => {
    if (activables.length === 0) return;
    const i = activables.findIndex((t) => t.id === desde);
    // Si la actual esta deshabilitada no esta en la lista: se empieza por el borde.
    const siguiente = i === -1 ? (paso > 0 ? 0 : activables.length - 1) : (i + paso + activables.length) % activables.length;
    onChange(activables[siguiente].id);
  };

  const alPulsarTecla = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const acciones: Record<string, () => void> = {
      ArrowRight: () => mover(id, 1),
      ArrowLeft: () => mover(id, -1),
      Home: () => activables[0] && onChange(activables[0].id),
      End: () => activables.at(-1) && onChange(activables.at(-1)!.id),
    };

    const accion = acciones[e.key];
    if (!accion) return;

    e.preventDefault();
    accion();
    // El foco sigue a la seleccion, que es lo que espera quien usa flechas.
    requestAnimationFrame(() => {
      barra.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    });
  };

  return (
    <>
      <div className="border-b border-line">
        <div
          ref={barra}
          role="tablist"
          aria-label={label}
          className="-mb-px flex gap-8 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const seleccionada = tab.id === active;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={idTab(tab.id)}
                aria-controls={idPanel(tab.id)}
                aria-selected={seleccionada}
                aria-disabled={tab.disabled || undefined}
                // Tabindex movil: solo la activa entra en el orden de tabulacion.
                tabIndex={seleccionada ? 0 : -1}
                onClick={() => !tab.disabled && onChange(tab.id)}
                onKeyDown={(e) => alPulsarTecla(e, tab.id)}
                className={[
                  'inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-1 text-sm font-medium',
                  'transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
                  tab.disabled
                    ? 'cursor-not-allowed border-transparent text-disabled-fg'
                    : seleccionada
                      ? 'border-link text-link'
                      : 'border-transparent text-content-muted hover:border-line-strong hover:text-content',
                ].join(' ')}
              >
                {tab.icon}
                {tab.label}
                {/* El motivo va en texto, no solo en el color atenuado.
                    Hallazgo B10 de la auditoria. */}
                {tab.disabled && tab.disabledReason && (
                  <span className="sr-only">, {tab.disabledReason}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={idPanel(active)}
        aria-labelledby={activa ? idTab(active) : undefined}
        // Enfocable para que se pueda llegar a leer aunque dentro no haya
        // ningun control.
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
};

export default Tabs;
