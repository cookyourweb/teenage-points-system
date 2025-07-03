// src/components/dashboard/ChildView.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { initialPrivileges } from '../../config/rewardConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrophy, 
  faCalendarWeek, 
  faCheckCircle, 
  faTimesCircle,
  faStar,
  faGift,
  faCheckSquare,
  faSpinner,
  faFireFlameCurved,
  faHeart,
  faMagic
} from '@fortawesome/free-solid-svg-icons';
import { usePointsManagement } from '../../hooks/usePointsManagement';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

const ChildView: React.FC = () => {
  const { familyId, childId } = useParams<{ familyId: string; childId: string }>();
  const [selectedPrivilege, setSelectedPrivilege] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [celebratingTask, setCelebratingTask] = useState<string | null>(null);

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Usar el hook de gestión de puntos
  const {
    tasks,
    customTasks,
    totalPoints,
    weeklyTotal,
    childName,
    loading,
    error,
    toggleTask,
    syncStatus
  } = usePointsManagement({
    familyId: familyId!,
    childId: childId!,
    userId: `child-${childId}` // ID especial para el hijo
  });

  // Función para obtener tareas completadas del día
  const getCompletedTasksForDay = (day: string) => {
    if (!tasks[day]) return { completed: 0, total: 0 };
    
    const diarias = tasks[day].diarias || [];
    const extra = tasks[day].extra || [];
    const allTasks = [...diarias, ...extra];
    
    const completed = allTasks.filter(task => task.completada).length;
    const total = allTasks.length;
    
    return { completed, total };
  };

  // Función para obtener privilegios disponibles
  const getAvailablePrivileges = () => {
    return initialPrivileges.filter(privilege => weeklyTotal >= privilege.points);
  };

  // Función para obtener el próximo privilegio
  const getNextPrivilege = () => {
    return initialPrivileges.find(privilege => weeklyTotal < privilege.points);
  };

  // Función para obtener mensaje motivacional
  const getMotivationalMessage = () => {
    if (weeklyTotal >= 200) return "¡Increíble! Has desbloqueado todos los privilegios 🎉";
    if (weeklyTotal >= 150) return "¡Excelente trabajo! Estás en la cima 🏆";
    if (weeklyTotal >= 100) return "¡Muy bien! Sigues mejorando cada día 🌟";
    if (weeklyTotal >= 50) return "¡Buen trabajo! Vas por buen camino 👍";
    if (weeklyTotal >= 25) return "¡Sigue así! Cada punto cuenta 💪";
    return "¡Empecemos a ganar puntos! 🚀";
  };

  // Función para alternar tarea con celebración
  const handleToggleTask = async (dia: string, tipo: 'diarias' | 'extra', taskId: string) => {
    const task = tasks[dia]?.[tipo]?.find(t => t.id === taskId);
    if (!task) return;

    const wasCompleted = task.completada;
    const isCustomTask = customTasks.some(ct => ct.id === taskId);
    
    try {
      await toggleTask(dia, tipo, taskId, isCustomTask);
      
      // Si se completó la tarea, mostrar celebración
      if (!wasCompleted) {
        setCelebratingTask(taskId);
        
        // Mensaje especial dependiendo del tipo de tarea
        const celebrationMessage = isCustomTask 
          ? `✨ ¡Tarea especial completada! +${task.puntos} puntos` 
          : tipo === 'extra'
          ? `🌟 ¡Tarea extra completada! +${task.puntos} puntos`
          : `✅ ¡Bien hecho! +${task.puntos} puntos`;
        
        toast.success(celebrationMessage, {
          position: "top-center",
          autoClose: 3000,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '16px',
            borderRadius: '12px'
          }
        });

        // Quitar celebración después de 2 segundos
        setTimeout(() => {
          setCelebratingTask(null);
        }, 2000);

        // Verificar si desbloqueó un nuevo privilegio
        const newTotal = weeklyTotal + task.puntos;
        checkPrivilegeUnlock(newTotal, task.puntos);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  // Verificar si se desbloqueó un privilegio
  const checkPrivilegeUnlock = (newTotal: number, addedPoints: number) => {
    const oldTotal = newTotal - addedPoints;
    
    initialPrivileges.forEach(privilege => {
      if (newTotal >= privilege.points && oldTotal < privilege.points) {
        toast.success(`🎉 ¡PRIVILEGIO DESBLOQUEADO! ${privilege.name}`, {
          position: "top-center",
          autoClose: 5000,
          style: {
            background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
            color: '#2d3436',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '15px'
          }
        });
      }
    });
  };

  // Función para redimir privilegio
  const handlePrivilegeRedeem = async (privilege: any, date: string) => {
    if (weeklyTotal < privilege.points || isRedeeming) return;

    setIsRedeeming(true);
    try {
      // Aquí simularemos la redención - en una implementación real sería más compleja
      toast.success(`🎉 ¡Privilegio "${privilege.name}" programado para ${date}!`, {
        position: "top-center",
        autoClose: 5000,
        style: {
          background: 'linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%)',
          color: '#27ae60',
          fontSize: '16px',
          fontWeight: 'bold',
          borderRadius: '12px'
        }
      });
      
      setSelectedPrivilege(null);
    } catch (error) {
      toast.error('Error al redimir privilegio. Inténtalo de nuevo.');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-300 border-t-blue-600 mx-auto mb-4"></div>
            <FontAwesomeIcon icon={faHeart} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-xl animate-pulse" />
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">Cargando tus puntos...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">¡Preparando algo genial! ✨</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Ups! Algo salió mal</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-500 text-sm">Pídele a papá o mamá que revise la conexión</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <ToastContainer />
      
      {/* Header Atractivo */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              ¡Hola {childName}! 👋
            </h1>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 inline-block">
              <p className="text-2xl md:text-3xl font-bold mb-2">
                {weeklyTotal} puntos esta semana
              </p>
              <p className="text-lg opacity-90">{getMotivationalMessage()}</p>
            </div>
            
            {/* Indicador de sincronización bonito */}
            <div className="mt-4 flex justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                syncStatus === 'synced' ? 'bg-green-500/20 text-green-100' :
                syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-100' :
                'bg-red-500/20 text-red-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-green-400' :
                  syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`}></div>
                {syncStatus === 'synced' ? '✨ Actualizado' :
                 syncStatus === 'syncing' ? '🔄 Sincronizando...' :
                 '⚠️ Problema de conexión'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progreso Semanal Visual */}
        <Card className="mb-8 bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
              <FontAwesomeIcon icon={faCalendarWeek} className="text-blue-500" />
              Tu Semana Genial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {diasSemana.map((dia, index) => {
                const { completed, total } = getCompletedTasksForDay(dia);
                const percentage = total > 0 ? (completed / total) * 100 : 0;
                const dayPoints = totalPoints[dia] || 0;
                
                return (
                  <div key={dia} className="text-center">
                    <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3 text-2xl font-bold transition-all duration-300 transform hover:scale-105 ${
                      percentage === 100 
                        ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg' 
                        : percentage > 50
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg'
                        : percentage > 0
                        ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                    }`}>
                      {percentage === 100 ? '🎉' : percentage > 0 ? '⭐' : '📝'}
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {dia.slice(0, 3)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {completed}/{total} tareas
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {dayPoints} pts
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tareas de Hoy */}
        <Card className="mb-8 bg-gradient-to-r from-white to-green-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <FontAwesomeIcon icon={faCheckSquare} className="text-green-500" />
              Tus Tareas de Hoy
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const today = diasSemana[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
              const todayTasks = tasks[today];
              
              if (!todayTasks) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-gray-500">No hay tareas para hoy</p>
                  </div>
                );
              }

              const allTasks = [...todayTasks.diarias, ...todayTasks.extra];
              
              return (
                <div className="grid gap-4 md:grid-cols-2">
                  {allTasks.map((task) => {
                    const isCustom = customTasks.some(ct => ct.id === task.id);
                    const isCelebrating = celebratingTask === task.id;
                    
                    return (
                      <div
                        key={task.id}
                        className={`border-2 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                          task.completada
                            ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-300 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-600'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-purple-300'
                        } ${isCelebrating ? 'animate-pulse ring-4 ring-purple-300' : ''}`}
                        onClick={() => handleToggleTask(today, task.tipo, task.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {isCustom && <span className="text-lg">✨</span>}
                              {task.tipo === 'extra' && !isCustom && <span className="text-lg">⭐</span>}
                              <div>
                                <h4 className={`font-semibold ${task.completada ? 'line-through text-green-700' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {task.nombre}
                                </h4>
                                <p className={`text-sm ${task.completada ? 'text-green-600' : 'text-purple-600'}`}>
                                  {task.puntos} puntos {isCustom ? '(Especial)' : task.tipo === 'extra' ? '(Extra)' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                            task.completada
                              ? 'bg-green-500 text-white transform scale-110'
                              : 'bg-gray-200 dark:bg-gray-600 hover:bg-purple-200 dark:hover:bg-purple-600'
                          }`}>
                            {task.completada ? '✅' : '⭕'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Privilegios Disponibles */}
        <Card className="mb-8 bg-gradient-to-r from-white to-yellow-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <FontAwesomeIcon icon={faGift} className="text-yellow-500" />
              ¡Tus Recompensas!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {initialPrivileges.map((privilege, index) => {
                const canUnlock = weeklyTotal >= privilege.points;
                const progress = Math.min((weeklyTotal / privilege.points) * 100, 100);
                
                return (
                  <div
                    key={index}
                    className={`border-2 rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105 ${
                      canUnlock
                        ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 cursor-pointer hover:shadow-xl'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                    onClick={() => canUnlock && setSelectedPrivilege(privilege)}
                  >
                    <div className="text-4xl mb-3">
                      {canUnlock ? '🎉' : '🏆'}
                    </div>
                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">
                      {privilege.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {privilege.points} puntos necesarios
                    </p>
                    
                    {/* Barra de progreso bonita */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          canUnlock
                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                            : 'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {weeklyTotal}/{privilege.points} puntos ({Math.max(0, privilege.points - weeklyTotal)} faltan)
                    </p>
                    
                    <button
                      className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                        canUnlock
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:scale-105 shadow-lg'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!canUnlock}
                    >
                      {canUnlock ? '🎉 ¡Desbloquear!' : '🔒 Sigue así'}
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Próximo Objetivo */}
        {(() => {
          const nextPrivilege = getNextPrivilege();
          if (!nextPrivilege) return null;
          
          const pointsNeeded = nextPrivilege.points - weeklyTotal;
          
          return (
            <Card className="mb-8 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 shadow-xl">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-2">
                    ¡Tu Próximo Objetivo!
                  </h3>
                  <p className="text-lg text-purple-600 dark:text-purple-300 mb-4">
                    <strong>{nextPrivilege.name}</strong>
                  </p>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 inline-block">
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      ¡Solo {pointsNeeded} puntos más! 💪
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Modal de Redención de Privilegio */}
      {selectedPrivilege && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                ¡Vas a desbloquear!
              </h3>
              <h4 className="text-xl text-purple-600 dark:text-purple-400 mb-6">
                {selectedPrivilege.name}
              </h4>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handlePrivilegeRedeem(selectedPrivilege, 'Hoy')}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                  disabled={isRedeeming}
                >
                  🕐 ¡Quiero usarlo HOY!
                </button>
                <button
                  onClick={() => handlePrivilegeRedeem(selectedPrivilege, 'Mañana')}
                  className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                  disabled={isRedeeming}
                >
                  🌅 ¡Mañana!
                </button>
                <button
                  onClick={() => handlePrivilegeRedeem(selectedPrivilege, 'Este fin de semana')}
                  className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105"
                  disabled={isRedeeming}
                >
                  🎉 ¡Este fin de semana!
                </button>
              </div>

              <button
                onClick={() => setSelectedPrivilege(null)}
                className="w-full p-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
                disabled={isRedeeming}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildView;