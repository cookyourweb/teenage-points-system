import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useId, useRef } from 'react';

/**
 * El dialogo del sistema.
 *
 * Hallazgo D1 de docs/AUDITORIA-ACCESIBILIDAD.md, el unico CRITICO que
 * quedaba. Y el que mas rinde: los 8 usos ya pasaban por este fichero, asi que
 * arreglarlo aqui arregla los 8 sitios sin tocar una linea de las pantallas.
 *
 * Lo que estaba roto:
 *   - Sin role="dialog" ni aria-modal. Para un lector de pantalla no era un
 *     dialogo, era un div mas.
 *   - Sin nombre.
 *   - Sin trampa de foco: al abrirlo el foco se quedaba en el boton de detras,
 *     y con Tab se recorria toda la pagina de atras.
 *   - Al cerrarlo el foco no volvia: te quedabas al principio del documento.
 *   - No cerraba con Escape.
 *   - Al cerrarse forzaba overflow 'auto' en vez de devolver el que habia.
 *
 * La trampa de foco se implementa a mano y no con <dialog> nativo a
 * proposito: <dialog>.showModal() no existe en jsdom, asi que el
 * comportamiento no seria comprobable en los tests. Un arreglo de
 * accesibilidad sin test se vuelve a romper.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Obligatorio. Un dialogo sin nombre no se puede anunciar.
   *
   * Antes cada pantalla ponia su propio <h2> suelto y ninguno estaba conectado
   * al dialogo. Ahora lo pinta el componente y lo enlaza con aria-labelledby,
   * asi que no se pueden desincronizar.
   */
  title: string;
  children: ReactNode;
}

/** Lo que el navegador considera alcanzable con el tabulador. */
const ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const dialogo = useRef<HTMLDivElement>(null);
  /** Quien tenia el foco antes de abrir, para devolverselo al cerrar. */
  const disparador = useRef<Element | null>(null);
  const idTitulo = useId();

  const enfocables = useCallback(
    () => Array.from(dialogo.current?.querySelectorAll<HTMLElement>(ENFOCABLES) ?? []),
    [],
  );

  // Al abrir: recordar quien tenia el foco y metelo dentro. Al cerrar,
  // devolverselo. Sin esto ultimo te quedas al principio del documento y hay
  // que volver a tabular la pagina entera.
  useEffect(() => {
    if (!isOpen) return;

    disparador.current = document.activeElement;
    (enfocables()[0] ?? dialogo.current)?.focus();

    return () => {
      (disparador.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, enfocables]);

  // Se guarda el overflow que HABIA y se devuelve al cerrar. Antes se forzaba
  // 'auto', asi que un dialogo se cargaba el scroll que la pagina hubiera
  // puesto a proposito.
  useEffect(() => {
    if (!isOpen) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previo;
    };
  }, [isOpen]);

  const alPulsarTecla = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    // La trampa: al llegar al final se vuelve al principio, y al reves.
    const lista = enfocables();
    if (lista.length === 0) {
      e.preventDefault();
      return;
    }

    const primero = lista[0];
    const ultimo = lista[lista.length - 1];

    if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    } else if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-fondo"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-surface-overlay p-4"
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        // Enfocable para poder recibir el foco cuando dentro no hay controles.
        tabIndex={-1}
        onKeyDown={alPulsarTecla}
        className="relative max-h-[90vh] w-full max-w-[800px] overflow-y-auto rounded-lg bg-surface p-6 shadow-raised"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={idTitulo} className="text-lg font-bold text-content">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-transparent text-content-muted transition-colors hover:bg-surface-sunken hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default Modal;
