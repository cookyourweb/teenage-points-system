import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type Perfil = { nombre: string; rol: string; familyId: string };

export type EstadoPerfil =
  | { tipo: "cargando" }
  | { tipo: "sin-documento" }
  | { tipo: "listo"; perfil: Perfil };

export type Sesion =
  | { tipo: "cargando" }
  | { tipo: "anonimo" }
  | { tipo: "autenticado"; user: User; perfil: EstadoPerfil; altaEnCurso: boolean };

export type SesionConAcciones = Sesion & {
  iniciarAlta(): void;
  terminarAlta(): void;
  cerrarSesion(): Promise<void>;
};

export const SesionContext = createContext<SesionConAcciones | null>(null);

export const useSesion = (): SesionConAcciones => {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <AuthProvider>");
  return ctx;
};
