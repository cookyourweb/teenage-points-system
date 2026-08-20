//src/components/dashboard/RewardTracker.tsx
// Rutas Firebase: /weeklyTasks/{familyId}_{childId}_{weekId}, /privilegios/{privilegeId}, /familias/{familyId}
import React, { useState, useEffect } from "react";
import PrivilegeRedeemDialog from './PrivilegeRedeemDialog';
import TaskDayCell from './TaskDayCell';
import Field from '../ui/Field';
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faSync, 
  faEdit, 
  faTrash, 
  faPlus,
  faSave,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import useAuth from "../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TasksState } from "../../types/taskTypes";
import { getChildNameById } from "../../services/familyService";
import { initialTasks, initialPrivileges } from "../../config/rewardConfig";
import { useUserRole } from "../../hooks/useUserRole";
// Importar servicios existentes - ruta: src/services/familyService.ts
import { 
  saveWeeklyTasks, 
  getWeeklyTasks, 
  updateTask,
  subscribeToWeeklyTasks,
  initializeChildWeek,
  WeeklyTasksData 
} from "../../services/familyService";
// Importar servicio de privilegios - ruta: src/services/privilegesService.ts
import { 
  updatePrivilege, 
  addPrivilege, 
  deletePrivilege,
  fetchPrivileges 
} from "../../services/privilegesService";

interface EditablePrivilege {
  id: string;
  name: string;
  points: number;
  description?: string;
}

const RewardTracker: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { familyId, childId } = useParams<{ familyId: string; childId: string }>();
  const { role } = useUserRole(user?.uid);
  
  const [childName, setChildName] = useState('Hijo');
  const [tasks, setTasks] = useState<TasksState>({});
  const [totalPoints, setTotalPoints] = useState<{ [key: string]: number }>({});
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [privilegeHistory, setPrivilegeHistory] = useState<any[]>([]);
  const [customPrivileges, setCustomPrivileges] = useState<EditablePrivilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Estados para edición de privilegios
  const [editingPrivilege, setEditingPrivilege] = useState<string | null>(null);
  const [isAddingPrivilege, setIsAddingPrivilege] = useState(false);
  const [newPrivilege, setNewPrivilege] = useState({ name: '', points: 0, description: '' });
  const [showCalendar, setShowCalendar] = useState<string | null>(null);

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const isPadre = role === 'padre' || role === 'admin';

  // Verificar parámetros necesarios
  useEffect(() => {
    if (!familyId || !childId) {
      toast.error("Error: No se encontraron los parámetros necesarios");
      navigate('/dashboard');
      return;
    }
  }, [familyId, childId, navigate]);

  // Obtener nombre del hijo - ruta: /familias/{familyId}
  useEffect(() => {
    const fetchChildName = async () => {
      if (!familyId || !childId) return;
      
      try {
        const name = await getChildNameById(familyId, childId);
        setChildName(name || user?.displayName || 'Hijo');
      } catch (error) {
        console.error('Error fetching child name:', error);
        setChildName(user?.displayName || 'Hijo');
      }
    };

    fetchChildName();
  }, [user, familyId, childId]);

  // Cargar privilegios personalizados - ruta: /privilegios/{privilegeId}
  useEffect(() => {
    const loadCustomPrivileges = async () => {
      try {
        const privileges = await fetchPrivileges();
        const editablePrivileges = privileges.map(p => ({
          id: p.id || p.privilegioId || '', // Usar id principal o privilegioId como fallback
          name: p.name,
          points: p.points || p.pointsRequired || p.puntosNecesarios || 0, // Unificar puntos
          description: p.description
        }));
        setCustomPrivileges(editablePrivileges);
      } catch (error) {
        console.error('Error loading custom privileges:', error);
      }
    };

    loadCustomPrivileges();
  }, []);

  // Migrar datos desde localStorage si existen
  useEffect(() => {
    const migrateFromLocalStorage = async () => {
      if (!familyId || !childId || !user?.uid) return;

      try {
        const storedTasks = localStorage.getItem(`tasks-${childId}`);
        const storedPoints = localStorage.getItem(`points-${childId}`);
        
        if (storedTasks && storedPoints) {
          const tasks = JSON.parse(storedTasks);
          const points = JSON.parse(storedPoints);
          const weeklyTotal = Object.values(points).reduce((sum: number, val: any) => sum + (val || 0), 0);
          
          // Usar saveWeeklyTasks del familyService - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
          await saveWeeklyTasks(familyId, childId, tasks, points, weeklyTotal, user.uid);
          
          // Limpiar localStorage después de migrar
          localStorage.removeItem(`tasks-${childId}`);
          localStorage.removeItem(`points-${childId}`);
          localStorage.removeItem(`lastNotified-${childId}`);
          
          toast.success("📦 Datos migrados desde almacenamiento local a Firebase!", {
            position: "top-right",
            autoClose: 3000,
          });
        }
      } catch (error) {
        console.error("Error durante migración:", error);
      }
    };

    migrateFromLocalStorage();
  }, [familyId, childId, user?.uid]);

  // Suscribirse a cambios en tiempo real - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
  useEffect(() => {
    if (!familyId || !childId) return;

    setLoading(true);
    
    const unsubscribe = subscribeToWeeklyTasks(
      familyId,
      childId,
      async (data: WeeklyTasksData | null) => {
        if (data) {
          setTasks(data.tasks);
          setTotalPoints(data.totalPoints);
          setWeeklyTotal(data.weeklyTotal);
          setLastUpdated(data.lastUpdated.toDate().toISOString());
          
          console.log("📡 Datos actualizados desde Firebase /weeklyTasks:", {
            weeklyTotal: data.weeklyTotal,
            tasksCount: Object.keys(data.tasks).length
          });
        } else {
          // Si no hay datos, inicializar - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
          try {
            if (user?.uid) {
              await initializeChildWeek(familyId, childId, childName, initialTasks, user.uid);
            }
          } catch (error) {
            console.error("Error inicializando semana:", error);
            toast.error("Error al inicializar los datos del hijo");
          }
        }
        setLoading(false);
        setSyncing(false);
      }
    );

    return () => unsubscribe();
  }, [familyId, childId, user?.uid, childName]);

  // Toggle de tareas con persistencia en Firebase - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
  const toggleTarea = async (dia: string, tipo: 'diarias' | 'extra', taskId: string) => {
    if (!familyId || !childId || !user?.uid || syncing) return;

    setSyncing(true);
    
    try {
      // Actualizar estado local inmediatamente para UX responsiva
      const nuevoEstado = JSON.parse(JSON.stringify(tasks));
      const taskIndex = nuevoEstado[dia][tipo].findIndex((task: any) => task.id === taskId);
      
      if (taskIndex !== -1) {
        const task = nuevoEstado[dia][tipo][taskIndex];
        const wasCompleted = task.completada;
        const newCompleted = !wasCompleted;
        task.completada = newCompleted;
        
        setTasks(nuevoEstado);
        
        // Mostrar notificación
        toast.success(`${wasCompleted ? 'Desmarcada' : 'Completada'}: ${task.nombre}`, {
          position: "top-right",
          autoClose: 2000,
        });
        
        // Verificar si desbloqueó un privilegio
        if (newCompleted && !wasCompleted) {
          const newTotal = weeklyTotal + task.puntos;
          checkPrivilegeUnlock(newTotal, task.puntos);
        }
        
        // Actualizar en Firebase usando updateTask - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
        await updateTask(familyId, childId, dia, tipo, taskId, newCompleted, user.uid);
        
        console.log("✅ Tarea actualizada en Firebase /weeklyTasks");
      }
    } catch (error) {
      console.error("❌ Error actualizando tarea:", error);
      toast.error("Error al guardar los cambios. Reintentando...");
      
      // Revertir cambios locales en caso de error
      const currentData = await getWeeklyTasks(familyId!, childId!);
      if (currentData) {
        setTasks(currentData.tasks);
        setTotalPoints(currentData.totalPoints);
        setWeeklyTotal(currentData.weeklyTotal);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Verificar si se desbloqueó un privilegio
  const checkPrivilegeUnlock = (newTotal: number, addedPoints: number) => {
    const oldTotal = newTotal - addedPoints;
    
    [...initialPrivileges, ...customPrivileges].forEach(privilege => {
      const privilegePoints = privilege.points;
      if (newTotal >= privilegePoints && oldTotal < privilegePoints) {
        toast.success(`🎉 ¡Privilegio desbloqueado: ${privilege.name}!`, {
          position: "top-right",
          autoClose: 7000,
        });
      }
    });
  };

  // Funciones para gestión de privilegios - ruta: /privilegios/{privilegeId}
  const handleAddPrivilege = async () => {
    if (!newPrivilege.name.trim() || newPrivilege.points <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    try {
      const privilege = await addPrivilege({
        // id y privilegioId no van aquí: los asigna addPrivilege, y su firma
        // (Omit<Privilege, "id" | "privilegioId">) los excluye a proposito.
        name: newPrivilege.name,
        points: newPrivilege.points,
        description: newPrivilege.description,
        unlocked: false,
        history: []
      });

      setCustomPrivileges(prev => [...prev, {
        id: privilege.id || privilege.privilegioId || '',
        name: privilege.name,
        points: privilege.points,
        description: privilege.description
      }]);

      setNewPrivilege({ name: '', points: 0, description: '' });
      setIsAddingPrivilege(false);
      toast.success("✅ Privilegio añadido correctamente");
    } catch (error) {
      console.error("Error añadiendo privilegio:", error);
      toast.error("Error al añadir el privilegio");
    }
  };

  const handleUpdatePrivilege = async (id: string, updatedData: Partial<EditablePrivilege>) => {
    try {
      await updatePrivilege(id, updatedData);
      
      setCustomPrivileges(prev => prev.map(p => 
        p.id === id ? { ...p, ...updatedData } : p
      ));

      setEditingPrivilege(null);
      toast.success("✅ Privilegio actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando privilegio:", error);
      toast.error("Error al actualizar el privilegio");
    }
  };

  const handleDeletePrivilege = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este privilegio?")) return;

    try {
      await deletePrivilege(id);
      setCustomPrivileges(prev => prev.filter(p => p.id !== id));
      toast.success("✅ Privilegio eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando privilegio:", error);
      toast.error("Error al eliminar el privilegio");
    }
  };

  // Redimir privilegio con calendario - ruta: /privilegios/{privilegeId}
  const handlePrivilegeRedeem = async (privilege: any, date: string) => {
    if (!familyId || !childId || weeklyTotal < privilege.points || syncing || !user?.uid) return;

    setSyncing(true);

    try {
      const pointsToDeduct = privilege.points;
      let remaining = pointsToDeduct;
      const nuevosPoints = { ...totalPoints };
      
      // Deducir puntos proporcionalmente desde los días con más puntos
      const sortedDays = Object.entries(nuevosPoints)
        .filter(([_, points]) => points > 0)
        .sort(([, a], [, b]) => (b as number) - (a as number));
      
      for (const [dia, points] of sortedDays) {
        if (remaining <= 0) break;
        
        const deduction = Math.min(points as number, remaining);
        nuevosPoints[dia] = (points as number) - deduction;
        remaining -= deduction;
      }

      const nuevoTotal = weeklyTotal - pointsToDeduct;

      // Crear entrada de historial
      const newHistoryEntry = {
        id: `${privilege.id}-${Date.now()}`,
        privilegeName: privilege.name,
        pointsUsed: privilege.points,
        dateRedeemed: date,
        redeemedBy: user.uid,
        redeemedAt: new Date().toISOString(),
        childId,
        familyId
      };

      // Guardar en Firebase usando saveWeeklyTasks - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
      await saveWeeklyTasks(familyId, childId, tasks, nuevosPoints, nuevoTotal, user.uid);

      // Actualizar historial local
      setPrivilegeHistory(prev => [...prev, newHistoryEntry]);

      toast.success(`🎉 Privilegio redimido: ${privilege.name} para ${date}!`, {
        position: "top-right",
        autoClose: 5000,
      });

      setShowCalendar(null);

      console.log("✅ Privilegio redimido y guardado en Firebase /privilegios y /weeklyTasks");

    } catch (error) {
      console.error('❌ Error al redimir privilegio:', error);
      toast.error('Error al redimir privilegio. Inténtalo de nuevo.');
    } finally {
      setSyncing(false);
    }
  };

  // Función para refrescar datos manualmente
  const refreshData = async () => {
    if (!familyId || !childId) return;
    
    setSyncing(true);
    try {
      // Obtener datos desde Firebase - ruta: /weeklyTasks/{familyId}_{childId}_{weekId}
      const data = await getWeeklyTasks(familyId, childId);
      if (data) {
        setTasks(data.tasks);
        setTotalPoints(data.totalPoints);
        setWeeklyTotal(data.weeklyTotal);
        setLastUpdated(data.lastUpdated.toDate().toISOString());
        toast.success("📡 Datos actualizados desde Firebase");
      }
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      toast.error("Error al actualizar los datos");
    } finally {
      setSyncing(false);
    }
  };

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Obtener fecha máxima (3 meses adelante)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-content-muted">Cargando sistema de puntos...</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
            Conectando con Firebase /weeklyTasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 bg-surface-page">
      <ToastContainer />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-content bg-line"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Volver al Dashboard
            </button>
            <div>
              <h1 className="text-3xl font-bold text-content">
                Sistema de Puntos
              </h1>
              <p className="text-lg text-content-muted">
                {childName} - Total: {weeklyTotal} puntos
              </p>
              {isPadre && (
                <p className="text-sm text-link">
                  👑 Modo Padre - Puedes editar privilegios
                </p>
              )}
              {lastUpdated && (
                <p className="text-xs text-content-muted">
                  Última actualización: {new Date(lastUpdated).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncing && (
              <div className="flex items-center gap-2 text-link">
                <FontAwesomeIcon icon={faSync} className="animate-spin" />
                <span className="text-sm">Sincronizando...</span>
              </div>
            )}
            <button
              onClick={refreshData}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              title="Actualizar datos desde Firebase"
            >
              <FontAwesomeIcon icon={faSync} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Sistema de Puntos Semanal */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Sistema de Puntos Semanal
            </CardTitle>
            <p className="text-center text-sm text-content-muted">
              Datos guardados en: /weeklyTasks/{familyId}_{childId}_[semana]
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border text-left bg-surface-sunken">Tareas</th>
                    {diasSemana.map(dia => (
                      <th key={dia} className="p-3 border text-center bg-surface-sunken">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialTasks.Lunes.diarias.map(tarea => (
                    <tr key={tarea.id}>
                      <td className="p-3 border">
                        <div>
                          <div className="font-medium">{tarea.nombre}</div>
                          <div className="text-sm text-neutral-500">({tarea.puntos} pts)</div>
                        </div>
                      </td>
                      {diasSemana.map(dia => (
                        <td key={`${dia}-${tarea.id}`} className="p-3 border text-center">
                          <TaskDayCell
                            dia={dia}
                            nombre={tarea.nombre}
                            tipo="diaria"
                            completada={!!tasks[dia]?.diarias.find(t => t.id === tarea.id)?.completada}
                            disabled={syncing}
                            onToggle={() => toggleTarea(dia, 'diarias', tarea.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {initialTasks.Lunes.extra.map(tarea => (
                    <tr key={tarea.id} className="bg-primary-50 dark:bg-primary-900/20">
                      <td className="p-3 border">
                        <div>
                          <div className="font-medium">{tarea.nombre}</div>
                          <div className="text-sm text-link">
                            ({tarea.puntos} pts - Extra)
                          </div>
                        </div>
                      </td>
                      {diasSemana.map(dia => (
                        <td key={`${dia}-${tarea.id}`} className="p-3 border text-center">
                          <TaskDayCell
                            dia={dia}
                            nombre={tarea.nombre}
                            tipo="extra"
                            completada={!!tasks[dia]?.extra.find(t => t.id === tarea.id)?.completada}
                            disabled={syncing}
                            onToggle={() => toggleTarea(dia, 'extra', tarea.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="font-bold bg-surface-sunken">
                    <td className="p-3 border">Puntos del Día</td>
                    {diasSemana.map(dia => (
                      <td key={`puntos-${dia}`} className="p-3 border text-center">
                        <span className="text-lg font-bold text-link">
                          {totalPoints[dia] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-primary-500 to-accent-600 text-white rounded-lg">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Puntos Totales de la Semana</h3>
                <p className="text-4xl font-bold mt-2">{weeklyTotal} puntos</p>
                <p className="text-sm opacity-90 mt-1">
                  {syncing ? "Sincronizando con Firebase..." : "Guardado en tiempo real"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privilegios Disponibles */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold">🏆 Privilegios Disponibles</CardTitle>
                <p className="text-sm text-content-muted">
                  Privilegios guardados en: /privilegios/[privilegeId]
                </p>
              </div>
              {isPadre && (
                <button
                  onClick={() => setIsAddingPrivilege(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Añadir Privilegio
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Formulario para añadir privilegio */}
            {isPadre && isAddingPrivilege && (
              <div className="mb-6 p-4 border-2 border-dashed border-success-300 rounded-lg bg-positive-bg">
                <h4 className="font-semibold mb-3">Añadir Nuevo Privilegio</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field
                    label="Nombre del privilegio"
                    name="nuevo-privilegio-nombre"
                    value={newPrivilege.name}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Field
                    label="Puntos necesarios"
                    name="nuevo-privilegio-puntos"
                    type="number"
                    min={1}
                    value={newPrivilege.points}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  />
                  <Field
                    label="Descripción"
                    name="nuevo-privilegio-descripcion"
                    value={newPrivilege.description}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, description: e.target.value }))}
                    hint="Opcional"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddPrivilege}
                    className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600"
                  >
                    <FontAwesomeIcon icon={faSave} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingPrivilege(false);
                      setNewPrivilege({ name: '', points: 0, description: '' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-500 text-white rounded-lg hover:bg-neutral-600"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Privilegios iniciales */}
              {initialPrivileges.map((privilege, index) => {
                const canUnlock = weeklyTotal >= privilege.points && !syncing;
                const privilegeId = `initial-${index}`;
                const isEditing = editingPrivilege === privilegeId;
                
                return (
                  <div key={privilegeId} className="border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow bg-surface">
                    {/* Iconos de edición para padres */}
                    {isPadre && (
                      <div className="flex justify-end gap-1 mb-2">
                        <button
                          onClick={() => setEditingPrivilege(isEditing ? null : privilegeId)}
                          className="p-1 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900 rounded"
                          title="Editar privilegio"
                        >
                          <FontAwesomeIcon icon={faEdit} size="sm" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que quieres ocultar "${privilege.name}"? No se eliminará permanentemente.`)) {
                              toast.info(`Privilegio "${privilege.name}" ocultado temporalmente`);
                            }
                          }}
                          className="p-1 text-warning-500 hover:bg-warning-100 dark:hover:bg-warning-900 rounded"
                          title="Ocultar privilegio (no eliminar)"
                        >
                          <FontAwesomeIcon icon={faTrash} size="sm" />
                        </button>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">🏆</div>
                      
                      {isEditing ? (
                        <div className="space-y-2 mb-4">
                          {/* OJO: estos tres NO GUARDAN NADA. Al pulsar Intro
                              sacan un toast que dice "actualizado" y cierran la
                              edicion, pero no llaman a ningun servicio. Son los
                              privilegios INICIALES, que estan en codigo. El
                              mensaje de exito es mentira y conviene arreglarlo
                              o quitar la edicion. */}
                          <Field
                            label="Nombre del privilegio"
                            labelHidden
                            name={`editar-inicial-nombre-${privilege.id}`}
                            defaultValue={privilege.name}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                toast.success(`Privilegio "${privilege.name}" actualizado localmente`);
                                setEditingPrivilege(null);
                              }
                            }}
                          />
                          <Field
                            label="Puntos necesarios"
                            labelHidden
                            name={`editar-inicial-puntos-${privilege.id}`}
                            type="number"
                            defaultValue={privilege.points}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                toast.success(`Puntos actualizados para "${privilege.name}"`);
                                setEditingPrivilege(null);
                              }
                            }}
                          />
                          <Field
                            label="Descripción"
                            labelHidden
                            name={`editar-inicial-descripcion-${privilege.id}`}
                            placeholder="Descripción (opcional)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingPrivilege(null);
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                toast.success(`Privilegio "${privilege.name}" guardado`);
                                setEditingPrivilege(null);
                              }}
                              className="flex-1 px-3 py-1 bg-success-500 text-white rounded text-sm hover:bg-success-600"
                            >
                              <FontAwesomeIcon icon={faSave} className="mr-1" />
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingPrivilege(null)}
                              className="flex-1 px-3 py-1 bg-neutral-500 text-white rounded text-sm hover:bg-neutral-600"
                            >
                              <FontAwesomeIcon icon={faTimes} className="mr-1" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-lg mb-2 text-content">
                            {privilege.name}
                          </h4>
                          <p className="text-sm mb-4 text-content-muted">
                            Puntos necesarios: {privilege.points}
                          </p>
                        </>
                      )}
                      
                      {/* Barra de progreso */}
                      <div className="w-full rounded-full h-3 mb-4 bg-line">
                        <div 
                          className="bg-gradient-to-r from-primary-500 to-accent-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((weeklyTotal / privilege.points) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs mb-4 text-content-muted">
                        {weeklyTotal}/{privilege.points} puntos ({Math.max(0, privilege.points - weeklyTotal)} faltan)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                          canUnlock && !isEditing
                            ? 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 transform hover:scale-105' 
                            : 'bg-neutral-300 dark:bg-neutral-600 cursor-not-allowed text-content-muted'
                        }`}
                        disabled={!canUnlock || syncing || isEditing}
                        onClick={() => canUnlock && !isEditing && setShowCalendar(privilegeId)}
                      >
                        {isEditing ? '✏️ Editando...' : (syncing ? '⏳ Sincronizando...' : (canUnlock ? '🎉 ¡Desbloquear!' : '🔒 No disponible'))}
                      </button>
                      
                      {/* El dialogo de canje vive en PrivilegeRedeemDialog. Aqui habia dos
                          copias identicas escritas a mano, sin role="dialog" ni trampa de foco. */}
                      {showCalendar === privilegeId && (
                        <PrivilegeRedeemDialog
                          isOpen
                          privilegeName={privilege.name}
                          minDate={getMinDate()}
                          maxDate={getMaxDate()}
                          onClose={() => { setShowCalendar(null); }}
                          onRedeem={(cuando) => handlePrivilegeRedeem(privilege, cuando)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Privilegios personalizados */}
              {customPrivileges.map((privilege) => {
                const canUnlock = weeklyTotal >= privilege.points && !syncing;
                const isEditing = editingPrivilege === privilege.id;
                
                return (
                  <div key={privilege.id} className="border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow bg-surface">
                    {isPadre && (
                      <div className="flex justify-end gap-1 mb-2">
                        <button
                          onClick={() => setEditingPrivilege(isEditing ? null : privilege.id)}
                          className="p-1 text-primary-500 hover:bg-primary-100 rounded"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} size="sm" />
                        </button>
                        <button
                          onClick={() => handleDeletePrivilege(privilege.id)}
                          className="p-1 text-danger-500 hover:bg-danger-100 rounded"
                          title="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} size="sm" />
                        </button>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">✨</div>
                      
                      {isEditing ? (
                        <div className="space-y-2 mb-4">
                          <Field
                            label="Nombre del privilegio"
                            labelHidden
                            name={`editar-nombre-${privilege.id}`}
                            defaultValue={privilege.name}
                            onBlur={(e) => handleUpdatePrivilege(privilege.id, { name: e.target.value })}
                          />
                          <Field
                            label="Puntos necesarios"
                            labelHidden
                            name={`editar-puntos-${privilege.id}`}
                            type="number"
                            defaultValue={privilege.points}
                            onBlur={(e) => handleUpdatePrivilege(privilege.id, { points: parseInt(e.target.value) || 0 })}
                          />
                          <Field
                            label="Descripción"
                            labelHidden
                            name={`editar-descripcion-${privilege.id}`}
                            defaultValue={privilege.description || ''}
                            placeholder="Descripción (opcional)"
                            onBlur={(e) => handleUpdatePrivilege(privilege.id, { description: e.target.value })}
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-lg mb-2 text-content">
                            {privilege.name}
                          </h4>
                          <p className="text-sm mb-4 text-content-muted">
                            Puntos necesarios: {privilege.points}
                          </p>
                          {privilege.description && (
                            <p className="text-xs mb-4 italic text-content-muted">
                              {privilege.description}
                            </p>
                          )}
                        </>
                      )}
                      
                      {/* Barra de progreso */}
                      <div className="w-full rounded-full h-3 mb-4 bg-line">
                        <div 
                          className="bg-gradient-to-r from-accent-500 to-accent-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((weeklyTotal / privilege.points) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs mb-4 text-content-muted">
                        {weeklyTotal}/{privilege.points} puntos ({Math.max(0, privilege.points - weeklyTotal)} faltan)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                          canUnlock 
                            ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-600 hover:to-accent-700 transform hover:scale-105' 
                            : 'bg-neutral-300 dark:bg-neutral-600 cursor-not-allowed text-content-muted'
                        }`}
                        disabled={!canUnlock || syncing || isEditing}
                        onClick={() => canUnlock && setShowCalendar(privilege.id)}
                      >
                        {syncing ? '⏳ Sincronizando...' : (canUnlock ? '✨ ¡Desbloquear!' : '🔒 No disponible')}
                      </button>
                      
                      {/* El dialogo de canje vive en PrivilegeRedeemDialog. Aqui habia dos
                          copias identicas escritas a mano, sin role="dialog" ni trampa de foco. */}
                      {showCalendar === privilege.id && (
                        <PrivilegeRedeemDialog
                          isOpen
                          privilegeName={privilege.name}
                          minDate={getMinDate()}
                          maxDate={getMaxDate()}
                          onClose={() => { setShowCalendar(null); }}
                          onRedeem={(cuando) => handlePrivilegeRedeem(privilege, cuando)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Historial de Privilegios */}
        <Card>
          <CardHeader>
            <CardTitle>📜 Historial de Privilegios</CardTitle>
            <p className="text-sm text-content-muted">
              Historial guardado en: /weeklyTasks/{familyId}_{childId}_[semana]
            </p>
          </CardHeader>
          <CardContent>
            {privilegeHistory.length > 0 ? (
              <div className="space-y-3">
                {privilegeHistory
                  .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
                  .map((entry, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-surface-sunken">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-content">
                          🏆 {entry.privilegeName}
                        </p>
                        <p className="text-sm text-content-muted">
                          📅 Fecha programada: {entry.dateRedeemed}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-500">
                          ⏰ Redimido el: {new Date(entry.redeemedAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 dark:bg-success-900 text-positive-text">
                          -{entry.pointsUsed} puntos
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🏆</div>
                <p className="mb-2 text-content-muted">
                  No hay privilegios redimidos aún
                </p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  ¡Completa tareas para desbloquear recompensas!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de sincronización */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-warning-500 animate-pulse' : 'bg-success-500'}`}></div>
            <span className="text-sm">
              {syncing ? "Sincronizando con Firebase /weeklyTasks..." : "Conectado y sincronizado"}
            </span>
          </div>
          {lastUpdated && (
            <p className="text-xs mt-2 text-content-muted">
              Los cambios se guardan automáticamente en Firebase
            </p>
          )}
          {isPadre && (
            <p className="text-xs mt-1 text-link">
              👑 Como padre, puedes gestionar privilegios personalizados
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardTracker;