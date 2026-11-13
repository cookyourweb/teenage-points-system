import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { addFamily } from "../services/familyService";
import useAuth from "../hooks/useAuth";

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
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock("../services/familyService", () => ({ addFamily: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, cb: (u: unknown) => void) => {
    cb({ uid: "u1", displayName: "Ana", email: "a@a.com" });
    return () => {};
  }) as never);
  vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
  vi.mocked(addFamily).mockResolvedValue({ familyId: "f1" } as never);
});

describe("useAuth", () => {
  it("un usuario sin documento no recibe una familia nueva", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await new Promise((r) => setTimeout(r, 0));
    expect(addFamily).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("cerrar sesión lleva a la entrada", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
