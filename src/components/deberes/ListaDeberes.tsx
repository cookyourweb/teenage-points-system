import { useEffect, useState } from 'react';

import { actualizarDeber, getDeberes, getUltimaImportacion } from '../../services/deberesService';
import type { Deber, TipoDeber } from '../../types/deberTypes';
import { agruparPorFecha, archivado } from '../../utils/deberes/agrupar';
import { necesitaImportar } from '../../utils/deberes/comparar';
import { esEnlaceSeguro } from '../../utils/deberes/enlaces';
import Button from '../ui/Button';

/**
 * Los deberes activos de un hijo por fecha, con el material bajo su examen. Todo lo que
 * viene de Classroom se pinta como texto; los enlaces solo si son https:// seguros.
 * «Confirmar hecho» y «Archivar» hacen lo mismo (archivar): aqui no hay puntos.
 */

export interface ListaDeberesProps {
  familyId: string;
  hijoId: string;
  ahora?: Date;
  onImportar: () => void;
}

const TIPO: Record<TipoDeber, string> = {
  EXAMEN: 'Examen',
  ENTREGA: 'Entrega',
  MATERIAL: 'Material',
  AVISO: 'Aviso',
};

const FECHA_LARGA: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
};

const fechaDeDia = (fecha: string): string =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', FECHA_LARGA);

const ERROR_CARGA = 'No se han podido cargar los deberes. Inténtalo de nuevo.';
const ERROR_ARCHIVAR = 'No se ha podido archivar. Inténtalo de nuevo.';

interface FilaProps {
  deber: Deber;
  ocupado: boolean;
  onArchivar: (d: Deber) => void;
  hijos?: Deber[];
}

const Fila = ({ deber, ocupado, onArchivar, hijos = [] }: FilaProps) => (
  <li className="border-b border-line py-2">
    <p className="text-sm text-content-muted">
      {TIPO[deber.tipo]} · {deber.asignatura}
    </p>
    <p className="font-medium text-content">{deber.titulo}</p>
    {deber.detalle ? <p className="text-sm text-content-muted">{deber.detalle}</p> : null}
    <div className="flex flex-wrap items-center gap-2">
      {esEnlaceSeguro(deber.enlace) ? (
        <a
          href={deber.enlace}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir en Classroom: ${deber.titulo}`}
          className="text-sm text-link underline hover:text-link-hover"
        >
          Abrir en Classroom
        </a>
      ) : null}
      {deber.tipo === 'EXAMEN' || deber.tipo === 'ENTREGA' ? (
        <Button size="sm" disabled={ocupado} onClick={() => onArchivar(deber)}>
          Confirmar hecho<span className="sr-only"> {deber.titulo}</span>
        </Button>
      ) : null}
      {/* Button pisa aria-label con `label`: el titulo va como texto solo para lectores de pantalla. */}
      <Button size="sm" variant="neutral" disabled={ocupado} onClick={() => onArchivar(deber)}>
        Archivar<span className="sr-only"> {deber.titulo}</span>
      </Button>
    </div>
    {hijos.length > 0 ? (
      <ul className="mt-2 ml-4">
        {hijos.map((m) => (
          <Fila key={m.id} deber={m} ocupado={ocupado} onArchivar={onArchivar} />
        ))}
      </ul>
    ) : null}
  </li>
);

export default function ListaDeberes({ familyId, hijoId, ahora, onImportar }: ListaDeberesProps): JSX.Element {
  const [deberes, setDeberes] = useState<Deber[] | null>(null);
  const [ultima, setUltima] = useState<string | undefined>(undefined);
  const [cargada, setCargada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargada(false);
    Promise.all([getDeberes(familyId, hijoId, true), getUltimaImportacion(familyId, hijoId)])
      .then(([lista, en]) => {
        if (!vigente) return;
        setDeberes(lista);
        setUltima(en);
        setError(null);
        setCargada(true);
      })
      .catch(() => {
        if (vigente) setError(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, [familyId, hijoId]);

  const archivar = async (deber: Deber) => {
    setOcupado(true);
    try {
      await actualizarDeber(familyId, hijoId, deber.id, archivado(deber));
      setDeberes((actuales) => (actuales ?? []).filter((d) => d.id !== deber.id));
      setError(null);
    } catch {
      setError(ERROR_ARCHIVAR);
    } finally {
      setOcupado(false);
    }
  };

  const { dias, materialSinExamen } = agruparPorFecha(deberes ?? []);
  const avisa = cargada && necesitaImportar(ultima, ahora ?? new Date());

  return (
    <section aria-labelledby="titulo-deberes" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-deberes" className="text-lg font-semibold text-content">
          Deberes
        </h2>
        <Button onClick={onImportar}>Importar deberes</Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {cargada ? (
        <p className="text-sm text-content-muted">
          {ultima
            ? `Última importación: ${new Date(ultima).toLocaleDateString('es-ES', FECHA_LARGA)}`
            : 'Todavía no has importado deberes'}
        </p>
      ) : null}
      {avisa ? (
        <p role="status" className="text-sm font-medium text-content">
          Hace más de un día que no importas. Los profesores publican a diario.
        </p>
      ) : null}

      {cargada && dias.length === 0 && materialSinExamen.length === 0 ? (
        <p className="text-sm text-content-muted">No tienes deberes pendientes.</p>
      ) : null}

      {dias.map((dia) => (
        <div key={dia.fecha ?? 'sin-fecha'}>
          <h3 className="text-base font-semibold text-content">{dia.fecha ? fechaDeDia(dia.fecha) : 'Sin fecha'}</h3>
          <ul>
            {dia.deberes.map(({ deber, materiales }) => (
              <Fila key={deber.id} deber={deber} ocupado={ocupado} onArchivar={archivar} hijos={materiales} />
            ))}
          </ul>
        </div>
      ))}

      {materialSinExamen.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold text-content">Material sin examen en la lista</h3>
          <ul>
            {materialSinExamen.map((m) => (
              <Fila key={m.id} deber={m} ocupado={ocupado} onArchivar={archivar} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
