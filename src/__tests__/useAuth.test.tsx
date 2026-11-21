import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { onAuthStateChanged, signOut } from "firebase/auth";
import useAuth from "../hooks/useAuth";
import { AuthProvider } from "../auth/AuthProvider";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<object>("react-router-dom")),
  useNavigate: () => navigate,
}));
vi.mock("../firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/usersService", () => ({ observarPerfil: vi.fn(() => () => {}) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, cb: (u: unknown) => void) => {
    cb({ uid: "u1", displayName: "Ana", email: "a@a.com" });
    return () => {};
  }) as never);
});

describe("useAuth", () => {
  it("expone el usuario de la sesion y loading=false cuando hay sesion", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.loading).toBe(false);
    expect(result.current.user?.uid).toBe("u1");
  });

  it("sin sesion devuelve user null", () => {
    vi.mocked(onAuthStateChanged).mockImplementation(((_a: unknown, cb: (u: unknown) => void) => {
      cb(null);
      return () => {};
    }) as never);
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("cerrar sesión lleva a la entrada", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
