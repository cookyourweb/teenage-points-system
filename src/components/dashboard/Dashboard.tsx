// src/components/dashboard/Dashboard.tsx (Actualizado con gestión de tareas)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSesion } from "../../auth/useSesion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSignOutAlt, 
  faUsers, 
  faPlus, 

  faTasks,
  faGift,
  faChartLine,
  faCircleQuestion
} from "@fortawesome/free-solid-svg-icons";
import AddEditChild from "./AddEditChild";
import InviteMember from "./InviteMember";
import CompleteProfile from "./CompleteProfile";
import FamilyPointsOverview from "./FamilyPointsOverview";
import TaskManagement from "./TaskManagement";
import PrivilegeManagement from "./PrivilegeManagement";

import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Tabs from "../ui/Tabs";
import ThemeToggle from "../ui/ThemeToggle";
import Footer from "../Footer";
import Faqs from "./Faqs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Child } from "../../types/familyTypes";
import { 
  addChildToFamily, 
  fetchFamilyById, 
  deleteChildFromFamily, 
  updateChildInFamily 
} from "../../services/familyService";
import ShareChildLink from "../ShareChildLink";

const Dashboard: React.FC = () => {
  // La familia y el rol salen del perfil que observa el AuthProvider, no de
  // lecturas propias de `usuarios/{uid}`: esas lecturas corrían antes de que
  // el alta creara el documento y pintaban un error al registrarse.
  const sesion = useSesion();
  const user = sesion.tipo === "autenticado" ? sesion.user : null;
  const estadoPerfil = sesion.tipo === "autenticado" ? sesion.perfil : null;
  const altaEnCurso = sesion.tipo === "autenticado" && sesion.altaEnCurso;
  const perfil = estadoPerfil?.tipo === "listo" ? estadoPerfil.perfil : null;
  const familyId = perfil?.familyId ?? null;
  const navigate = useNavigate();

  // Estados principales
  const [children, setChildren] = useState<Child[]>([]);
  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  
  // Estados de UI - Pestañas principales
  const [activeTab, setActiveTab] = useState<'overview' | 'children' | 'tasks' | 'privileges' | 'faqs'>('overview');
  
  // Estados de modales
  const [isInviting, setIsInviting] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  
  // Estados de carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = perfil?.rol ?? null;
  const isAdmin = role === "admin";
  const isPadre = role === "padre" || role === "admin";

  // Función para cargar los hijos (memoizada)
  const fetchChildren = useCallback(async (familyId: string) => {
    try {
      console.log("Fetching children for family ID:", familyId);
      const family = await fetchFamilyById(familyId);
      
      if (family && family.miembros && family.miembros.hijos) {
        const allChildren = Object.values(family.miembros.hijos);
        setChildren(allChildren);
      } else {
        console.warn("No se encontró la familia o no tiene hijos.");
        setChildren([]);
      }
    } catch (err) {
      console.error("Error al cargar los hijos:", err);
      setError("No se pudieron cargar los hijos.");
      setChildren([]);
    }
  }, []);

  // Carga de los hijos cuando el perfil ya trae la familia.
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    let isMounted = true;

    const loadChildren = async () => {
      setLoading(true);
      setError(null);
      await fetchChildren(familyId);
      if (isMounted) setLoading(false);
    };

    loadChildren();

    return () => {
      isMounted = false;
    };
  }, [familyId, fetchChildren]);

  // Handlers para las acciones
  const handleAddChild = useCallback(() => {
    console.log("Adding a new child");
    setChildToEdit(null);
    setIsAddingChild(true);
  }, []);

  const handleCloseAddChild = useCallback(() => {
    setIsAddingChild(false);
    setChildToEdit(null);
  }, []);

  const handleSaveChild = useCallback(async (child: Child) => {
    if (!familyId) return;

    try {
      if (childToEdit) {
        await updateChildInFamily(familyId, childToEdit.id, child);
      } else {
        await addChildToFamily(familyId, child);
      }
      
      await fetchChildren(familyId);
      
      setChildToEdit(null);
      setIsAddingChild(false);
    } catch (err) {
      console.error("Error al guardar el hijo:", err);
      setError("No se pudo guardar el hijo.");
    }
  }, [familyId, childToEdit, fetchChildren]);

  const handleEditChild = useCallback((child: Child) => {
    setChildToEdit(child);
    setIsAddingChild(true);
  }, []);

  const handleDeleteChild = useCallback(async (childId: string, childName: string) => {
    if (!familyId) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar a ${childName}?`
    );
    
    if (confirmDelete) {
      try {
        await deleteChildFromFamily(familyId, childId);
        setChildren(prevChildren => prevChildren.filter(c => c.id !== childId));
      } catch (err) {
        console.error("Error al eliminar hijo:", err);
        setError("No se pudo eliminar el hijo.");
      }
    }
  }, [familyId]);


  const handleProfileUpdated = useCallback(() => {
    setShowCompleteProfile(false);
  }, []);

  // Ojo: renderTabContent y los modales solo se alcanzan tras los guardas de
  // arriba, que garantizan un familyId no vacío; TS no lo puede deducir, de ahí los `!`.
  // Función para renderizar el contenido de cada pestaña
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Introducción */}
            <Card>
              <CardContent padding="md">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2 text-content">
                    Sistema de Puntos para Adolescentes
                  </h2>
                  <p className="max-w-2xl mx-auto text-content-muted">
                    Gestiona las tareas y recompensas de tus hijos. Aquí puedes ver el progreso en tiempo real,
                    añadir nuevos hijos, crear tareas personalizadas y gestionar privilegios.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vista general de puntos */}
            <FamilyPointsOverview familyId={familyId!} />

            {/* Acciones rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={handleAddChild}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Añadir Hijo
                  </Button>
                  <Button variant="primary" 
                    onClick={() => setActiveTab('tasks')}
                    disabled={!isPadre}
                  >
                    <FontAwesomeIcon icon={faTasks} />
                    Gestionar Tareas
                  </Button>
                  <Button variant="primary" 
                    onClick={() => setActiveTab('privileges')}
                    disabled={!isPadre}
                  >
                    <FontAwesomeIcon icon={faGift} />
                    Gestionar Privilegios
                  </Button>
                  {isAdmin && (
                    <Button variant="primary" 
                      onClick={() => setIsInviting(true)}
                    >
                      <FontAwesomeIcon icon={faUsers} />
                      Invitar Miembro
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas rápidas */}
            {children.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <FontAwesomeIcon icon={faChartLine} className="text-primary-500" />
                    Resumen Familiar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-action-bg">
                      <div className="text-2xl font-bold text-link">
                        {children.length}
                      </div>
                      <p className="text-sm text-link">
                        Hijo{children.length > 1 ? 's' : ''} registrado{children.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-positive-bg">
                      <div className="text-2xl font-bold text-positive-text">
                        12
                      </div>
                      <p className="text-sm text-positive-text">
                        Tareas base disponibles
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-reward-bg">
                      <div className="text-2xl font-bold text-reward-text">
                        10
                      </div>
                      <p className="text-sm text-reward-text">
                        Privilegios disponibles
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'children':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-content">
                Gestión de Hijos
              </h2>
              <Button onClick={handleAddChild}>
                <FontAwesomeIcon icon={faPlus} />
                Añadir Hijo
              </Button>
            </div>

            {children.length === 0 ? (
              <Card>
                <CardContent align="center" padding="lg">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faUsers} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-content">
                    No hay hijos registrados
                  </h3>
                  <p className="mb-6 text-content-muted">
                    Comienza añadiendo a tu primer hijo para empezar a usar el sistema de puntos.
                  </p>
                  <Button onClick={handleAddChild}>
                    Añadir Primer Hijo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((child) => (
                  <Card key={child.id} interactive>
                    <CardContent padding="md">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">👤</span>
                        </div>
                        <h3 className="text-lg font-semibold text-content">
                          {child.nombre}
                        </h3>
                        <p className="text-content-muted">
                          {child.edad} años
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div>
                          <p className="text-sm font-medium mb-1 text-content">
                            Tipos de Adolescente:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {child.tiposAdolescente.length > 0 ? (
                              child.tiposAdolescente.map((tipo, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-primary-100 dark:bg-primary-900 text-xs px-2 py-1 rounded-full text-link"
                                >
                                  {tipo}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-content-muted">
                                No asignado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button layout="full"
                          onClick={() => navigate(`/reward-tracker/${familyId}/${child.id}`)}
                        >
                          Ver Sistema de Puntos
                        </Button>
                        <div className="grid grid-cols-3 gap-2">
                          <ShareChildLink child={child} familyId={familyId!} />
                          <Button variant="primary"
                            onClick={() => handleEditChild(child)}
                          >
                            Editar
                          </Button>
                          <Button variant="danger"
                            onClick={() => handleDeleteChild(child.id, child.nombre)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            {!isPadre ? (
              <Card>
                <CardContent align="center" padding="lg">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faTasks} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-content">
                    Acceso Restringido
                  </h3>
                  <p className="text-content-muted">
                    Solo los padres pueden gestionar las tareas personalizadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <TaskManagement familyId={familyId!} />
            )}
          </div>
        );

      case 'faqs':
        return <Faqs headingLevel={3} />;

      case 'privileges':
        return (
          <div className="space-y-6">
            {!isPadre ? (
              <Card>
                <CardContent align="center" padding="lg">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faGift} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-content">
                    Acceso Restringido
                  </h3>
                  <p className="text-content-muted">
                    Solo los padres pueden gestionar los privilegios personalizados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <PrivilegeManagement familyId={familyId!} />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const pantalla = (icono: string, titulo: string, texto: string, accion?: React.ReactNode) => (
    <div className="flex justify-center items-center min-h-screen bg-surface-page">
      <div className="text-center max-w-md">
        <div className="text-warning-500 text-6xl mb-4">{icono}</div>
        <h2 className="text-xl font-bold mb-2 text-content">{titulo}</h2>
        <p className="mb-4 text-content-muted">{texto}</p>
        {accion}
      </div>
    </div>
  );

  // Perfil aún sin resolver: se espera, no se decide.
  if (!estadoPerfil || estadoPerfil.tipo === "cargando") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-content-muted">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Sin documento y con el alta en curso: el documento está a punto de
  // aparecer (Signup lo crea). Es espera, no error.
  if (estadoPerfil.tipo === "sin-documento" && altaEnCurso) {
    return pantalla("⏳", "Preparando tu cuenta…", "Estamos creando tu familia. Un momento.");
  }

  // Cuenta huérfana de verdad: sin documento y sin alta en curso, o con
  // documento pero sin familia (observarPerfil mapea el hueco a ""). Si no se
  // frena aquí, el panel se abriría con familyId "" y los `!` de abajo lo taparían.
  if (estadoPerfil.tipo === "sin-documento" || (estadoPerfil.tipo === "listo" && !estadoPerfil.perfil.familyId)) {
    return pantalla(
      "⚠️",
      "Tu cuenta no está configurada",
      "Tu usuario existe pero no tiene una familia asociada. Cierra sesión y contacta con soporte.",
      <Button onClick={() => sesion.cerrarSesion()}>Cerrar Sesión</Button>,
    );
  }

  // Fallo de lectura (red, permisos): no es lo mismo que "sin configurar".
  if (estadoPerfil.tipo === "error") {
    return pantalla(
      "⚠️",
      "Error al cargar la cuenta",
      "No pudimos cargar tu cuenta. Revisa tu conexión y recarga la página.",
      <Button onClick={() => window.location.reload()}>Reintentar</Button>,
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-content-muted">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Error al cargar los hijos u otras acciones del panel.
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface-page">
        <div className="text-center max-w-md">
          <div className="text-danger-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-content">
            Error al cargar el dashboard
          </h2>
          <p className="mb-4 text-negative-text">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <header className="shadow-sm border-b bg-surface border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-content">
                Dashboard Familiar
              </h1>
              <p className="text-sm mt-1 text-content-muted">
                Bienvenido, {user?.displayName || "Usuario"}
                {isPadre && <span className="ml-2 text-link">👑 Padre</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/admin/faqs"
                  className="rounded-lg px-3 py-2 text-sm text-content-muted underline-offset-4 transition-colors hover:bg-surface-sunken hover:text-content hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                >
                  Administrar FAQs
                </Link>
              )}

              <ThemeToggle />
              <button
                onClick={async () => {
                  await sesion.cerrarSesion();
                  navigate("/");
                }}
                className="flex items-center gap-2 px-4 py-2 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-content-muted"
                title="Cerrar sesión"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navegacion. El patron Tabs vive en ui/Tabs: roles de ARIA, flechas
          y tabindex movil. Antes eran cuatro <button> sueltos sin nada de eso
          (hallazgos C9 y F7 de la auditoria de accesibilidad). */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Tabs
          label="Secciones del panel familiar"
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          tabs={[
            { id: 'overview', label: 'Vista General', icon: <FontAwesomeIcon icon={faChartLine} /> },
            { id: 'children', label: 'Gestión de Hijos', icon: <FontAwesomeIcon icon={faUsers} /> },
            {
              id: 'tasks',
              label: 'Tareas Personalizadas',
              icon: <FontAwesomeIcon icon={faTasks} />,
              disabled: !isPadre,
              disabledReason: 'solo disponible para padres',
            },
            {
              id: 'privileges',
              label: 'Privilegios Personalizados',
              icon: <FontAwesomeIcon icon={faGift} />,
              disabled: !isPadre,
              disabledReason: 'solo disponible para padres',
            },
            { id: 'faqs', label: 'Preguntas frecuentes', icon: <FontAwesomeIcon icon={faCircleQuestion} /> },
          ]}
        >
          <main className="py-8">{renderTabContent()}</main>
        </Tabs>
      </div>

      {/* Modals */}
      {isAddingChild && (
        <Modal
          onClose={handleCloseAddChild}
          isOpen={isAddingChild}
          title={childToEdit ? "Editar hijo" : "Añadir hijo"}
        >
          <AddEditChild
            childToEdit={childToEdit || undefined}
            familyId={familyId!}
            onSave={handleSaveChild}
            onCancel={handleCloseAddChild}
          />
        </Modal>
      )}

      {isInviting && (
        <Modal
          onClose={() => setIsInviting(false)}
          isOpen={isInviting}
          title="Invitar a un miembro de la familia"
        >
          <InviteMember familyId={familyId!} onClose={() => setIsInviting(false)} />
        </Modal>
      )}

      {showCompleteProfile && user && (
        <Modal
          onClose={() => setShowCompleteProfile(false)}
          isOpen={showCompleteProfile}
          title="Completar perfil"
        >
          <CompleteProfile userId={user.uid} onProfileUpdated={handleProfileUpdated} />
        </Modal>
      )}

      {/* Floating Action Button para añadir hijo (móvil) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={handleAddChild}
          className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Añadir hijo"
        >
          <FontAwesomeIcon icon={faPlus} size="lg" />
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;