import React, { useEffect, useState } from 'react';

import Accordion from '../ui/Accordion';
import Tabs from '../ui/Tabs';
import { fetchCategorias } from '../../services/faqsService';
import { Categoria } from '../../types/faqsTypes';

/**
 * Las preguntas frecuentes.
 *
 * Es un COMPONENTE, no una pagina: se puede incrustar donde haga falta. Antes
 * era una pantalla suelta en /faqs a la que ademas no llevaba ningun enlace.
 *
 * LA ESTRUCTURA, y por que es esta.
 *
 * Los datos tienen tres niveles: categoria -> pregunta -> soluciones. Cada
 * nivel pide un patron distinto y mezclarlos es lo que hace que un FAQ se use
 * mal:
 *
 *   CATEGORIAS -> pestañas. Elegir categoria es "enseñame este panel", que es
 *   literalmente para lo que existen las pestañas. Y `ui/Tabs` ya trae el
 *   teclado resuelto.
 *
 *   PREGUNTAS -> acordeon. Aqui se quiere abrir VARIAS a la vez para
 *   compararlas. Con pestañas solo se ve una, y eso en unas FAQs estorba.
 *
 *   SOLUCIONES -> una lista de verdad. Con parrafos sueltos, un lector de
 *   pantalla no dice cuantos consejos hay ni por cual va.
 */

export interface FaqsProps {
  /**
   * Nivel del encabezado de cada pregunta. Depende de lo que haya encima donde
   * se incruste: un encabezado en el nivel equivocado rompe el esquema del
   * documento.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const Faqs: React.FC<FaqsProps> = ({ headingLevel = 3 }) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activa, setActiva] = useState<string>('');

  useEffect(() => {
    fetchCategorias()
      .then((datos) => {
        setCategorias(datos);
        if (datos.length > 0) setActiva(datos[0].id);
      })
      .catch((err) => console.error('Error al cargar las categorías:', err))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <p role="status" className="text-content-muted">
        Cargando preguntas…
      </p>
    );
  }

  if (categorias.length === 0) {
    return <p className="text-content-muted">Todavía no hay preguntas publicadas.</p>;
  }

  const categoria = categorias.find((c) => c.id === activa) ?? categorias[0];

  return (
    <Tabs
      label="Categorías de preguntas"
      active={categoria.id}
      onChange={setActiva}
      tabs={categorias.map((c) => ({ id: c.id, label: c.titulo }))}
    >
      <div className="py-6">
        {categoria.definicion && (
          <p className="mb-4 text-content-muted">{categoria.definicion}</p>
        )}

        {categoria.preguntas.length === 0 ? (
          <p className="text-content-muted">Esta categoría todavía no tiene preguntas.</p>
        ) : (
          <Accordion
            headingLevel={headingLevel}
            items={categoria.preguntas.map((pregunta) => ({
              id: pregunta.id,
              titulo: pregunta.titulo,
              contenido: (
                <div className="flex flex-col gap-3">
                  {pregunta.definicion && <p>{pregunta.definicion}</p>}

                  {pregunta.soluciones.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-content">Cómo tratarlo</p>
                      <ul className="flex list-disc flex-col gap-1 pl-5">
                        {pregunta.soluciones.map((sol) => (
                          <li key={sol.id}>{sol.texto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </div>
    </Tabs>
  );
};

export default Faqs;
