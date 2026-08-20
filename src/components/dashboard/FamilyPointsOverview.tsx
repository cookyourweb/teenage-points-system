import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useFamilyPoints } from '../../hooks/usePointsManagement';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCalendarWeek, faClock } from '@fortawesome/free-solid-svg-icons';

interface FamilyPointsOverviewProps {
  familyId: string;
}

const FamilyPointsOverview: React.FC<FamilyPointsOverviewProps> = ({ familyId }) => {
  const { childrenPoints, loading, error } = useFamilyPoints(familyId);

  const formatLastActivity = (
    timestamp: Date | { toDate: () => Date } | string | number | null | undefined
  ) => {
    if (!timestamp) return 'Nunca';
    
    const date =
      typeof timestamp === 'object' &&
      timestamp !== null &&
      'toDate' in timestamp &&
      typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string | number | Date);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES');
  };

  const getPointsColor = (points: number) => {
    if (points >= 150) return 'text-success-600';
    if (points >= 100) return 'text-primary-600';
    if (points >= 50) return 'text-warning-600';
    return 'text-neutral-600';
  };

  const getPointsIcon = (points: number) => {
    if (points >= 150) return '🏆';
    if (points >= 100) return '🥇';
    if (points >= 50) return '🥈';
    return '📊';
  };

  const getNextPrivilege = (points: number) => {
    if (points >= 200) return '¡Todos los privilegios desbloqueados! 🎉';
    if (points >= 150) return 'Próximo: Día de actividad especial (200 pts)';
    if (points >= 100) return 'Próximo: Comprar juguete pequeño (150 pts)';
    if (points >= 80) return 'Próximo: Ir al cine (100 pts)';
    if (points >= 70) return 'Próximo: Invitar a un amigo (80 pts)';
    if (points >= 60) return 'Próximo: Elegir película familiar (70 pts)';
    if (points >= 50) return 'Próximo: Salida al parque (60 pts)';
    if (points >= 45) return 'Próximo: 1 hora de TV/juegos (50 pts)';
    if (points >= 40) return 'Próximo: Tiempo extra dormir (45 pts)';
    if (points >= 30) return 'Próximo: Elegir postre especial (40 pts)';
    return 'Próximo: 30 min de TV/juegos (30 pts)';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-warning-500" />
            Puntos de la Familia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-neutral-600">Cargando puntos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-warning-500" />
            Puntos de la Familia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-danger-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="text-warning-500" />
          Puntos de la Familia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {childrenPoints.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">No hay datos de puntos disponibles.</p>
            <p className="text-sm text-neutral-500 mt-2">
              Los puntos aparecerán cuando los hijos completen sus tareas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen general */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                    Resumen Semanal
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Semana actual • {childrenPoints.length} hijo{childrenPoints.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    {childrenPoints.reduce((total, child) => total + child.totalWeeklyPoints, 0)}
                  </div>
                  <p className="text-xs text-neutral-500">Puntos totales</p>
                </div>
              </div>
            </div>

            {/* Lista de hijos.

                Hallazgo C2: cada tarjeta era un <div onClick> que navegaba. La
                accion es NAVEGAR, asi que pide un enlace y no un boton: con un
                boton se pierden el clic derecho, el clic central y abrir en
                pestana nueva.

                El patron es el del ENLACE ESTIRADO: el enlace es el nombre del
                hijo, y su zona de clic se extiende con after:inset-0 hasta
                cubrir la tarjeta entera. Asi sigue siendo toda pulsable y el
                nombre accesible queda limpio, en vez de ser el muro de texto de
                la tarjeta completa. */}
            <div className="grid gap-4 md:grid-cols-2">
              {childrenPoints.map((child) => (
                <div
                  key={child.childId}
                  className="relative border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-action focus-within:ring-offset-2"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getPointsIcon(child.totalWeeklyPoints)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">
                          <Link
                            to={`/reward-tracker/${familyId}/${child.childId}`}
                            className="after:absolute after:inset-0 focus-visible:outline-none"
                          >
                            {child.childName || 'Hijo'}
                            {/* El texto visible es el principio del nombre
                                accesible, que es lo que pide WCAG 2.5.3. Con
                                aria-label se perderia. */}
                            <span className="sr-only">, ver su seguimiento de puntos</span>
                          </Link>
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                          {formatLastActivity(child.lastActivity)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getPointsColor(child.totalWeeklyPoints)}`}>
                        {child.totalWeeklyPoints}
                      </div>
                      <p className="text-xs text-neutral-500">puntos</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((child.totalWeeklyPoints / 200) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>

                  {/* Próximo privilegio */}
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {getNextPrivilege(child.totalWeeklyPoints)}
                  </div>

                  {/* Indicador de actividad reciente */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarWeek} className="w-3 h-3 text-neutral-400" />
                      <span className="text-xs text-neutral-500">
                        Semana {child.currentWeekId}
                      </span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      formatLastActivity(child.lastActivity).includes('Ahora') ||
                      formatLastActivity(child.lastActivity).includes('minuto')
                        ? 'bg-success-400'
                        : formatLastActivity(child.lastActivity).includes('hora')
                        ? 'bg-warning-400'
                        : 'bg-neutral-400'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ranking semanal */}
            {childrenPoints.length > 1 && (
              <div className="mt-6 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faTrophy} className="text-warning-500" />
                  Ranking de la Semana
                </h4>
                <div className="space-y-2">
                  {[...childrenPoints]
                    .sort((a, b) => b.totalWeeklyPoints - a.totalWeeklyPoints)
                    .map((child, index) => (
                      <div key={child.childId} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-warning-400 text-warning-900' :
                          index === 1 ? 'bg-neutral-300 text-neutral-700' :
                          index === 2 ? 'bg-warning-400 text-warning-900' :
                          'bg-neutral-200 text-neutral-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {child.childName || 'Hijo'}
                        </span>
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                          {child.totalWeeklyPoints} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FamilyPointsOverview;