import { beforeEach, describe, expect, it, vi } from "vitest";
import { onSnapshot } from "firebase/firestore";
import { observarPerfil } from "../services/usersService";
import type { EstadoPerfil } from "../auth/useSesion";

vi.mock("../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("observarPerfil", () => {
  it("un error de Firestore produce 'error' (no 'sin-documento') y se registra", () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(onSnapshot).mockImplementation(((_r: unknown, _ok: unknown, fallo: (e: Error) => void) => {
      fallo(new Error("red caida"));
      return () => {};
    }) as never);
    const recibidos: EstadoPerfil[] = [];
    observarPerfil("u1", (e) => recibidos.push(e));
    expect(recibidos).toEqual([{ tipo: "error" }]);
    expect(registro).toHaveBeenCalled();
  });
});
