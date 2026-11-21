import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import { addFamily } from "../services/familyService";
import { updateProfile } from "firebase/auth";
import SignUp from "../components/auth/Signup";
import { useSesion } from "../auth/useSesion";

vi.mock("../firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({ setDoc: vi.fn(), doc: vi.fn() }));
vi.mock("../services/familyService", () => ({ addFamily: vi.fn() }));
vi.mock("../auth/useSesion", () => ({ useSesion: vi.fn() }));

const iniciarAlta = vi.fn();
const terminarAlta = vi.fn();
const orden: string[] = [];

const rellenarYEnviar = () => {
  fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText(/email|correo/i), { target: { value: "a@a.com" } });
  fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: "123456" } });
  fireEvent.submit(screen.getByRole("button", { name: /regist|crear/i }).closest("form")!);
};

describe("Signup y la marca de alta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orden.length = 0;
    iniciarAlta.mockImplementation(() => orden.push("iniciar"));
    terminarAlta.mockImplementation(() => orden.push("terminar"));
    vi.mocked(useSesion).mockReturnValue({ tipo: "anonimo", iniciarAlta, terminarAlta, cerrarSesion: vi.fn() } as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("marca el alta ANTES de crear la cuenta y la termina aunque la creación falle", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockImplementation((() => {
      orden.push("crear");
      return Promise.reject({ code: "auth/email-already-in-use" });
    }) as never);
    render(<SignUp />);
    rellenarYEnviar();
    await waitFor(() => expect(terminarAlta).toHaveBeenCalledTimes(1));
    expect(orden).toEqual(["iniciar", "crear", "terminar"]);
  });

  it("camino feliz: iniciarAlta, crear cuenta, setDoc de usuarios y terminarAlta, en ese orden", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockImplementation((() => {
      orden.push("crear");
      return Promise.resolve({ user: { uid: "u1", email: "a@a.com" } });
    }) as never);
    vi.mocked(addFamily).mockResolvedValue({ familyId: "f1" } as never);
    vi.mocked(setDoc).mockImplementation((() => {
      orden.push("setDoc");
      return Promise.resolve();
    }) as never);
    vi.mocked(updateProfile).mockResolvedValue(undefined as never);
    render(<SignUp />);
    rellenarYEnviar();
    await waitFor(() => expect(terminarAlta).toHaveBeenCalledTimes(1));
    expect(orden).toEqual(["iniciar", "crear", "setDoc", "terminar"]);
  });
});
