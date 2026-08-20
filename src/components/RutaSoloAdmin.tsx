import type { ReactNode } from 'react';
import React from 'react';
import { Navigate } from 'react-router-dom';

import { useUserRole } from '../hooks/useUserRole';

/**
 * Guarda de ruta para lo que solo puede hacer un administrador.
 *
 * Existe por un agujero real. `/admin/faqs` estaba protegida asi:
 *
 *     element={user ? <FaqAdmin /> : <Navigate to="/" replace />}
 *
 * La condicion era `user`, es decir "has iniciado sesion". NO "eres
 * administrador". Cualquiera con cuenta que escribiera esa URL podia borrar
 * las FAQs de toda la familia, un hijo incluido. Y el rol ya estaba calculado
 * en Dashboard.tsx, sin usarse aqui.
 *
 * DOS COSAS QUE NO SON DETALLE:
 *
 * 1. Se DENIEGA POR DEFECTO. Sin rol, con rol desconocido o si falla la
 *    lectura, no se entra. Un error al comprobar permisos no puede acabar en
 *    permiso concedido.
 *
 * 2. Mientras carga el rol NO se decide. Sin eso, un administrador legitimo
 *    saldria rebotado a la portada en el instante entre que se pinta la pagina
 *    y llega su rol de Firestore.
 *
 * Y EL AVISO QUE NO HAY QUE PERDER: esto es COMODIDAD, NO SEGURIDAD. Vive en
 * el navegador y quien quiera se lo salta con las herramientas de desarrollo.
 * Lo que impide de verdad que un hijo borre las FAQs es que **el servidor lo
 * compruebe**. Esta guarda solo evita llegar por accidente y enseñar una
 * puerta que no se puede abrir.
 */

export interface RutaSoloAdminProps {
  /** El identificador del usuario con sesion. Sin el, no se entra. */
  uid: string | undefined;
  children: ReactNode;
}

const RutaSoloAdmin: React.FC<RutaSoloAdminProps> = ({ uid, children }) => {
  const { role, isLoading } = useUserRole(uid);

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

  // Denegar por defecto: solo pasa quien es exactamente admin.
  if (role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RutaSoloAdmin;
