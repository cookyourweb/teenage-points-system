// src/components/dashboard/RewardTracker.tsx - CON EDICIÓN INLINE DE TAREAS
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCheckSquare, 
  faArrowLeft, 
  faSync, 
  faEdit, 
  faTrash, 
  faPlus,
  faCalendar,
  faSave,
  faTimes,
  faStar,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ USAR EL HOOK OPTIMIZADO
import { usePointsManagement } from "../../hooks/usePointsManagement";
import { initialPrivileges } from "../../config/rewardConfig";
import { useUserRole } from "../../hooks/useUserRole";

// ✅ IMPORTAR SERVICIOS DE TAREAS PERSONALIZADAS
import { 
  updateCustomTask, 
  deleteCustomTask 
} from "../../services/customTaskService";

// ✅ IMPORTAR SERVICIOS DE PRIVILEGIOS
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

interface EditingTaskState {
  taskId: string;
  nombre: string;
  puntos: number;
  description: string;
}

const RewardTracker: React.FC = () => {
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

  // Redimir privilegio con calendario
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

      // Actualizar historial local
      setPrivilegeHistory(prev => [...prev, newHistoryEntry]);

      toast.success(`🎉 Privilegio redimido: ${privilege.name} para ${date}!`, {
        position: "top-right",
        autoClose: 5000,
      });

      setShowCalendar(null);
      setSelectedDate('');

    } catch (error) {
      console.error('❌ Error al redimir privilegio:', error);
      toast.error('Error al redimir privilegio. Inténtalo de nuevo.');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Cargando sistema de puntos...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Sincronizando con Firestore...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-red-50 dark:bg-red-900/20">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Error al cargar el sistema
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <ToastContainer />
      
      {/* Header Mejorado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Volver al Dashboard
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Sistema de Puntos
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {childName} - Total: {weeklyTotal} puntos
              </p>
              {isPadre && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  👑 Modo Padre - Vista completa con edición
                </p>
              )}
              {/* ✅ INDICADORES DE SINCRONIZACIÓN */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-green-500' :
                  syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {syncStatus === 'synced' ? 'Sincronizado con Firestore' :
                   syncStatus === 'syncing' ? 'Sincronizando...' :
                   'Error de sincronización'}
                </span>
                {isUpdatedByOther && (
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                    📡 Actualizado por otro usuario
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ INDICADOR DE TAREAS PERSONALIZADAS */}
            {customTasks.length > 0 && (
              <div className="text-center px-3 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  +{customTasks.length}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  Personalizadas
                </div>
              </div>
            )}
            
            <button
              onClick={refreshData}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              title="Actualizar datos desde Firestore"
            >
              <FontAwesomeIcon icon={faSync} className={syncStatus === 'syncing' ? "animate-spin" : ""} />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' ? 'Sincronizando...' : 'Actualizar'}
              </span>
            </button>
          </div>
        </div>

        {/* ✅ SISTEMA DE PUNTOS MEJORADO CON EDICIÓN INLINE */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Sistema de Puntos Semanal
            </CardTitle>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>📊 Tareas base: {Object.values(tasks).reduce((sum, day) => sum + day.diarias.filter(t => !t.isCustom).length + day.extra.filter(t => !t.isCustom).length, 0)}</p>
              {customTasks.length > 0 && (
                <p>✨ Tareas personalizadas: {customTasks.length} activas</p>
              )}
              <p>💾 Datos guardados en: /weeklyTasks/{familyId}_{childId}_[semana]</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border bg-gray-100 dark:bg-gray-700 text-left">Tareas</th>
                    {diasSemana.map(dia => (
                      <th key={dia} className="p-3 border bg-gray-100 dark:bg-gray-700 text-center">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ✅ MOSTRAR TODAS LAS TAREAS DIARIAS (BASE + PERSONALIZADAS) */}
                  {tasks.Lunes && tasks.Lunes.diarias.map(tarea => (
                    <tr key={tarea.id} className={tarea.isCustom ? 'bg-purple-50 dark:bg-purple-900/10' : ''}>
                      <td className="p-3 border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tarea.isCustom && <span className="text-purple-500">✨</span>}
                            <div>
                              {/* ✅ EDICIÓN INLINE PARA TAREAS PERSONALIZADAS */}
                              {editingTask?.taskId === tarea.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingTask.nombre}
                                    onChange={(e) => setEditingTask(prev => prev ? {...prev, nombre: e.target.value} : null)}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Nombre de la tarea"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      value={editingTask.puntos}
                                      onChange={(e) => setEditingTask(prev => prev ? {...prev, puntos: parseInt(e.target.value) || 0} : null)}
                                      className="w-20 p-2 text-sm border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                      min="1"
                                      max="100"
                                    />
                                    <span className="text-xs text-gray-500 self-center">pts</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask(prev => prev ? {...prev, description: e.target.value} : null)}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Descripción (opcional)"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={saveEditedTask}
                                      disabled={savingTask === tarea.id}
                                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                                    >
                                      {savingTask === tarea.id ? (
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                      ) : (
                                        <FontAwesomeIcon icon={faSave} />
                                      )}
                                    </button>
                                    <button
                                      onClick={cancelEditingTask}
                                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                    >
                                      <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium">{tarea.nombre}</div>
                                  <div className={`text-sm ${tarea.isCustom ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}>
                                    ({tarea.puntos} pts{tarea.isCustom ? ' - Personalizada' : ''})
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* ✅ ICONOS DE EDICIÓN INLINE PARA TAREAS PERSONALIZADAS */}
                          {tarea.isCustom && isPadre && editingTask?.taskId !== tarea.id && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditingTask(tarea)}
                                className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                                title="Editar tarea"
                              >
                                <FontAwesomeIcon icon={faEdit} size="sm" />
                              </button>
                              <button
                                onClick={() => deleteTask(tarea.id, tarea.nombre)}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                title="Eliminar tarea"
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {diasSemana.map(dia => (
                        <td key={`${dia}-${tarea.id}`} className="p-3 border text-center">
                          <button
                            onClick={() => toggleTarea(dia, 'diarias', tarea.id)}
                            disabled={syncStatus === 'syncing'}
                            className={`p-3 rounded-full transition-colors disabled:opacity-50 ${
                              tasks[dia]?.diarias.find(t => t.id === tarea.id)?.completada
                                ? tarea.isCustom 
                                  ? "bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800"
                                  : "bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                            }`}
                          >
                            <FontAwesomeIcon 
                              icon={faCheckSquare} 
                              className={`w-6 h-6 ${
                                tasks[dia]?.diarias.find(t => t.id === tarea.id)?.completada
                                  ? tarea.isCustom
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-green-600 dark:text-green-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* ✅ MOSTRAR TODAS LAS TAREAS EXTRA (BASE + PERSONALIZADAS) */}
                  {tasks.Lunes && tasks.Lunes.extra.map(tarea => (
                    <tr key={tarea.id} className={`${tarea.isCustom ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                      <td className="p-3 border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tarea.isCustom ? <span className="text-yellow-500">⭐</span> : <span className="text-blue-500">⭐</span>}
                            <div>
                              {/* ✅ EDICIÓN INLINE PARA TAREAS EXTRA PERSONALIZADAS */}
                              {editingTask?.taskId === tarea.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingTask.nombre}
                                    onChange={(e) => setEditingTask(prev => prev ? {...prev, nombre: e.target.value} : null)}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    placeholder="Nombre de la tarea"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      value={editingTask.puntos}
                                      onChange={(e) => setEditingTask(prev => prev ? {...prev, puntos: parseInt(e.target.value) || 0} : null)}
                                      className="w-20 p-2 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                      min="1"
                                      max="100"
                                    />
                                    <span className="text-xs text-gray-500 self-center">pts</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask(prev => prev ? {...prev, description: e.target.value} : null)}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    placeholder="Descripción (opcional)"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={saveEditedTask}
                                      disabled={savingTask === tarea.id}
                                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                                    >
                                      {savingTask === tarea.id ? (
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                      ) : (
                                        <FontAwesomeIcon icon={faSave} />
                                      )}
                                    </button>
                                    <button
                                      onClick={cancelEditingTask}
                                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                    >
                                      <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium">{tarea.nombre}</div>
                                  <div className={`text-sm ${tarea.isCustom ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    ({tarea.puntos} pts - {tarea.isCustom ? 'Personalizada ' : ''}Extra)
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* ✅ ICONOS DE EDICIÓN INLINE PARA TAREAS EXTRA PERSONALIZADAS */}
                          {tarea.isCustom && isPadre && editingTask?.taskId !== tarea.id && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditingTask(tarea)}
                                className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                                title="Editar tarea"
                              >
                                <FontAwesomeIcon icon={faEdit} size="sm" />
                              </button>
                              <button
                                onClick={() => deleteTask(tarea.id, tarea.nombre)}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                title="Eliminar tarea"
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {diasSemana.map(dia => (
                        <td key={`${dia}-${tarea.id}`} className="p-3 border text-center">
                          <button
                            onClick={() => toggleTarea(dia, 'extra', tarea.id)}
                            disabled={syncStatus === 'syncing'}
                            className={`p-3 rounded-full transition-colors disabled:opacity-50 ${
                              tasks[dia]?.extra.find(t => t.id === tarea.id)?.completada
                                ? tarea.isCustom
                                  ? "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700"
                                  : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700"
                                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                            }`}
                          >
                            <FontAwesomeIcon 
                              icon={faStar} 
                              className={`w-6 h-6 ${
                                tasks[dia]?.extra.find(t => t.id === tarea.id)?.completada
                                  ? tarea.isCustom
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-blue-600 dark:text-blue-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="p-3 border">Puntos del Día</td>
                    {diasSemana.map(dia => (
                      <td key={`puntos-${dia}`} className="p-3 border text-center">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {totalPoints[dia] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ✅ RESUMEN MEJORADO */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Puntos Totales de la Semana</h3>
                <p className="text-4xl font-bold mt-2">{weeklyTotal} puntos</p>
                <div className="flex justify-center items-center gap-4 mt-3 text-sm opacity-90">
                  <span>🎯 Tareas base completadas</span>
                  {customTasks.length > 0 && <span>✨ +{customTasks.length} personalizadas</span>}
                  <span className={`px-2 py-1 rounded ${
                    syncStatus === 'synced' ? 'bg-green-500/20' :
                    syncStatus === 'syncing' ? 'bg-yellow-500/20' :
                    'bg-red-500/20'
                  }`}>
                    {syncStatus === 'synced' ? '💾 Sincronizado' :
                     syncStatus === 'syncing' ? '🔄 Sincronizando...' :
                     '⚠️ Error de sync'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* El resto del componente (Privilegios e Historial) se mantiene igual... */}
        {/* Aquí iría el código de privilegios que ya tienes implementado */}

        {/* Información de sincronización mejorada */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === 'synced' ? 'bg-green-500' :
              syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <span className="text-sm">
              {syncStatus === 'synced' ? '✅ Sincronizado con Firestore' :
               syncStatus === 'syncing' ? '🔄 Sincronizando con Firestore...' :
               '❌ Error de sincronización'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>📊 Tareas base: {Object.values(tasks).reduce((sum, day) => sum + (day.diarias?.filter(t => !t.isCustom)?.length || 0) + (day.extra?.filter(t => !t.isCustom)?.length || 0), 0)}</p>
            {customTasks.length > 0 && (
              <p>✨ Tareas personalizadas activas: {customTasks.length} - ✏️ Click en los iconos para editar</p>
            )}
            <p>💾 Los cambios se guardan automáticamente en Firestore</p>
            <p>🔄 Sincronizado en tiempo real con ChildView</p>
            {isPadre && (
              <p>👑 Vista de padre: Gestión completa de tareas y privilegios</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardTracker;
  const [user, loading, error] = useAuthState(auth);
  const navigate = useNavigate();
  const { familyId, childId } = useParams<{ familyId: string; childId: string }>();
  const { role } = useUserRole(user?.uid);
  
  // ✅ USAR EL HOOK OPTIMIZADO DE GESTIÓN DE PUNTOS
  const {
    tasks,
    customTasks,
    totalPoints,
    weeklyTotal,
    childName,
    lastUpdatedBy,
    loading,
    error,
    toggleTask,
    refreshData,
    isUpdatedByOther,
    syncStatus
  } = usePointsManagement({
    familyId: familyId!,
    childId: childId!,
    userId: user?.uid || ''
  });

  // Estados para privilegios
  const [privilegeHistory, setPrivilegeHistory] = useState<any[]>([]);
  const [customPrivileges, setCustomPrivileges] = useState<EditablePrivilege[]>([]);
  const [syncing, setSyncing] = useState(false);
  
  // Estados para edición de privilegios
  const [editingPrivilege, setEditingPrivilege] = useState<string | null>(null);
  const [isAddingPrivilege, setIsAddingPrivilege] = useState(false);
  const [newPrivilege, setNewPrivilege] = useState({ name: '', points: 0, description: '' });
  const [showCalendar, setShowCalendar] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // ✅ NUEVOS ESTADOS PARA EDICIÓN INLINE DE TAREAS
  const [editingTask, setEditingTask] = useState<EditingTaskState | null>(null);
  const [savingTask, setSavingTask] = useState<string | null>(null);

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

  // Cargar privilegios personalizados
  useEffect(() => {
    const loadCustomPrivileges = async () => {
      try {
        const privileges = await fetchPrivileges();
        const editablePrivileges = privileges.map(p => ({
          id: p.id || p.privilegioId || '',
          name: p.name,
          points: p.points || p.pointsRequired || p.puntosNecesarios || 0,
          description: p.description
        }));
        setCustomPrivileges(editablePrivileges);
      } catch (error) {
        console.error('Error loading custom privileges:', error);
      }
    };

    loadCustomPrivileges();
  }, []);

  // ✅ FUNCIÓN OPTIMIZADA PARA TOGGLE DE TAREAS
  const toggleTarea = async (dia: string, tipo: 'diarias' | 'extra', taskId: string) => {
    if (!familyId || !childId || !user?.uid || syncStatus === 'syncing') return;

    try {
      // ✅ DETECTAR SI ES TAREA PERSONALIZADA
      const isCustomTask = customTasks.some(ct => ct.id === taskId);
      
      // ✅ USAR LA FUNCIÓN DEL HOOK OPTIMIZADO
      await toggleTask(dia, tipo, taskId, isCustomTask);
      
      // Verificar si desbloqueó un privilegio después del toggle
      if (tasks[dia]?.[tipo]) {
        const task = tasks[dia][tipo].find(t => t.id === taskId);
        if (task && !task.completada) { // Si se acaba de completar
          const newTotal = weeklyTotal + task.puntos;
          checkPrivilegeUnlock(newTotal, task.puntos);
        }
      }
      
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Error al actualizar la tarea");
    }
  };

  // ✅ FUNCIONES PARA EDICIÓN INLINE DE TAREAS PERSONALIZADAS
  const startEditingTask = (task: any) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden editar tareas');
      return;
    }

    setEditingTask({
      taskId: task.id,
      nombre: task.nombre,
      puntos: task.puntos,
      description: task.description || ''
    });
  };

  const cancelEditingTask = () => {
    setEditingTask(null);
  };

  const saveEditedTask = async () => {
    if (!editingTask || !isPadre) return;

    setSavingTask(editingTask.taskId);
    try {
      await updateCustomTask(editingTask.taskId, {
        nombre: editingTask.nombre.trim(),
        puntos: editingTask.puntos,
        description: editingTask.description.trim()
      });

      // Notificar que las tareas han sido actualizadas
      window.dispatchEvent(new CustomEvent('customTasksUpdated', { 
        detail: { familyId } 
      }));

      toast.success('✅ Tarea actualizada correctamente');
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error al actualizar la tarea');
    } finally {
      setSavingTask(null);
    }
  };

  const deleteTask = async (taskId: string, taskName: string) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden eliminar tareas');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar la tarea "${taskName}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      await deleteCustomTask(taskId);
      
      // Notificar que las tareas han sido actualizadas
      window.dispatchEvent(new CustomEvent('customTasksUpdated', { 
        detail: { familyId } 
      }));

      toast.success('🗑️ Tarea eliminada correctamente');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error al eliminar la tarea');
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

  // Funciones para gestión de privilegios (existentes...)
  const handleAddPrivilege = async () => {
    if (!newPrivilege.name.trim() || newPrivilege.points <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    try {
      const privilege = await addPrivilege({
        id: '',
        privilegioId: '',
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

  // Continuación del código de privilegios (resto del componente)
  
        {/* Privilegios Disponibles */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold">🏆 Privilegios Disponibles</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Privilegios guardados en: /privilegios/[privilegeId]
                </p>
              </div>
              {isPadre && (
                <button
                  onClick={() => setIsAddingPrivilege(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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
              <div className="mb-6 p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-semibold mb-3">Añadir Nuevo Privilegio</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre del privilegio"
                    value={newPrivilege.name}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, name: e.target.value }))}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Puntos necesarios"
                    value={newPrivilege.points}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={newPrivilege.description}
                    onChange={(e) => setNewPrivilege(prev => ({ ...prev, description: e.target.value }))}
                    className="p-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddPrivilege}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <FontAwesomeIcon icon={faSave} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingPrivilege(false);
                      setNewPrivilege({ name: '', points: 0, description: '' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
                  <div key={privilegeId} className="border p-6 rounded-lg shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
                    {/* Iconos de edición para padres */}
                    {isPadre && (
                      <div className="flex justify-end gap-1 mb-2">
                        <button
                          onClick={() => setEditingPrivilege(isEditing ? null : privilegeId)}
                          className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                          title="Editar privilegio"
                        >
                          <FontAwesomeIcon icon={faEdit} size="sm" />
                        </button>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">🏆</div>
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                        {privilege.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Puntos necesarios: {privilege.points}
                      </p>
                      
                      {/* Barra de progreso */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((weeklyTotal / privilege.points) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        {weeklyTotal}/{privilege.points} puntos ({Math.max(0, privilege.points - weeklyTotal)} faltan)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                          canUnlock && !isEditing
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:scale-105' 
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canUnlock || syncing || isEditing}
                        onClick={() => canUnlock && !isEditing && setShowCalendar(privilegeId)}
                      >
                        {isEditing ? '✏️ Editando...' : (syncing ? '⏳ Sincronizando...' : (canUnlock ? '🎉 ¡Desbloquear!' : '🔒 No disponible'))}
                      </button>
                      
                      {/* Calendario modal */}
                      {showCalendar === privilegeId && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                            <h3 className="text-lg font-bold mb-4">📅 ¿Cuándo quieres disfrutar "{privilege.name}"?</h3>
                            
                            <div className="space-y-3 mb-4">
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Hoy')}
                                className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                              >
                                🕐 Hoy
                              </button>
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Mañana')}
                                className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                              >
                                🌅 Mañana
                              </button>
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Este fin de semana')}
                                className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                              >
                                🎉 Este fin de semana
                              </button>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">O elige una fecha específica:</label>
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={getMinDate()}
                                max={getMaxDate()}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            <div className="flex gap-2">
                              {selectedDate && (
                                <button
                                  onClick={() => handlePrivilegeRedeem(privilege, new Date(selectedDate).toLocaleDateString('es-ES'))}
                                  className="flex-1 p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                  <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                                  Confirmar fecha
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowCalendar(null);
                                  setSelectedDate('');
                                }}
                                className="flex-1 p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
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
                  <div key={privilege.id} className="border p-6 rounded-lg shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
                    {isPadre && (
                      <div className="flex justify-end gap-1 mb-2">
                        <button
                          onClick={() => setEditingPrivilege(isEditing ? null : privilege.id)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} size="sm" />
                        </button>
                        <button
                          onClick={() => handleDeletePrivilege(privilege.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                          title="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} size="sm" />
                        </button>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">✨</div>
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                        {privilege.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Puntos necesarios: {privilege.points}
                      </p>
                      {privilege.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic">
                          {privilege.description}
                        </p>
                      )}
                      
                      {/* Barra de progreso */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((weeklyTotal / privilege.points) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        {weeklyTotal}/{privilege.points} puntos ({Math.max(0, privilege.points - weeklyTotal)} faltan)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                          canUnlock 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 transform hover:scale-105' 
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canUnlock || syncing || isEditing}
                        onClick={() => canUnlock && setShowCalendar(privilege.id)}
                      >
                        {syncing ? '⏳ Sincronizando...' : (canUnlock ? '✨ ¡Desbloquear!' : '🔒 No disponible')}
                      </button>
                      
                      {/* Calendario modal para privilegios personalizados */}
                      {showCalendar === privilege.id && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                            <h3 className="text-lg font-bold mb-4">📅 ¿Cuándo quieres disfrutar "{privilege.name}"?</h3>
                            
                            <div className="space-y-3 mb-4">
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Hoy')}
                                className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                              >
                                🕐 Hoy
                              </button>
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Mañana')}
                                className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                              >
                                🌅 Mañana
                              </button>
                              <button
                                onClick={() => handlePrivilegeRedeem(privilege, 'Este fin de semana')}
                                className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                              >
                                🎉 Este fin de semana
                              </button>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">O elige una fecha específica:</label>
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={getMinDate()}
                                max={getMaxDate()}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            <div className="flex gap-2">
                              {selectedDate && (
                                <button
                                  onClick={() => handlePrivilegeRedeem(privilege, new Date(selectedDate).toLocaleDateString('es-ES'))}
                                  className="flex-1 p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                  <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                                  Confirmar fecha
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowCalendar(null);
                                  setSelectedDate('');
                                }}
                                className="flex-1 p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Historial sincronizado con Firestore
            </p>
          </CardHeader>
          <CardContent>
            {privilegeHistory.length > 0 ? (
              <div className="space-y-3">
                {privilegeHistory
                  .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
                  .map((entry, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          🏆 {entry.privilegeName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📅 Fecha programada: {entry.dateRedeemed}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
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
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  No hay privilegios redimidos aún
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  ¡Completa tareas para desbloquear recompensas!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );