import React, { useEffect, useRef } from 'react';

import type { Afirmacion, Frecuencia } from '../../services/coachService';
import Button from '../ui/Button';

/**
 * El cuestionario como una conversacion: una afirmacion por mensaje.
 *
 * Es presentacional: las respuestas viven en quien lo usa. Tampoco sabe a que
 * color apunta cada afirmacion; solo pinta ids y textos opacos.
 */

const OPCIONES: { valor: Frecuencia; etiqueta: string }[] = [
  { valor: 'NUNCA', etiqueta: 'Nunca' },
  { valor: 'A_VECES', etiqueta: 'A veces' },
  { valor: 'A_MENUDO', etiqueta: 'A menudo' },
];

const ETIQUETA = Object.fromEntries(OPCIONES.map((o) => [o.valor, o.etiqueta])) as Record<Frecuencia, string>;

export interface ChatAfirmacionesProps {
  afirmaciones: Afirmacion[];
  respuestas: Record<string, Frecuencia>;
  /** Mientras se pide el perfil no se puede cambiar nada. */
  ocupado: boolean;
  /** Ya hay perfil: el chat queda como historial. */
  terminado: boolean;
  /** Fallo al pedir el perfil: se ofrece reintentar. */
  falloPerfil: boolean;
  onResponder: (id: string, valor: Frecuencia) => void;
  onCambiarAnterior: () => void;
  onReintentar: () => void;
}

const ChatAfirmaciones: React.FC<ChatAfirmacionesProps> = ({
  afirmaciones,
  respuestas,
  ocupado,
  terminado,
  falloPerfil,
  onResponder,
  onCambiarAnterior,
  onReintentar,
}) => {
  const respondidas = afirmaciones.filter((a) => respuestas[a.id] !== undefined).length;
  const completo = respondidas === afirmaciones.length;
  const actual = completo ? undefined : afirmaciones[respondidas];
  const visibles = afirmaciones.slice(0, completo ? afirmaciones.length : respondidas + 1);

  // El foco solo se mueve tras una interaccion, no al montar: no se roba el
  // foco a quien acaba de abrir la pantalla.
  const moverFoco = useRef(false);
  const botones = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    botones.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [respondidas]);

  const responder = (id: string, valor: Frecuencia) => {
    moverFoco.current = true;
    onResponder(id, valor);
  };
  const cambiar = () => {
    moverFoco.current = true;
    onCambiarAnterior();
  };

  return (
    <div className="space-y-3">
      <div role="log" aria-live="polite" aria-label="Conversación" className="space-y-3">
        {visibles.map((a, i) => {
          const r = respuestas[a.id];
          return (
            <React.Fragment key={a.id}>
              <div className="max-w-[85%] rounded-lg bg-surface-sunken p-3 text-content">
                <p className="text-sm text-content-muted">
                  {i + 1} de {afirmaciones.length}
                </p>
                <p>{a.texto}</p>
              </div>
              {r !== undefined && (
                <div className="ml-auto max-w-[85%] rounded-lg bg-action-bg p-3 text-right text-content">
                  <p>
                    <span className="sr-only">Tu respuesta: </span>
                    {ETIQUETA[r]}
                  </p>
                </div>
              )}
            </React.Fragment>
          );
        })}
        {terminado && (
          <div className="max-w-[85%] rounded-lg bg-surface-sunken p-3 text-content">
            <p>Ya tengo el perfil. Marca abajo los colores que reconoces.</p>
          </div>
        )}
        {completo && !terminado && ocupado && (
          <div className="max-w-[85%] rounded-lg bg-surface-sunken p-3 text-content">
            <p>Preparando el perfil…</p>
          </div>
        )}
      </div>

      {actual && (
        <div ref={botones} className="flex flex-wrap gap-2">
          {OPCIONES.map((o) => (
            <Button key={o.valor} variant="neutral" disabled={ocupado} onClick={() => responder(actual.id, o.valor)}>
              {o.etiqueta}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {falloPerfil && !ocupado && !terminado && <Button onClick={onReintentar}>Reintentar</Button>}
        {respondidas > 0 && !terminado && (
          <Button variant="ghost" disabled={ocupado} onClick={cambiar}>
            Cambiar la anterior
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatAfirmaciones;
