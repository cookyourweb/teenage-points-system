import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { observarPerfil } from "../services/usersService";
import { SesionContext, type EstadoPerfil, type SesionConAcciones } from "./useSesion";

// Única excepción a "Firebase solo en services/": este proveedor es el único
// sitio que observa la sesión (onAuthStateChanged). El perfil NO se lee aquí:
// va por usersService.observarPerfil.
//
// Por qué un solo proveedor: antes cada pantalla se suscribía por su cuenta y
// el panel leía `usuarios/{uid}` con un getDoc antes de que el alta lo creara.
// Ahora el perfil se observa en vivo y, cuando el documento aparece, la
// pantalla se actualiza sola (la carrera se resuelve con el dato, no con
// esperas).

// `undefined` = Firebase aún no ha contestado; `null` = nadie con sesión.
type UsuarioObservado = User | null | undefined;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UsuarioObservado>(undefined);
  // El perfil lleva el uid al que pertenece: si no coincide con el usuario
  // actual se considera 'cargando'. Así, al cambiar de cuenta, el perfil de la
  // anterior nunca se muestra ni durante un render.
  const [perfilDe, setPerfilDe] = useState<{ uid: string; estado: EstadoPerfil } | null>(null);
  const [altaEnCurso, setAltaEnCurso] = useState(false);

  useEffect(() => {
    const baja = onAuthStateChanged(auth, (u) => setUser(u));
    return baja;
  }, []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    // La baja de la suscripción es lo que devuelve el efecto: al cambiar de
    // uid (o en el doble montaje de StrictMode) React la llama antes de abrir la nueva.
    return observarPerfil(uid, (estado) => setPerfilDe({ uid, estado }));
  }, [uid]);

  const iniciarAlta = useCallback(() => setAltaEnCurso(true), []);
  const terminarAlta = useCallback(() => setAltaEnCurso(false), []);
  const cerrarSesion = useCallback(() => signOut(auth), []);

  const valor = useMemo<SesionConAcciones>(() => {
    const acciones = { iniciarAlta, terminarAlta, cerrarSesion };
    if (user === undefined) return { tipo: "cargando", ...acciones };
    if (user === null) return { tipo: "anonimo", ...acciones };
    const perfil: EstadoPerfil =
      perfilDe && perfilDe.uid === user.uid ? perfilDe.estado : { tipo: "cargando" };
    return { tipo: "autenticado", user, perfil, altaEnCurso, ...acciones };
  }, [user, perfilDe, altaEnCurso, iniciarAlta, terminarAlta, cerrarSesion]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
};
