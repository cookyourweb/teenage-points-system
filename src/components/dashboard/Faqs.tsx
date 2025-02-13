//Faqs.tsx
import React, { useEffect, useState } from "react";
import { fetchCategorias } from "../../services/faqsService";
import { Categoria } from "../../types/faqsTypes";

const Faqs: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const data = await fetchCategorias();
        setCategorias(data);
      } catch (err) {
        console.error("Error al cargar las categorías:", err);
      }
    };

    loadCategorias();
  }, []);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4">FAQs</h2>
      {categorias.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No hay FAQs disponibles.</p>
      ) : (
        <ul className="space-y-4">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="card">
              <p className="card-title">
                <strong>Categoría:</strong> {categoria.titulo}
              </p>
              <p className="text-gray-600 dark:text-gray-400 italic">
                Definición: {categoria.definicion}
              </p>
              <ul className="mt-2 space-y-2 ml-4">
                {categoria.preguntas.map((pregunta) => (
                  <li
                    key={pregunta.id}
                    className="border p-3 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <p className="font-semibold">Título: {pregunta.titulo}</p>
                    <strong>Soluciones:</strong>
                    <ul className="ml-4 list-disc">
                      {pregunta.soluciones.length === 0 ? (
                        <li className="text-gray-500 dark:text-gray-400">Sin soluciones</li>
                      ) : (
                        pregunta.soluciones.map((solucion) => (
                          <li key={solucion.id}>{solucion.texto}</li>
                        ))
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Faqs;
