import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { ReactNode } from 'react';
import React, { useId, useState } from 'react';

/**
 * El acordeon: una lista de cosas que se abren y se cierran.
 *
 * Es el patron `disclosure` de WAI-ARIA, NO el de `tabs`. La diferencia decide
 * cual usar en cada sitio:
 *
 *   - TABS: se ve UNO de los paneles. Sirve para elegir seccion.
 *   - ACORDEON: se pueden abrir VARIOS a la vez. Sirve para comparar.
 *
 * En unas preguntas frecuentes se quiere lo segundo: abrir dos y mirarlas
 * juntas. Por eso las categorias van en `Tabs` y las preguntas aqui.
 *
 * LO QUE NO SE VE Y ES LO QUE MAS SE USA: cada titulo va DENTRO de un
 * encabezado. Quien navega con lector de pantalla en una pagina de preguntas
 * salta por encabezados, no tabula. Sin eso hay que recorrer las preguntas una
 * a una para encontrar la que interesa.
 */

export interface AccordionItem {
  id: string;
  titulo: string;
  contenido: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /**
   * Nivel de los encabezados. Lo elige quien lo coloca, porque depende de lo
   * que haya encima: un encabezado en el nivel equivocado rompe el esquema del
   * documento.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const Accordion: React.FC<AccordionProps> = ({ items, headingLevel = 3 }) => {
  const base = useId();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const alternar = (id: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      // Se anade o se quita, sin cerrar los demas. Eso es lo que lo diferencia
      // de unas pestañas.
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const Encabezado = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => {
        const abierto = abiertos.has(item.id);
        const idBoton = `${base}-${item.id}-boton`;
        const idPanel = `${base}-${item.id}-panel`;

        return (
          <div key={item.id}>
            <Encabezado className="m-0">
              <button
                type="button"
                id={idBoton}
                aria-expanded={abierto}
                aria-controls={idPanel}
                onClick={() => alternar(item.id)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-1 py-3 text-left text-base font-medium text-content transition-colors hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                {item.titulo}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  aria-hidden="true"
                  className={`shrink-0 text-content-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
                />
              </button>
            </Encabezado>

            {/* El panel se quita del DOM al cerrarse en vez de ocultarse con
                CSS. Asi no queda contenido invisible dentro del orden de
                tabulacion, que es el fallo clasico de los acordeones. */}
            {abierto && (
              <div id={idPanel} aria-labelledby={idBoton} className="px-1 pb-4 text-content-muted">
                {item.contenido}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
