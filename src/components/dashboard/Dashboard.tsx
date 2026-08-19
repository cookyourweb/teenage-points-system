// src/components/dashboard/Dashboard.tsx (Actualizado con gestión de tareas)
import React, { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSignOutAlt, 
  faUsers, 
  faPlus, 

  faTasks,
  faGift,
  faChartLine
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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Child } from "../../types/familyTypes";
import { useUserRole } from "../../hooks/useUserRole";
import { 
  addChildToFamily, 
  fetchFamilyById, 
  deleteChildFromFamily, 
  updateChildInFamily 
} from "../../services/familyService";
import { doc, getDoc } from "firebase/firestore";
import ShareChildLink from "../ShareChildLink";

const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  // Estados principales
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  
  // Estados de UI - Pestañas principales
  const [activeTab, setActiveTab] = useState<'overview' | 'children' | 'tasks' | 'privileges'>('overview');
  
  // Estados de modales
  const [isInviting, setIsInviting] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  
  // Estados de carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { role, isLoading: isRoleLoading, error: roleError } = useUserRole(user?.uid);
  const isAdmin = role === "admin";
  const isPadre = role === "padre" || role === "admin";

  // Función para obtener el ID de la familia (memoizada para evitar bucles)
  const fetchFamilyId = useCallback(async (userId: string) => {
    try {
      console.log("Fetching family ID for user:", userId);
      const userDocRef = doc(db, "usuarios", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const retrievedFamilyId = userData.familyId;
        
        if (retrievedFamilyId && typeof retrievedFamilyId === "string") {
          setFamilyId(retrievedFamilyId);
          return retrievedFamilyId;
        } else {
          console.warn("No se encontró un ID de familia válido.");
          setError("No se encontró un ID de familia válido.");
          return null;
        }
      } else {
        console.warn("No se encontró el documento del usuario.");
        setError("No se encontró el documento del usuario.");
        return null;
      }
    } catch (err) {
      console.error("Error al obtener familia:", err);
      setError("Error al obtener la información de la familia.");
      return null;
    }
  }, []);

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

  // Efecto para obtener el ID de la familia cuando el usuario cambia
  useEffect(() => {
    let isMounted = true;

    const loadFamilyId = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const retrievedFamilyId = await fetchFamilyId(user.uid);
        
        if (isMounted && retrievedFamilyId) {
          await fetchChildren(retrievedFamilyId);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error en loadFamilyId:", err);
          setError("Error al cargar los datos de la familia.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFamilyId();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, fetchFamilyId, fetchChildren]);

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

  // Función para renderizar el contenido de cada pestaña
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Introducción */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Sistema de Puntos para Adolescentes
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
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
                  <CardTitle className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartLine} className="text-primary-500" />
                    Resumen Familiar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {children.length}
                      </div>
                      <p className="text-sm text-primary-600 dark:text-primary-400">
                        Hijo{children.length > 1 ? 's' : ''} registrado{children.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                        12
                      </div>
                      <p className="text-sm text-success-600 dark:text-success-400">
                        Tareas base disponibles
                      </p>
                    </div>
                    <div className="text-center p-4 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                        10
                      </div>
                      <p className="text-sm text-accent-600 dark:text-accent-400">
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
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Gestión de Hijos
              </h2>
              <Button onClick={handleAddChild}>
                <FontAwesomeIcon icon={faPlus} />
                Añadir Hijo
              </Button>
            </div>

            {children.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faUsers} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No hay hijos registrados
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-6">
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
                  <Card key={child.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">👤</span>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                          {child.nombre}
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          {child.edad} años
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div>
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Tipos de Adolescente:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {child.tiposAdolescente.length > 0 ? (
                              child.tiposAdolescente.map((tipo, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs px-2 py-1 rounded-full"
                                >
                                  {tipo}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
                <CardContent className="text-center py-12">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faTasks} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Acceso Restringido
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Solo los padres pueden gestionar las tareas personalizadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <TaskManagement familyId={familyId!} />
            )}
          </div>
        );

      case 'privileges':
        return (
          <div className="space-y-6">
            {!isPadre ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-neutral-400 mb-4">
                    <FontAwesomeIcon icon={faGift} size="3x" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Acceso Restringido
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
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

  // Mostrar loading si está cargando
  if (isRoleLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay alguno
  if (error || roleError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center max-w-md">
          <div className="text-danger-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Error al cargar el dashboard
          </h2>
          <p className="text-danger-600 dark:text-danger-400 mb-4">
            {error || roleError || "Error inesperado."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Verificar que tengamos familyId
  if (!familyId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center max-w-md">
          <div className="text-warning-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Configuración Incompleta
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            No se encontró un ID de familia asociado a tu usuario. Por favor, contacta al soporte.
          </p>
          <Button onClick={() => signOut(auth)}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-800 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Dashboard Familiar
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Bienvenido, {user?.displayName || "Usuario"}
                {isPadre && <span className="ml-2 text-primary-600 dark:text-primary-400">👑 Padre</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={async () => {
                  await signOut(auth);
                  navigate("/");
                }}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
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
          ]}
        >
          <main className="py-8">{renderTabContent()}</main>
        </Tabs>
      </div>

      {/* Modals */}
      {isAddingChild && (
        <Modal onClose={handleCloseAddChild} isOpen={isAddingChild}>
          <AddEditChild
            childToEdit={childToEdit || undefined}
            familyId={familyId}
            onSave={handleSaveChild}
            onCancel={handleCloseAddChild}
          />
        </Modal>
      )}

      {isInviting && (
        <Modal onClose={() => setIsInviting(false)} isOpen={isInviting}>
          <InviteMember familyId={familyId} onClose={() => setIsInviting(false)} />
        </Modal>
      )}

      {showCompleteProfile && user && (
        <Modal onClose={() => setShowCompleteProfile(false)} isOpen={showCompleteProfile}>
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
    </div>
  );
};

export default Dashboard;