import React from 'react';
import { Link } from 'react-router-dom';

/**
 * El pie de la aplicacion.
 *
 * Hace dos cosas:
 *
 *  1. Da una PUERTA a las FAQs. Existen en `/faqs`, son publicas y funcionan
 *     desde hace tiempo, y no habia ni un enlace en toda la aplicacion: solo se
 *     llegaba escribiendo la URL. La pantalla estaba, faltaba la puerta.
 *  2. Firma quien lo ha hecho.
 *
 * Y de paso cierra parte del hallazgo A5 de la auditoria: casi ninguna pantalla
 * tiene <main>, <header> ni <nav>, todo son <div>, asi que saltar por regiones
 * con un lector de pantalla no sirve de nada. Un <footer> de pagina es la
 * region `contentinfo`, con nombre propio.
 */
const Footer: React.FC = () => (
  <footer className="mt-12 border-t border-line bg-surface">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6 lg:px-8">
      <Link
        to="/faqs"
        className="text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        Preguntas frecuentes
      </Link>

      <p className="text-content-muted">
        By{' '}
        <a
          href="https://wunjocreations.com"
          target="_blank"
          // Sin `noopener`, la pagina de destino puede manipular la nuestra a
          // traves de window.opener. `noreferrer` ademas no le dice de donde
          // viene la visita.
          rel="noopener noreferrer"
          className="text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          WunjoCreations.com
          {/* Quien no ve la pantalla no percibe que el enlace abre otra
              pestana. Si no se dice, el boton de atras deja de funcionar y no
              se entiende por que. */}
          <span className="sr-only"> (abre en una pestaña nueva)</span>
        </a>
      </p>
    </div>
  </footer>
);

export default Footer;
