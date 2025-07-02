import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { initialPrivileges, initialTasks } from '../../config/rewardConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrophy, 
  faCalendarWeek, 
  faCheckCircle, 
  faTimesCircle,
  faStar,
  faGift,
  faCheckSquare,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { getChildNameById, updateTask } from '../../services/familyService';
import { TasksState } from '../../types/taskTypes';
import { usePointsManagement } from '../../hooks/usePointsManagement';
import { updatePrivilege, getPrivilegeById } from '../../services/privilegesService';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

const ChildView: React.FC = () => {
  const { familyId, childId } = useParams<{ familyId: string; childId: string }>();
  const [selectedPrivilege, setSelectedPrivilege] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Usar el hook de gestión de puntos
  const {
    tasks,
    totalPoints,
    weeklyTotal,
    childName,
    loading,
    error,
    toggleTask,
    isUpdatedByOther
  } = usePointsManagement({
    familyId: familyId!,
    childId: childId!,
    userId: `child-${childId}` // ID especial para el hijo
  });

  const getCompletedTasksForDay = (day: string) => {
    if (!tasks[day]) return { completed: 0, total: 0 };
    
    const diarias = tasks[day].diarias || [];
    const extra = tasks[day].extra || [];
    const allTasks = [...diarias, ...extra];
    
    const completed = allTasks.filter(task => task.completada).length;
    const total = allTasks.length;
    
    return { completed, total };
  };

  const getAvailablePrivileges = () => {
    return initialPrivileges.filter(privilege => weeklyTotal >= privilege.points);
  };

  const getNextPrivilege = () => {
    return initialPrivileges.find(privilege => weeklyTotal < privilege.points);
  };

  const getMotivationalMessage = () => {
    if (weeklyTotal >= 200) return "¡Increíble! Has desbloqueado todos los privilegios 🎉";
    if (weeklyTotal >= 150) return "¡Excelente trabajo! Estás en la cima 🏆";
    if (weeklyTotal >= 100) return "¡Muy bien! Sigues mejorando cada día 🌟";
    if (weeklyTotal >= 50) return "¡Buen trabajo! Vas por buen camino 👍";
    if (weeklyTotal >= 25) return "¡Sigue así! Cada punto cuenta 💪";
    return "¡Empecemos a ganar puntos! Tú puedes hacerlo 🚀";
  };

  // Función para canjear privilegio
  const handleRedeemPrivilege = async (privilege: any, selectedDate: string) => {
    if (!familyId || !childId) return;

    try {
      setIsRedeeming(true);
      
      const newEntry = {
        dateUnlocked: selectedDate,
        unlockedBy: `child-${childId}`,
        childName: childName
      };
      
      const currentPrivilege = await getPrivilegeById(privilege.id);
      const currentHistory = currentPrivilege?.history || [];
      
      await updatePrivilege(privilege.id, {
        unlocked: true,
        history: [...currentHistory, newEntry]
      });
      
      // Notificación especial para privilegios canjeados por el hijo
      toast.success(`🎉 ¡${childName} ha canjeado: ${privilege.name} para ${selectedDate}!`, {
        position: "top-center",
        autoClose: 5000,
        className: "privilege-toast"
      });

      // Enviar notificación al dashboard familiar
      await sendFamilyNotification(privilege, selectedDate);
      
    } catch (error) {
      console.error('Error al canjear privilegio:', error);
      toast.error('Error al canjear privilegio. Inténtalo de nuevo.');
    } finally {
      setIsRedeeming(false);
      setSelectedPrivilege(null);
    }
  };

  // Función para enviar notificación a la familia
  const sendFamilyNotification = async (privilege: any, date: string) => {
    try {
      // Guardar notificación en Firestore para que la vea el dashboard
      const notification = {
        type: 'privilege_redeemed',
        childId,
        childName,
        privilegeName: privilege.name,
        date,
        timestamp: new Date().toISOString(),
        familyId,
        read: false
      };

      // Por ahora guardamos en localStorage, luego migraremos a Firestore
      const existingNotifications = JSON.parse(localStorage.getItem(`family-notifications-${familyId}`) || '[]');
      existingNotifications.unshift(notification);
      localStorage.setItem(`family-notifications-${familyId}`, JSON.stringify(existingNotifications.slice(0, 50))); // Mantener solo las últimas 50
      
    } catch (error) {
      console.error('Error sending family notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Cargando tus puntos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <ToastContainer />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              ¡Hola {childName}!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {getMotivationalMessage()}
            </p>
            {isUpdatedByOther && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Actualizando datos...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Puntos Totales */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="text-center py-8">
            <div className="text-6xl font-bold mb-2">
              {weeklyTotal}
            </div>
            <p className="text-xl opacity-90">Puntos esta semana</p>
            <div className="mt-4 flex justify-center items-center gap-2">
              <FontAwesomeIcon icon={faCalendarWeek} className="text-lg" />
              <span className="text-sm opacity-75">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tareas Interactivas - Solo para hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckSquare} className="text-green-500" />
              Mis Tareas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
              const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
              const todayTasks = tasks[todayCapitalized];
              
              if (!todayTasks) {
                return <p className="text-gray-500">No hay tareas para hoy</p>;
              }

              return (
                <div className="space-y-4">
                  {/* Tareas Diarias */}
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      Tareas Diarias 📋
                    </h4>
                    <div className="grid gap-3">
                      {todayTasks.diarias.map(task => (
                        <div 
                          key={task.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            task.completada 
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                              : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300'
                          }`}
                          onClick={() => toggleTask(todayCapitalized, 'diarias', task.id)}
                        >
                          <div className="flex items-center gap-3">
                            <FontAwesomeIcon 
                              icon={faCheckSquare} 
                              className={`text-2xl ${
                                task.completada ? 'text-green-600' : 'text-gray-400'
                              }`}
                            />
                            <div>
                              <p className={`font-medium ${
                                task.completada 
                                  ? 'text-green-800 dark:text-green-200 line-through' 
                                  : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {task.nombre}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {task.puntos} puntos
                              </p>
                            </div>
                          </div>
                          {task.completada && (
                            <div className="text-green-600 text-xl">✨</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tareas Extra */}
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      Tareas Extra ⭐ (¡Puntos bonus!)
                    </h4>
                    <div className="grid gap-3">
                      {todayTasks.extra.map(task => (
                        <div 
                          key={task.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            task.completada 
                              ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' 
                              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700 hover:border-purple-300'
                          }`}
                          onClick={() => toggleTask(todayCapitalized, 'extra', task.id)}
                        >
                          <div className="flex items-center gap-3">
                            <FontAwesomeIcon 
                              icon={faStar} 
                              className={`text-2xl ${
                                task.completada ? 'text-purple-600' : 'text-yellow-500'
                              }`}
                            />
                            <div>
                              <p className={`font-medium ${
                                task.completada 
                                  ? 'text-purple-800 dark:text-purple-200 line-through' 
                                  : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {task.nombre}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {task.puntos} puntos bonus
                              </p>
                            </div>
                          </div>
                          {task.completada && (
                            <div className="text-purple-600 text-xl">🌟</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Progreso Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarWeek} className="text-blue-500" />
              Mi Progreso de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {diasSemana.map((dia) => {
                const { completed, total } = getCompletedTasksForDay(dia);
                const points = totalPoints[dia] || 0;
                const isToday = new Date().toLocaleDateString('es-ES', { weekday: 'long' })
                  .toLowerCase() === dia.toLowerCase();

                return (
                  <div 
                    key={dia} 
                    className={`text-center p-4 rounded-lg border-2 transition-all ${
                      isToday 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {dia.substring(0, 3)}
                      {isToday && <span className="ml-1 text-blue-500">•</span>}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {points}
                    </div>
                    <div className="text-xs text-gray-500">
                      {completed}/{total} tareas
                    </div>
                    <div className="mt-2">
                      {completed === total && total > 0 ? (
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                      ) : completed > 0 ? (
                        <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
                      ) : (
                        <FontAwesomeIcon icon={faTimesCircle} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Privilegios Disponibles - Interactivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faGift} className="text-purple-500" />
              Mis Privilegios Desbloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAvailablePrivileges().length > 0 ? (
                getAvailablePrivileges().map((privilege, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="text-3xl">🎁</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800 dark:text-green-200">
                        {privilege.name}
                      </h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ¡Ya puedes disfrutarlo!
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPrivilege(privilege)}
                      disabled={isRedeeming}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRedeeming ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        'Canjear'
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-4">🎯</div>
                  <p>¡Sigue completando tareas para desbloquear privilegios!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal para canjear privilegio */}
        {selectedPrivilege && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                🎉 ¡Canjear Privilegio!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ¿Cuándo quieres disfrutar de "{selectedPrivilege.name}"?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleRedeemPrivilege(selectedPrivilege, 'Hoy')}
                  className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🌅 Hoy
                </button>
                <button
                  onClick={() => handleRedeemPrivilege(selectedPrivilege, 'Mañana')}
                  className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  🌤️ Mañana
                </button>
                <button
                  onClick={() => handleRedeemPrivilege(selectedPrivilege, 'Este fin de semana')}
                  className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  🎈 Este fin de semana
                </button>
                <button
                  onClick={() => setSelectedPrivilege(null)}
                  className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resto del componente... (próximo objetivo, estadísticas, etc.) */}
        {getNextPrivilege() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
                Mi Próximo Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">🎯</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {getNextPrivilege()?.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Necesitas {getNextPrivilege()?.points} puntos
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Progreso</span>
                    <span>
                      {weeklyTotal} / {getNextPrivilege()?.points} puntos
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (weeklyTotal / (getNextPrivilege()?.points || 1)) * 100,
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ¡Solo te faltan {(getNextPrivilege()?.points || 0) - weeklyTotal} puntos más!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje de ánimo */}
        <Card className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20">
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¡Sigue así, {childName}!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Cada tarea que completas te acerca más a tus objetivos. 
              ¡Tu familia está orgullosa de tu esfuerzo!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildView;