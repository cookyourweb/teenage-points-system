//Faqs.tsx
import React, { useEffect, useState } from "react";
import { fetchCategorias } from "../../services/faqsService";
import { Categoria } from "../../types/faqsTypes";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Footer from "../Footer";

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
    <div className="flex min-h-screen flex-col bg-surface text-content">
      <main className="mx-auto w-full max-w-4xl flex-1 p-6">
        {/* Sin esto, /faqs era un callejon sin salida: se entraba y no habia
            forma de volver mas que con el boton de atras del navegador. */}
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Volver al panel
        </Link>

      <h1 className="text-2xl font-bold mb-4">Preguntas frecuentes</h1>
      {categorias.length === 0 ? (
        <p className="text-content-muted">No hay FAQs disponibles.</p>
      ) : (
        <ul className="space-y-4">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="card">
              <p className="card-title">
                <strong>Categoría:</strong> {categoria.titulo}
              </p>
              <p className="italic text-content-muted">
                Definición: {categoria.definicion}
              </p>
              <ul className="mt-2 space-y-2 ml-4">
                {categoria.preguntas.map((pregunta) => (
                  <li
                    key={pregunta.id}
                    className="border p-3 rounded bg-neutral-50 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                  >
                    <p className="font-semibold">Título: {pregunta.titulo}</p>
                    <strong>Soluciones:</strong>
                    <ul className="ml-4 list-disc">
                      {pregunta.soluciones.length === 0 ? (
                        <li className="text-content-muted">Sin soluciones</li>
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
      </main>

      <Footer />
    </div>
  );
};

export default Faqs;
