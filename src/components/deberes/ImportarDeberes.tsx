import { useState } from 'react';

import { guardarImportacion, getDeberes } from '../../services/deberesService';
import type { Decision, ResultadoGuardado } from '../../services/deberesService';
import type {
  CampoComparado,
  Cambio,
  Comparacion,
  Deber,
  ItemImportado,
  ResultadoImportacion,
  TipoDeber,
} from '../../types/deberTypes';
import { TOPES } from '../../types/deberTypes';
import { compararConGuardados, hoyEnMadrid } from '../../utils/deberes/comparar';
import { esEnlaceSeguro } from '../../utils/deberes/enlaces';
import { parsearDeberes } from '../../utils/deberes/formato';
import Accordion from '../ui/Accordion';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Field from '../ui/Field';

/**
 * El adulto pega la lista de Claude in Chrome, ve qué cambia frente a lo guardado
 * (archivados incluidos) y solo se guarda lo que él acepta. Nada de formato aquí:
 * leer es `parsearDeberes`, cruzar es `compararConGuardados`.
 *
 * Todo lo pegado viene de fuera: se pinta como texto, los enlaces solo si son
 * https:// seguros, y los textos de las líneas con error van aislados en <bdi>.
 */

export interface ImportarDeberesProps {
  familyId: string;
  hijoId: string;
  nombreHijo: string;
  hoy?: string;
  onGuardado?: () => void;
}

type Fase = 'pegar' | 'revisar' | 'guardando' | 'hecho';

/** El enlace no se edita: es la identidad del deber y viene de Classroom. */
interface Edicion {
  guardar: boolean;
  titulo: string;
  fecha: string;
}

interface ErroresFila {
  titulo?: string;
  fecha?: string;
}

const CORTADA = 'La lista llegó cortada o con errores: vuelve a sacarla de Classroom para dar el día por revisado.';

const fechaValida = (f: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === f;
};

const TIPO: Record<TipoDeber, string> = {
  EXAMEN: 'Examen',
  ENTREGA: 'Entrega',
  MATERIAL: 'Material',
  AVISO: 'Aviso',
};

const CAMPO: Record<CampoComparado, string> = {
  tipo: 'Tipo',
  asignatura: 'Asignatura',
  fecha: 'Fecha',
  titulo: 'Título',
  detalle: 'Detalle',
  estado: 'Estado',
  imprimir: 'Imprimir',
};

const TITULO_SECCION = 'text-base font-semibold text-content';
const CELDA = 'border-b border-line px-2 py-1 text-left align-top';

const Enlace = ({ href, titulo }: { href: string; titulo: string }) =>
  esEnlaceSeguro(href) ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${titulo}`}
      className="text-sm text-link underline hover:text-link-hover"
    >
      Abrir enlace
    </a>
  ) : null;

const Datos = ({ tipo, asignatura, fecha }: { tipo: TipoDeber; asignatura: string; fecha?: string | null }) => (
  <p className="text-sm text-content-muted">
    {TIPO[tipo]} · {asignatura}
    {fecha ? ` · ${fecha}` : ' · sin fecha'}
  </p>
);

const TablaCambios = ({ cambios }: { cambios: Cambio[] }) => (
  <table className="w-full text-sm text-content">
    <caption className="sr-only">Qué cambia</caption>
    <thead>
      <tr>
        <th scope="col" className={CELDA}>Campo</th>
        <th scope="col" className={CELDA}>Antes</th>
        <th scope="col" className={CELDA}>Después</th>
      </tr>
    </thead>
    <tbody>
      {cambios.map((c) => (
        <tr key={c.campo}>
          <th scope="row" className={CELDA}>{CAMPO[c.campo]}</th>
          <td className={CELDA}>{c.antes || '(vacío)'}</td>
          <td className={CELDA}>{c.despues || '(vacío)'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function ImportarDeberes({
  familyId,
  hijoId,
  nombreHijo,
  hoy,
  onGuardado,
}: ImportarDeberesProps): JSX.Element {
  const [fase, setFase] = useState<Fase>('pegar');
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [comparacion, setComparacion] = useState<Comparacion | null>(null);
  const [ediciones, setEdiciones] = useState<Record<number, Edicion>>({});
  const [erroresFila, setErroresFila] = useState<Record<number, ErroresFila>>({});
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResultadoGuardado | null>(null);

  const ilegible = resultado?.errores.some((e) => e.linea === 0) ?? false;
  // Solo una lista completa y sin errores da el día por revisado.
  const limpia = resultado !== null && resultado.completa && resultado.errores.length === 0;

  const olvidarVistaPrevia = () => {
    setResultado(null);
    setComparacion(null);
    setFase('pegar');
  };

  const ver = async () => {
    setError(null);
    const r = parsearDeberes(texto);
    if (r.errores.some((e) => e.linea === 0)) {
      setResultado(r);
      setComparacion(null);
      setFase('revisar');
      return;
    }
    setCargando(true);
    let guardados: Deber[];
    try {
      // Archivados incluidos: un deber archivado nunca vuelve como nuevo.
      guardados = await getDeberes(familyId, hijoId, false);
    } catch {
      setError('No se han podido cargar los deberes guardados. Inténtalo de nuevo.');
      olvidarVistaPrevia();
      setCargando(false);
      return;
    }
    // clavesConError: una línea rota también «apareció»; sin ella saldría un falso «ya no aparece».
    const c = compararConGuardados(r.items, guardados, {
      completa: r.completa,
      hoy: hoy ?? hoyEnMadrid(),
      clavesConError: r.clavesConError,
    });
    const iniciales: Record<number, Edicion> = {};
    for (const i of [...c.nuevos, ...c.cambiados.map((x) => x.item)]) {
      iniciales[i.linea] = { guardar: true, titulo: i.titulo, fecha: i.fecha ?? '' };
    }
    setResultado(r);
    setComparacion(c);
    setEdiciones(iniciales);
    setErroresFila({});
    setCargando(false);
    setFase('revisar');
  };

  const editar = (linea: number, cambio: Partial<Edicion>) =>
    setEdiciones((previas) => ({ ...previas, [linea]: { ...previas[linea], ...cambio } }));

  const filas: { item: ItemImportado; guardado?: Deber }[] = comparacion
    ? [...comparacion.nuevos.map((item) => ({ item })), ...comparacion.cambiados.map(({ item, guardado }) => ({ item, guardado }))]
    : [];
  const marcadas = filas.filter((f) => ediciones[f.item.linea]?.guardar);

  const guardar = async () => {
    const errores: Record<number, ErroresFila> = {};
    const decisiones: Decision[] = [];
    for (const { item, guardado } of marcadas) {
      const e = ediciones[item.linea];
      const titulo = e.titulo.trim();
      const fecha = e.fecha.trim();
      const fallo: ErroresFila = {};
      if (titulo === '') fallo.titulo = 'Falta el título';
      if (fecha !== '' && !fechaValida(fecha)) fallo.fecha = 'La fecha debe ser aaaa-mm-dd';
      if (fallo.titulo || fallo.fecha) {
        errores[item.linea] = fallo;
        continue;
      }
      decisiones.push({
        item: { ...item, titulo, fecha: fecha || null },
        ...(guardado ? { guardado } : {}),
      });
    }
    setErroresFila(errores);
    if (Object.keys(errores).length > 0) return;
    if (decisiones.length === 0 && !limpia) return;

    setError(null);
    setFase('guardando');
    try {
      setResumen(await guardarImportacion(familyId, hijoId, decisiones, { registrar: limpia }));
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.');
      setFase('revisar');
      return;
    }
    setFase('hecho');
    onGuardado?.();
  };

  if (fase === 'hecho' && resumen) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-base font-semibold text-content">
          Guardados: {resumen.guardados}
        </p>
        {!limpia && <p className="text-sm text-content">{CORTADA}</p>}
        {resumen.importacionSinRegistrar && (
          <p className="text-sm text-content">
            Se ha guardado todo, pero no se ha podido anotar la importación: el aviso de «más de un día» seguirá
            hasta la próxima.
          </p>
        )}
        {resumen.fallidos.length > 0 && (
          <section className="space-y-2">
            <h3 id="deberes-fallidos" className={TITULO_SECCION}>
              No se guardaron ({resumen.fallidos.length})
            </h3>
            <ul aria-labelledby="deberes-fallidos" className="space-y-2">
              {resumen.fallidos.map((f) => (
                <li key={f.item.linea} className="text-sm text-content">
                  <p className="font-medium">{f.item.titulo}</p>
                  <p className="text-negative-text">
                    <bdi>{f.motivo}</bdi>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const filaEditable = ({ item, guardado }: { item: ItemImportado; guardado?: Deber }, cambios?: Cambio[]) => {
    const e = ediciones[item.linea];
    const fallo = erroresFila[item.linea] ?? {};
    return (
      <li key={item.linea} className="space-y-2 rounded-lg border border-line p-3">
        <Datos tipo={item.tipo} asignatura={item.asignatura} fecha={item.fecha} />
        <p className="font-medium text-content">{item.titulo}</p>
        {guardado && !guardado.isActive && <p className="text-sm font-medium text-content-muted">Archivado</p>}
        <Enlace href={item.enlace} titulo={item.titulo} />
        {cambios && <TablaCambios cambios={cambios} />}
        <Checkbox
          name={`guardar-${item.linea}`}
          label={`Guardar «${item.titulo}»`}
          checked={e.guardar}
          onChange={() => editar(item.linea, { guardar: !e.guardar })}
        />
        <Field
          name={`titulo-${item.linea}`}
          label={`Título de «${item.titulo}»`}
          value={e.titulo}
          maxLength={TOPES.titulo}
          error={fallo.titulo}
          onChange={(ev) => editar(item.linea, { titulo: ev.target.value })}
        />
        <Field
          name={`fecha-${item.linea}`}
          label={`Fecha de «${item.titulo}»`}
          hint="aaaa-mm-dd, o vacía si no tiene"
          inputMode="numeric"
          maxLength={10}
          value={e.fecha}
          error={fallo.fecha}
          onChange={(ev) => editar(item.linea, { fecha: ev.target.value })}
        />
      </li>
    );
  };

  const n = marcadas.length;

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-negative-text">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <Field
          as="textarea"
          name="pegada"
          label="Pega aquí la lista de Claude in Chrome"
          hint={`La lista de ${nombreHijo}, tal cual la escribe Claude in Chrome.`}
          rows={8}
          maxLength={TOPES.texto}
          disabled={cargando || fase === 'guardando'}
          value={texto}
          onChange={(ev) => {
            setTexto(ev.target.value);
            // Otro texto, otra comparación: no se guarda una vista previa vieja.
            if (resultado) olvidarVistaPrevia();
          }}
        />
        <Button onClick={() => void ver()} disabled={texto.trim() === '' || fase === 'guardando'} loading={cargando}>
          Ver qué cambia
        </Button>
      </div>

      {resultado && (fase === 'revisar' || fase === 'guardando') && (
        <>
          {resultado.errores.length > 0 && (
            <section aria-labelledby="deberes-errores" className="space-y-2">
              <h3 id="deberes-errores" className={TITULO_SECCION}>
                Errores ({resultado.errores.length})
              </h3>
              <table className="w-full text-sm text-content" aria-labelledby="deberes-errores">
                <thead>
                  <tr>
                    <th scope="col" className={CELDA}>Línea</th>
                    <th scope="col" className={CELDA}>Motivo</th>
                    <th scope="col" className={CELDA}>Texto</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.errores.map((e, k) => (
                    <tr key={`${e.linea}-${k}`}>
                      <td className={CELDA}>{e.linea > 0 ? e.linea : '—'}</td>
                      <td className={CELDA}>
                        <bdi>{e.motivo}</bdi>
                      </td>
                      <td className={CELDA}>
                        <bdi>{e.texto}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {comparacion && !ilegible && (
            <>
              {resultado.avisos.length > 0 && (
                <section aria-labelledby="deberes-comprobaciones" className="space-y-2">
                  <h3 id="deberes-comprobaciones" className={TITULO_SECCION}>
                    Comprobaciones ({resultado.avisos.length})
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-content">
                    {resultado.avisos.map((a, k) => (
                      <li key={k}>
                        <bdi>{a}</bdi>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {comparacion.nuevos.length > 0 && (
                <section aria-labelledby="deberes-nuevos" className="space-y-2">
                  <h3 id="deberes-nuevos" className={TITULO_SECCION}>
                    Nuevos ({comparacion.nuevos.length})
                  </h3>
                  <ul className="space-y-3">{comparacion.nuevos.map((item) => filaEditable({ item }))}</ul>
                </section>
              )}

              {comparacion.cambiados.length > 0 && (
                <section aria-labelledby="deberes-cambiaron" className="space-y-2">
                  <h3 id="deberes-cambiaron" className={TITULO_SECCION}>
                    Cambiaron ({comparacion.cambiados.length})
                  </h3>
                  <ul className="space-y-3">
                    {comparacion.cambiados.map(({ item, guardado, cambios }) =>
                      filaEditable({ item, guardado }, cambios),
                    )}
                  </ul>
                </section>
              )}

              {comparacion.iguales.length > 0 && (
                <Accordion
                  items={[
                    {
                      id: 'iguales',
                      titulo: `Iguales (${comparacion.iguales.length})`,
                      contenido: (
                        <ul className="space-y-1 text-sm">
                          {comparacion.iguales.map((i) => (
                            <li key={i.linea}>
                              {TIPO[i.tipo]} · {i.asignatura} · {i.titulo}
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
              )}

              {comparacion.yaNoAparecen.length > 0 && (
                <section aria-labelledby="deberes-ya-no" className="space-y-2">
                  <h3 id="deberes-ya-no" className={TITULO_SECCION}>
                    Ya no aparecen ({comparacion.yaNoAparecen.length})
                  </h3>
                  <p className="text-sm text-content-muted">
                    No se borra nada. Si ya no hace falta, archívalo desde la lista.
                  </p>
                  <ul className="space-y-2">
                    {comparacion.yaNoAparecen.map((g) => (
                      <li key={g.id} className="rounded-lg border border-line p-3">
                        <Datos tipo={g.tipo} asignatura={g.asignatura} fecha={g.fecha} />
                        <p className="font-medium text-content">{g.titulo}</p>
                        <Enlace href={g.enlace} titulo={g.titulo} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {resultado.dudas.length > 0 && (
                <section aria-labelledby="deberes-dudas" className="space-y-2">
                  <h3 id="deberes-dudas" className={TITULO_SECCION}>
                    Dudas ({resultado.dudas.length})
                  </h3>
                  <p className="text-sm text-content-muted">Las dudas no se guardan: míralas en Classroom.</p>
                  <ul className="space-y-2">
                    {resultado.dudas.map((d) => (
                      <li key={d.linea} className="text-sm text-content">
                        <p className="text-content-muted">{d.asignatura}</p>
                        {d.titulo && <p className="font-medium">{d.titulo}</p>}
                        {d.detalle && <p>{d.detalle}</p>}
                        {d.enlace && <Enlace href={d.enlace} titulo={d.titulo || d.asignatura} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="deberes-cobertura" className="space-y-2">
                <h3 id="deberes-cobertura" className={TITULO_SECCION}>
                  Cobertura
                </h3>
                {resultado.cobertura.length === 0 ? (
                  <p className="text-sm text-content-muted">La lista no trae cobertura.</p>
                ) : (
                  <table className="w-full text-sm text-content" aria-labelledby="deberes-cobertura">
                    <thead>
                      <tr>
                        <th scope="col" className={CELDA}>Asignatura</th>
                        <th scope="col" className={CELDA}>Exámenes</th>
                        <th scope="col" className={CELDA}>Entregas</th>
                        <th scope="col" className={CELDA}>Material</th>
                        <th scope="col" className={CELDA}>Avisos</th>
                        <th scope="col" className={CELDA}>Dudas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.cobertura.map((c) => (
                        <tr key={c.asignatura}>
                          <th scope="row" className={CELDA}>{c.asignatura}</th>
                          <td className={CELDA}>{c.examenes}</td>
                          <td className={CELDA}>{c.entregas}</td>
                          <td className={CELDA}>{c.material}</td>
                          <td className={CELDA}>{c.avisos}</td>
                          <td className={CELDA}>{c.dudas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {!limpia && (
                <p id="deberes-cortada" className="text-sm text-negative-text">
                  {CORTADA}
                </p>
              )}
              <Button
                onClick={() => void guardar()}
                loading={fase === 'guardando'}
                disabled={n === 0 && !limpia}
                aria-describedby={limpia ? undefined : 'deberes-cortada'}
              >
                {n > 0 ? `Guardar ${n} ${n === 1 ? 'deber' : 'deberes'}` : 'Revisado, sin cambios'}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
