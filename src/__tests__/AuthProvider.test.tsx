import { act, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { onAuthStateChanged } from "firebase/auth";
import { AuthProvider } from "../auth/AuthProvider";
import { useSesion, type EstadoPerfil } from "../auth/useSesion";
import { observarPerfil } from "../services/usersService";

vi.mock("../firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/usersService", () => ({ observarPerfil: vi.fn() }));

// Control manual de lo que emite Firebase: cada test decide cuándo llega cada dato.
let emitirUsuario: (u: unknown) => void;
type Suscripcion = { uid: string; emitir: (e: EstadoPerfil) => void; baja: ReturnType<typeof vi.fn> };
let suscripciones: Suscripcion[];

const envoltorio = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const envoltorioStrict = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <AuthProvider>{children}</AuthProvider>
  </StrictMode>
);

const ana = { uid: "a", email: "a@a.com" };
const beto = { uid: "b", email: "b@b.com" };
const listo = (familyId: string): EstadoPerfil => ({
  tipo: "listo",
  perfil: { nombre: "N", rol: "padre", familyId },
});

beforeEach(() => {
  vi.clearAllMocks();
  suscripciones = [];
  vi.mocked(onAuthStateChanged).mockImplementation(((_a: unknown, cb: (u: unknown) => void) => {
    emitirUsuario = cb;
    return () => {};
  }) as never);
  vi.mocked(observarPerfil).mockImplementation(((uid: string, cb: (e: EstadoPerfil) => void) => {
    const baja = vi.fn();
    suscripciones.push({ uid, emitir: cb, baja });
    return baja;
  }) as never);
});

describe("AuthProvider", () => {
  it("empiezaCargando", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    expect(result.current.tipo).toBe("cargando");
  });

  it("sinUsuarioEsAnonimo", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    act(() => emitirUsuario(null));
    expect(result.current.tipo).toBe("anonimo");
    expect(observarPerfil).not.toHaveBeenCalled();
  });

  it("conUsuarioEsAutenticadoConPerfilCargando, y luego listo con su familyId", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    act(() => emitirUsuario(ana));
    expect(result.current.tipo).toBe("autenticado");
    if (result.current.tipo !== "autenticado") return;
    expect(result.current.perfil.tipo).toBe("cargando");

    act(() => suscripciones[0].emitir(listo("f1")));
    const s = result.current;
    expect(s.tipo === "autenticado" && s.perfil.tipo === "listo" && s.perfil.perfil.familyId).toBe("f1");
  });

  it("elPerfilLlegaDespuesDelAlta: sin-documento y luego listo", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    act(() => emitirUsuario(ana));
    act(() => suscripciones[0].emitir({ tipo: "sin-documento" }));
    expect(result.current.tipo === "autenticado" && result.current.perfil.tipo).toBe("sin-documento");
    act(() => suscripciones[0].emitir(listo("f1")));
    expect(result.current.tipo === "autenticado" && result.current.perfil.tipo).toBe("listo");
  });

  it("cambiarDeCuentaCancelaLaSuscripcion y el perfil vuelve a cargando", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    act(() => emitirUsuario(ana));
    act(() => suscripciones[0].emitir(listo("fA")));

    act(() => emitirUsuario(beto));
    expect(suscripciones[0].baja).toHaveBeenCalledTimes(1);
    const s = result.current;
    expect(s.tipo === "autenticado" && s.user.uid).toBe("b");
    // El perfil de A no se cuela mientras llega el de B.
    expect(s.tipo === "autenticado" && s.perfil.tipo).toBe("cargando");

    act(() => suscripciones[1].emitir(listo("fB")));
    const s2 = result.current;
    expect(s2.tipo === "autenticado" && s2.perfil.tipo === "listo" && s2.perfil.perfil.familyId).toBe("fB");
  });

  it("iniciarAlta y terminarAlta cambian altaEnCurso", () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    act(() => emitirUsuario(ana));
    expect(result.current.tipo === "autenticado" && result.current.altaEnCurso).toBe(false);
    act(() => result.current.iniciarAlta());
    expect(result.current.tipo === "autenticado" && result.current.altaEnCurso).toBe(true);
    act(() => result.current.terminarAlta());
    expect(result.current.tipo === "autenticado" && result.current.altaEnCurso).toBe(false);
  });

  it("en StrictMode no queda ninguna suscripción de perfil viva de más", () => {
    renderHook(() => useSesion(), { wrapper: envoltorioStrict });
    act(() => emitirUsuario(ana));
    const vivas = suscripciones.filter((s) => s.baja.mock.calls.length === 0);
    expect(vivas.length).toBe(1);
  });
});
