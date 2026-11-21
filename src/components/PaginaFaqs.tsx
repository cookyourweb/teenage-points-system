import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Link } from 'react-router-dom';

import Faqs from './dashboard/Faqs';
import Footer from './Footer';

/**
 * Las preguntas frecuentes, en `/faqs`. Es una pagina que pide sesion.
 *
 * Es una envoltura fina: el contenido lo pone `Faqs`, que es un componente y
 * vive tambien dentro del panel como una pestaña mas. Aqui solo se le pone
 * alrededor lo que necesita una PAGINA y no un trozo: un encabezado de nivel 1,
 * la region principal, la vuelta atras y el pie.
 *
 * Pide sesion (ver `App.tsx`) porque el contenido es del metodo de su autor,
 * no es nuestro para publicarlo.
 */
const PaginaFaqs: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-surface-page">
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      {/* Sin esto, /faqs era un callejon sin salida: se entraba y no habia
          forma de volver mas que con el boton de atras del navegador. */}
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
        Volver al panel
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-content">Preguntas frecuentes</h1>

      {/* Nivel 2 porque el h1 de la pagina es el de arriba. */}
      <Faqs headingLevel={2} />
    </main>

    <Footer />
  </div>
);

export default PaginaFaqs;
