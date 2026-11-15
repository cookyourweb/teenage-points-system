import React, { useEffect, useMemo, useState } from 'react';

import {
  getEleccionesTipo,
  getPreguntasTipo,
  guardarEleccionTipo,
  pedirPerfil,
} from '../../services/coachService';
import type {
  EleccionesTipo,
  Frecuencia,
  Nivel,
  PerfilTipo,
  PreguntasTipo,
} from '../../services/coachService';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Field from '../ui/Field';

/**
 * La pantalla donde un adulto descubre la mezcla de colores de su hijo.
 *
 * El navegador NUNCA sabe a que color apunta cada afirmacion: manda las
 * respuestas al servidor y este devuelve el nivel de cada color. Despues el
 * adulto decide que colores reconoce de verdad; esa decision (no el perfil) es
 * lo que se guarda. Si dos adultos no coinciden, se dice sin escoger bando.
 */

export interface DescubrirTipoProps {
  familyId: string;
  hijoId: string;
  nombreHijo: string;
}

const OPCIONES_FRECUENCIA = [
  { value: '', label: 'Elige una opción' },
  { value: 'NUNCA', label: 'Nunca' },
  { value: 'A_VECES', label: 'A veces' },
  { value: 'A_MENUDO', label: 'A menudo' },
] as const;

const NIVEL: Record<Nivel, string> = { NADA: 'Nada', ALGO: 'Algo', MUCHO: 'Mucho' };

const mensaje = (e: unknown) => (e instanceof Error ? e.message : 'Algo salió mal. Inténtalo de nuevo.');

const DescubrirTipo: React.FC<DescubrirTipoProps> = ({ familyId, hijoId, nombreHijo }) => {
  const [preguntas, setPreguntas] = useState<PreguntasTipo | null>(null);
  const [elecciones, setElecciones] = useState<EleccionesTipo | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, Frecuencia>>({});
  const [perfil, setPerfil] = useState<PerfilTipo | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([getPreguntasTipo(), getEleccionesTipo(familyId, hijoId)])
      .then(([p, e]) => {
        if (!vigente) return;
        setPreguntas(p);
        setElecciones(e);
      })
      .catch((e: unknown) => vigente && setError(mensaje(e)));
    return () => {
      vigente = false;
    };
  }, [familyId, hijoId]);

  const nombreDe = useMemo(
    () => new Map((preguntas?.colores ?? []).map((c) => [c.id, c.nombre])),
    [preguntas],
  );

  const completo =
    !!preguntas && preguntas.afirmaciones.every((a) => respuestas[a.id] !== undefined);

  const verPerfil = async () => {
    setError(null);
    setOcupado(true);
    try {
      const p = await pedirPerfil(respuestas);
      setPerfil(p);
      setMarcados(p.colores.filter((c) => c.nivel !== 'NADA').map((c) => c.id));
      setPrincipal(null);
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setOcupado(false);
    }
  };

  const alternar = (id: string) => {
    const estaba = marcados.includes(id);
    setMarcados(estaba ? marcados.filter((m) => m !== id) : [...marcados, id]);
    if (estaba && principal === id) setPrincipal(null);
  };

  const guardar = async () => {
    if (!perfil) return;
    setError(null);
    setOcupado(true);
    try {
      // Se conserva el orden del perfil, no el orden en que se fue marcando.
      const colores = perfil.colores.filter((c) => marcados.includes(c.id)).map((c) => c.id);
      await guardarEleccionTipo(familyId, hijoId, { colores, principal });
      setElecciones(await getEleccionesTipo(familyId, hijoId));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-negative-text">
          {error}
        </p>
      )}

      {preguntas && (
        <section aria-labelledby="tipo-afirmaciones" className="space-y-4">
          <h3 id="tipo-afirmaciones" className="text-base font-semibold text-content">
            ¿Cuánto se reconoce {nombreHijo} en cada frase?
          </h3>

          {preguntas.afirmaciones.map((a) => (
            <Field
              key={a.id}
              as="select"
              name={`afirmacion-${a.id}`}
              label={a.texto}
              value={respuestas[a.id] ?? ''}
              onChange={(e) => {
                const { [a.id]: _quitada, ...resto } = respuestas;
                setRespuestas(e.target.value ? { ...resto, [a.id]: e.target.value as Frecuencia } : resto);
              }}
              options={OPCIONES_FRECUENCIA}
            />
          ))}

          {!completo && (
            <p className="text-sm text-content-muted">Responde todas las frases para ver el perfil.</p>
          )}
          <Button onClick={verPerfil} disabled={!completo} loading={ocupado && !perfil}>
            Ver perfil
          </Button>
        </section>
      )}

      {perfil && (
        <section aria-labelledby="tipo-colores" className="space-y-4">
          <h3 id="tipo-colores" className="text-base font-semibold text-content">
            Los colores de {nombreHijo}
          </h3>
          <p className="text-sm text-content-muted">
            Esto es una sugerencia. Marca los colores que tú reconoces en {nombreHijo}.
          </p>

          <div>
            {perfil.colores.map((c) => (
              <Checkbox
                key={c.id}
                name={`color-${c.id}`}
                label={`${c.nombre}: ${NIVEL[c.nivel]}`}
                description={preguntas?.colores.find((x) => x.id === c.id)?.descripcion}
                checked={marcados.includes(c.id)}
                onChange={() => alternar(c.id)}
              />
            ))}
          </div>

          {marcados.length > 0 && (
            <Field
              as="select"
              name="color-principal"
              label="Color principal (opcional)"
              value={principal ?? ''}
              onChange={(e) => setPrincipal(e.target.value || null)}
              options={[
                { value: '', label: 'Sin color principal' },
                ...perfil.colores
                  .filter((c) => marcados.includes(c.id))
                  .map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          )}

          <Button onClick={guardar} disabled={marcados.length === 0 || ocupado} loading={ocupado}>
            Guardar mi elección
          </Button>
        </section>
      )}

      {elecciones && elecciones.elecciones.length > 0 && (
        <section aria-labelledby="tipo-elecciones" className="space-y-3">
          <h3 id="tipo-elecciones" className="text-base font-semibold text-content">
            Lo que ve cada adulto
          </h3>

          {!elecciones.coinciden && (
            <p className="text-sm text-content">No coincidís: es un buen punto para hablarlo</p>
          )}

          <ul className="space-y-2">
            {elecciones.elecciones.map((e) => (
              <li
                key={e.uid}
                aria-label={e.esMia ? 'Tu elección' : 'Otro adulto'}
                className="rounded-lg border border-line p-3 text-sm text-content"
              >
                <p className="font-medium">{e.esMia ? 'Tu elección' : 'Otro adulto'}</p>
                <p>{e.colores.map((id) => nombreDe.get(id) ?? id).join(', ')}</p>
                {e.principal && (
                  <p className="text-content-muted">Principal: {nombreDe.get(e.principal) ?? e.principal}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DescubrirTipo;
