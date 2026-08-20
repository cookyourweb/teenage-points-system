import type { ReactNode } from 'react';
import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { useMiFamilia } from '../hooks/useMiFamilia';

/**
 * Guarda de PERTENENCIA: comprueba que la familia de la URL sea la tuya.
 *
 * Es una pregunta distinta de la del rol, y por eso es otro componente:
 *
 *   RutaSoloAdmin    "¿QUIÉN ERES?"     -> se resuelve con el rol
 *   RutaDeMiFamilia  "¿ESTO ES TUYO?"   -> se resuelve comparando
 *
 * El agujero que cierra: `/reward-tracker/:familyId/:childId` cogía el
 * `familyId` de la URL y no comprobaba nada. Cualquiera con cuenta que
 * cambiara ese identificador entraba en el seguimiento de puntos de OTRA
 * familia. Y no solo a mirar: podía marcar tareas y canjear privilegios.
 *
 * TRES DECISIONES QUE NO SON DETALLE:
 *
 * 1. Se DENIEGA POR DEFECTO. Sin familia asignada, con un valor raro o si
 *    falla la lectura, no se entra.
 *
 * 2. Mientras carga NO se decide, o alguien legítimo saldría rebotado en el
 *    instante entre que se pinta la página y llega su familyId.
 *
 * 3. Se explica, en vez de echar en silencio. Una redirección muda parece que
 *    la aplicación está rota. Pero el mensaje NO dice si esa otra familia
 *    existe: "no tienes acceso" y punto. Confirmar la existencia de algo
 *    ajeno ya es filtrar información.
 *
 * Y EL AVISO PRINCIPAL: esto es COMODIDAD, NO SEGURIDAD. Vive en el navegador
 * y quien quiera se lo salta con las herramientas de desarrollo. Lo que impide
 * de verdad leer los datos de otra familia son las reglas de `firestore.rules`,
 * porque los datos salen de ahí. Esta guarda evita llegar por accidente y da
 * un mensaje decente.
 */

export interface RutaDeMiFamiliaProps {
  uid: string | undefined;
  children: ReactNode;
}

const RutaDeMiFamilia: React.FC<RutaDeMiFamiliaProps> = ({ uid, children }) => {
  const { familyId: familiaDeLaUrl } = useParams<{ familyId: string }>();
  const { familyId: miFamilia, isLoading } = useMiFamilia(uid);

  if (!uid) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <p role="status" className="text-content-muted">
          Comprobando permisos…
        </p>
      </div>
    );
  }

  if (!miFamilia || miFamilia !== familiaDeLaUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page p-6">
        <div className="max-w-md text-center">
          <p role="alert" className="mb-2 text-lg font-semibold text-content">
            No tienes acceso a estos datos
          </p>
          <p className="mb-6 text-content-muted">
            Esta página pertenece a otra familia.
          </p>
          <Link
            to="/dashboard"
            className="text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            Volver a tu panel
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RutaDeMiFamilia;
