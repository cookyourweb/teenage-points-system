import React, { useEffect, useMemo, useRef, useState } from 'react';

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
import { ErrorHttp } from '../../services/http';
import Checkbox from '../ui/Checkbox';
import ChatAfirmaciones from './ChatAfirmaciones';
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

const NIVEL: Record<Nivel, string> = { NADA: 'Nada', ALGO: 'Algo', MUCHO: 'Mucho' };

// Un fallo de red llega como TypeError("Failed to fetch") en ingles: solo los
// ErrorHttp traen un mensaje del servidor que merece mostrarse tal cual.
const mensaje = (e: unknown) =>
  e instanceof ErrorHttp ? e.message : 'Sin conexión con el servidor. Prueba de nuevo en un rato.';

const DescubrirTipo: React.FC<DescubrirTipoProps> = ({ familyId, hijoId, nombreHijo }) => {
  const [preguntas, setPreguntas] = useState<PreguntasTipo | null>(null);
  const [elecciones, setElecciones] = useState<EleccionesTipo | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, Frecuencia>>({});
  const [perfil, setPerfil] = useState<PerfilTipo | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorElecciones, setErrorElecciones] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [avisoLista, setAvisoLista] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    // Independientes: si fallan las elecciones, el cuestionario sigue disponible.
    getPreguntasTipo()
      .then((p) => vigente && setPreguntas(p))
      .catch((e: unknown) => vigente && setError(mensaje(e)));
    getEleccionesTipo(familyId, hijoId)
      .then((e) => vigente && setElecciones(e))
      .catch((e: unknown) => vigente && setErrorElecciones(mensaje(e)));
    return () => {
      vigente = false;
    };
  }, [familyId, hijoId]);

  const nombreDe = useMemo(
    () => new Map((preguntas?.colores ?? []).map((c) => [c.id, c.nombre])),
    [preguntas],
  );

  const tituloPerfil = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (perfil) tituloPerfil.current?.focus();
  }, [perfil]);

  const responder = (id: string, valor: Frecuencia) => {
    const nuevas = { ...respuestas, [id]: valor };
    setRespuestas(nuevas);
    // La ultima respuesta pide el perfil sola: no hay boton "Ver perfil".
    if (preguntas && preguntas.afirmaciones.every((a) => nuevas[a.id] !== undefined)) {
      void verPerfil(nuevas);
    }
  };

  const cambiarAnterior = () => {
    const ultima = [...(preguntas?.afirmaciones ?? [])].reverse().find((a) => respuestas[a.id] !== undefined);
    if (!ultima) return;
    setError(null);
    const { [ultima.id]: _quitada, ...resto } = respuestas;
    setRespuestas(resto);
  };

  const verPerfil = async (enviadas: Record<string, Frecuencia>) => {
    setError(null);
    setOcupado(true);
    try {
      const p = await pedirPerfil(enviadas);
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
    setGuardado(false);
    setAvisoLista(false);
    setOcupado(true);
    try {
      // Se conserva el orden del perfil, no el orden en que se fue marcando.
      const colores = perfil.colores.filter((c) => marcados.includes(c.id)).map((c) => c.id);
      await guardarEleccionTipo(familyId, hijoId, { colores, principal });
    } catch (e) {
      setError(mensaje(e));
      setOcupado(false);
      return;
    }
    // Ya esta guardado: si solo falla el refresco, no es un error de guardado.
    setGuardado(true);
    try {
      setElecciones(await getEleccionesTipo(familyId, hijoId));
      setErrorElecciones(null);
    } catch {
      setAvisoLista(true);
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

          <ChatAfirmaciones
            afirmaciones={preguntas.afirmaciones}
            respuestas={respuestas}
            ocupado={ocupado}
            terminado={!!perfil}
            falloPerfil={!!error}
            onResponder={responder}
            onCambiarAnterior={cambiarAnterior}
            onReintentar={() => void verPerfil(respuestas)}
          />
        </section>
      )}

      {perfil && (
        <section aria-labelledby="tipo-colores" className="space-y-4">
          <h3 id="tipo-colores" ref={tituloPerfil} tabIndex={-1} className="text-base font-semibold text-content">
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

          {guardado && (
            <p role="status" className="text-sm text-content">
              Elección guardada
            </p>
          )}
          {avisoLista && (
            <p className="text-sm text-content-muted">
              No pudimos actualizar la lista de elecciones; recarga para verla.
            </p>
          )}
          <Button onClick={guardar} disabled={marcados.length === 0 || ocupado} loading={ocupado}>
            Guardar mi elección
          </Button>
        </section>
      )}

      {errorElecciones && (
        <p role="alert" className="text-sm text-negative-text">
          {errorElecciones}
        </p>
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
