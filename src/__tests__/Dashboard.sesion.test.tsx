import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import Dashboard from "../components/dashboard/Dashboard";
import { fetchFamilyById } from "../services/familyService";
import { useSesion } from "../auth/useSesion";
import type { EstadoPerfil } from "../auth/useSesion";

// El panel se prueba contra la SESIÓN (useSesion mockeado): de ella sale la
// familia, ya no de una lectura propia de `usuarios/{uid}`.
vi.mock("../auth/useSesion", () => ({ useSesion: vi.fn() }));
vi.mock("../services/familyService", () => ({
  fetchFamilyById: vi.fn().mockResolvedValue(null),
  addChildToFamily: vi.fn(),
  deleteChildFromFamily: vi.fn(),
  updateChildInFamily: vi.fn(),
}));
vi.mock("../components/dashboard/FamilyPointsOverview", () => ({ default: () => <div>resumen-puntos</div> }));
vi.mock("../components/dashboard/AddEditChild", () => ({ default: () => null }));
vi.mock("../components/dashboard/InviteMember", () => ({ default: () => null }));
vi.mock("../components/dashboard/CompleteProfile", () => ({ default: () => null }));
vi.mock("../components/dashboard/TaskManagement", () => ({ default: () => null }));
vi.mock("../components/dashboard/PrivilegeManagement", () => ({ default: () => null }));
vi.mock("../components/dashboard/Faqs", () => ({ default: () => null }));
vi.mock("../components/Footer", () => ({ default: () => null }));
vi.mock("../components/ShareChildLink", () => ({ default: () => null }));

const sesionCon = (perfil: EstadoPerfil, altaEnCurso = false) =>
  vi.mocked(useSesion).mockReturnValue({
    tipo: "autenticado",
    user: { uid: "u1", displayName: "Ana" },
    perfil,
    altaEnCurso,
    iniciarAlta: vi.fn(),
    terminarAlta: vi.fn(),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  } as never);

const pintar = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe("Dashboard y la sesión", () => {
  beforeEach(() => vi.clearAllMocks());

  it("altaEnCursoMuestraPreparando", () => {
    sesionCon({ tipo: "sin-documento" }, true);
    pintar();
    expect(screen.getByText(/Preparando tu cuenta/)).toBeInTheDocument();
    expect(screen.queryByText(/No se encontró/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no está configurada/)).not.toBeInTheDocument();
  });

  it("huerfanaMuestraNoConfigurada", () => {
    sesionCon({ tipo: "sin-documento" }, false);
    pintar();
    expect(screen.getByText(/Tu cuenta no está configurada/)).toBeInTheDocument();
  });

  it("perfilSinFamiliaMuestraNoConfigurada", () => {
    sesionCon({ tipo: "listo", perfil: { nombre: "x", rol: "padre", familyId: "" } });
    pintar();
    expect(screen.getByText(/Tu cuenta no está configurada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar Sesión/ })).toBeInTheDocument();
    expect(screen.queryByText("resumen-puntos")).not.toBeInTheDocument();
    expect(fetchFamilyById).not.toHaveBeenCalled();
  });

  it("errorDeCargaNoEsNoConfigurada", () => {
    sesionCon({ tipo: "error" });
    pintar();
    expect(
      screen.getByText("No pudimos cargar tu cuenta. Revisa tu conexión y recarga la página."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tu cuenta no está configurada/)).not.toBeInTheDocument();
  });

  it("perfilListoCargaLaFamilia", async () => {
    sesionCon({ tipo: "listo", perfil: { nombre: "Ana", rol: "padre", familyId: "f1" } });
    pintar();
    await waitFor(() => expect(fetchFamilyById).toHaveBeenCalledWith("f1"));
    expect(await screen.findByText("resumen-puntos")).toBeInTheDocument();
  });
});
