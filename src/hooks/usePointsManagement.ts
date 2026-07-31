// src/hooks/usePointsManagement.ts - CON AUTO-REFRESH DE TAREAS PERSONALIZADAS
import { useState, useEffect, useCallback } from 'react';
import { TasksState } from '../types/taskTypes';
import { getChildNameById } from '../services/familyService';
import { initialTasks } from '../config/rewardConfig';
import { toast } from 'react-toastify';

// ✅ IMPORTAR DESDE customTaskService
import { CustomTask, getActiveTasksByFamily } from '../services/customTaskService';

// ✅ IMPORTAR SERVICIOS DE FIRESTORE
import { 
  saveWeeklyTasks, 
  getWeeklyTasks, 
  updateTask 
} from '../services/familyService';

// Interfaces
interface ChildPoints {
  childId: string;
  childName: string;
  totalWeeklyPoints: number;
  currentWeekId: string;
  lastActivity: Date | null;
}

interface UsePointsManagementProps {
  familyId: string;
  childId: string;
  userId: string;
}

interface UsePointsManagementReturn {
  // Estados principales
  tasks: TasksState;
  customTasks: CustomTask[];
  totalPoints: { [key: string]: number };
  weeklyTotal: number;
  childName: string;
  lastUpdatedBy: string;
  loading: boolean;
  error: string | null;
  
  // Funciones para interactuar
  toggleTask: (dia: string, tipo: 'diarias' | 'extra', taskId: string, isCustom?: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Datos de tiempo real
  isUpdatedByOther: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';
}

export const usePointsManagement = ({ 
  familyId, 
  childId, 
  userId 
}: UsePointsManagementProps): UsePointsManagementReturn => {
  const [tasks, setTasks] = useState<TasksState>({});
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [totalPoints, setTotalPoints] = useState<{ [key: string]: number }>({});
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [childName, setChildName] = useState('Hijo');
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatedByOther, setIsUpdatedByOther] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Obtener nombre del hijo
  useEffect(() => {
    const fetchChildName = async () => {
      if (!familyId || !childId) return;
      
      try {
        const name = await getChildNameById(familyId, childId);
        setChildName(name || 'Hijo');
      } catch (err) {
        console.error('Error fetching child name:', err);
        setChildName('Hijo');
      }
    };

    fetchChildName();
  }, [familyId, childId]);

  // ✅ CARGAR TAREAS PERSONALIZADAS CON RETRY
  const loadCustomTasks = useCallback(async (retryCount = 0) => {
    if (!familyId) return [];
    
    try {
      const customTasksData = await getActiveTasksByFamily(familyId);
      setCustomTasks(customTasksData);
      return customTasksData;
    } catch (err) {
      console.error('Error loading custom tasks:', err);
      
      // ✅ RETRY AUTOMÁTICO EN CASO DE ERROR
      if (retryCount < 2) {
        console.log(`🔄 Reintentando cargar tareas personalizadas (intento ${retryCount + 1})`);
        setTimeout(() => loadCustomTasks(retryCount + 1), 1000);
        return [];
      }
      
      // Si falla después de 2 intentos, usar array vacío
      console.warn('⚠️ No se pudieron cargar las tareas personalizadas, usando solo tareas base');
      setCustomTasks([]);
      return [];
    }
  }, [familyId]);

  // Crear estructura de tareas combinando iniciales y personalizadas
  const createCombinedTasks = useCallback((customTasksData: CustomTask[]) => {
    const combinedTasks: TasksState = {};
    
    diasSemana.forEach(dia => {
      // Tareas iniciales (siempre presentes)
      const initialDailyTasks = initialTasks[dia].diarias.map(tarea => ({ 
        ...tarea, 
        completada: false, 
        childId,
        isCustom: false
      }));
      
      const initialExtraTasks = initialTasks[dia].extra.map(tarea => ({ 
        ...tarea, 
        completada: false, 
        childId,
        isCustom: false
      }));

      // ✅ TAREAS PERSONALIZADAS CON VALIDACIÓN
      const customDailyTasks = customTasksData
        .filter(task => task && task.tipo === 'diarias' && task.isActive && task.id)
        .map(task => ({
          id: task.id!,
          nombre: task.nombre || 'Tarea personalizada',
          tipo: 'diarias' as const,
          puntos: task.puntos || 5,
          completada: false,
          childId,
          isCustom: true,
          description: task.description
        }));

      const customExtraTasks = customTasksData
        .filter(task => task && task.tipo === 'extra' && task.isActive && task.id)
        .map(task => ({
          id: task.id!,
          nombre: task.nombre || 'Tarea extra personalizada',
          tipo: 'extra' as const,
          puntos: task.puntos || 10,
          completada: false,
          childId,
          isCustom: true,
          description: task.description
        }));

      combinedTasks[dia] = {
        diarias: [...initialDailyTasks, ...customDailyTasks],
        extra: [...initialExtraTasks, ...customExtraTasks]
      };
    });

    return combinedTasks;
  }, [diasSemana, childId]);

  // ✅ FUNCIÓN PRINCIPAL DE CARGA CON MEJOR MANEJO DE ERRORES
  const loadWeeklyData = useCallback(async () => {
    if (!familyId || !childId || !userId) return;

    try {
      setLoading(true);
      setError(null);
      setSyncStatus('syncing');
      
      // ✅ CARGAR TAREAS PERSONALIZADAS PRIMERO
      const customTasksData = await loadCustomTasks();
      
      try {
        // Intentar cargar desde Firestore
        const weeklyData = await getWeeklyTasks(familyId, childId);
        
        if (weeklyData) {
          // Datos encontrados en Firestore
          const combinedTasks = createCombinedTasks(customTasksData);
          
          // Mantener el estado de completado de las tareas existentes
          diasSemana.forEach(dia => {
            if (weeklyData.tasks[dia]) {
              // Actualizar tareas diarias
              combinedTasks[dia].diarias = combinedTasks[dia].diarias.map(task => {
                const savedTask = weeklyData.tasks[dia].diarias.find(t => t.id === task.id);
                return savedTask ? { ...task, completada: savedTask.completada } : task;
              });
              
              // Actualizar tareas extra
              combinedTasks[dia].extra = combinedTasks[dia].extra.map(task => {
                const savedTask = weeklyData.tasks[dia].extra.find(t => t.id === task.id);
                return savedTask ? { ...task, completada: savedTask.completada } : task;
              });
            }
          });
          
          setTasks(combinedTasks);
          setTotalPoints(weeklyData.totalPoints);
          setWeeklyTotal(weeklyData.weeklyTotal);
          setLastUpdatedBy(weeklyData.updatedBy);
          setIsUpdatedByOther(weeklyData.updatedBy !== userId);
          
        } else {
          // ✅ MIGRAR DESDE LOCALSTORAGE SI EXISTE
          const storedTasks = localStorage.getItem(`tasks-${childId}`);
          const storedPoints = localStorage.getItem(`points-${childId}`);
          
          if (storedTasks && storedPoints) {
            console.log('📦 Migrando datos desde localStorage a Firestore...');
            
            const savedTasks = JSON.parse(storedTasks) as TasksState;
            const savedPoints = JSON.parse(storedPoints) as { [key: string]: number };
            const total = Object.values(savedPoints).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
            
            // Guardar en Firestore
            await saveWeeklyTasks(familyId, childId, savedTasks, savedPoints, total, userId);
            
            // Limpiar localStorage después de migrar
            localStorage.removeItem(`tasks-${childId}`);
            localStorage.removeItem(`points-${childId}`);
            
            // Combinar con tareas personalizadas
            const combinedTasks = createCombinedTasks(customTasksData);
            
            // Mantener estados
            diasSemana.forEach(dia => {
              if (savedTasks[dia]) {
                combinedTasks[dia].diarias = combinedTasks[dia].diarias.map(task => {
                  const savedTask = savedTasks[dia].diarias.find(t => t.id === task.id);
                  return savedTask ? { ...task, completada: savedTask.completada } : task;
                });
                
                combinedTasks[dia].extra = combinedTasks[dia].extra.map(task => {
                  const savedTask = savedTasks[dia].extra.find(t => t.id === task.id);
                  return savedTask ? { ...task, completada: savedTask.completada } : task;
                });
              }
            });
            
            setTasks(combinedTasks);
            setTotalPoints(savedPoints);
            setWeeklyTotal(total);
            
            toast.success('📦 Datos migrados a Firestore exitosamente', { autoClose: 3000 });
            
          } else {
            // Inicializar nueva semana
            const estadoInicial = createCombinedTasks(customTasksData);
            const puntosIniciales: { [key: string]: number } = {};
            
            diasSemana.forEach(dia => {
              puntosIniciales[dia] = 0;
            });
            
            setTasks(estadoInicial);
            setTotalPoints(puntosIniciales);
            setWeeklyTotal(0);
            
            // Guardar en Firestore
            await saveWeeklyTasks(familyId, childId, estadoInicial, puntosIniciales, 0, userId);
          }
        }
      } catch (firestoreError) {
        console.error('Error accessing Firestore:', firestoreError);
        setSyncStatus('error');
        
        // Fallback a localStorage si Firestore falla
        const storedTasks = localStorage.getItem(`tasks-${childId}`);
        const storedPoints = localStorage.getItem(`points-${childId}`);
        
        if (storedTasks && storedPoints) {
          const savedTasks = JSON.parse(storedTasks) as TasksState;
          const savedPoints = JSON.parse(storedPoints) as { [key: string]: number };
          
          const combinedTasks = createCombinedTasks(customTasksData);
          
          diasSemana.forEach(dia => {
            if (savedTasks[dia]) {
              combinedTasks[dia].diarias = combinedTasks[dia].diarias.map(task => {
                const savedTask = savedTasks[dia].diarias.find(t => t.id === task.id);
                return savedTask ? { ...task, completada: savedTask.completada } : task;
              });
              
              combinedTasks[dia].extra = combinedTasks[dia].extra.map(task => {
                const savedTask = savedTasks[dia].extra.find(t => t.id === task.id);
                return savedTask ? { ...task, completada: savedTask.completada } : task;
              });
            }
          });
          
          setTasks(combinedTasks);
          setTotalPoints(savedPoints);
          
          const total = Object.values(savedPoints).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
          setWeeklyTotal(Number(total));
          
          toast.warn('⚠️ Usando datos locales - Firestore no disponible');
        } else {
          // Si no hay datos locales, crear estructura inicial
          const estadoInicial = createCombinedTasks(customTasksData);
          const puntosIniciales: { [key: string]: number } = {};
          
          diasSemana.forEach(dia => {
            puntosIniciales[dia] = 0;
          });
          
          setTasks(estadoInicial);
          setTotalPoints(puntosIniciales);
          setWeeklyTotal(0);
        }
      }
      
      setLastUpdatedBy(userId);
      setIsUpdatedByOther(false);
      setSyncStatus('synced');
      
    } catch (err) {
      console.error('Error loading weekly data:', err);
      setError('Error al cargar los datos de la semana');
      setSyncStatus('error');
      toast.error('Error al cargar los datos de la semana');
    } finally {
      setLoading(false);
    }
  }, [familyId, childId, userId, diasSemana, loadCustomTasks, createCombinedTasks]);

  // Cargar datos al montar
  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  // ✅ ESCUCHAR CAMBIOS EN TAREAS PERSONALIZADAS CON DEBOUNCE
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleCustomTasksUpdate = (event: CustomEvent) => {
      if (event.detail.familyId === familyId) {
        console.log('📝 Tareas personalizadas actualizadas, recargando...');
        
        // ✅ DEBOUNCE PARA EVITAR MÚLTIPLES RECARGAS
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          loadWeeklyData();
          toast.info('🔄 Tareas actualizadas', { autoClose: 2000 });
        }, 500);
      }
    };

    window.addEventListener('customTasksUpdated', handleCustomTasksUpdate as EventListener);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('customTasksUpdated', handleCustomTasksUpdate as EventListener);
    };
  }, [familyId, loadWeeklyData]);

  // ✅ FUNCIÓN PARA ALTERNAR TAREAS CON MEJOR MANEJO
  const toggleTask = async (dia: string, tipo: 'diarias' | 'extra', taskId: string, isCustom = false) => {
    if (!familyId || !childId || !userId) return;

    try {
      setSyncStatus('syncing');
      
      // Encontrar la tarea actual
      const currentTask = tasks[dia]?.[tipo]?.find(task => task.id === taskId);
      if (!currentTask) {
        console.error(`Tarea no encontrada: ${taskId}`);
        return;
      }

      const newCompletedState = !currentTask.completada;
      
      try {
        // Actualizar en Firestore usando el servicio
        await updateTask(familyId, childId, dia, tipo, taskId, newCompletedState, userId);
        
        // Actualizar estado local después del éxito en Firestore
        setTasks(prevTasks => {
          const nuevoEstado = { ...prevTasks };
          const taskIndex = nuevoEstado[dia][tipo].findIndex(task => task.id === taskId);
          
          if (taskIndex !== -1) {
            nuevoEstado[dia][tipo][taskIndex].completada = newCompletedState;
          }
          
          return nuevoEstado;
        });

        // Actualizar puntos
        const puntosCambio = newCompletedState ? currentTask.puntos : -currentTask.puntos;
        
        setTotalPoints(prev => {
          const updated = {
            ...prev,
            [dia]: (prev[dia] || 0) + puntosCambio
          };
          return updated;
        });
        
        setWeeklyTotal(prev => prev + puntosCambio);

        setSyncStatus('synced');
        
        // Notificación de éxito
        const taskTypeMessage = isCustom ? '✨ Tarea personalizada' : '📋 Tarea';
        toast.success(
          `${taskTypeMessage} ${newCompletedState ? 'completada' : 'desmarcada'}: ${currentTask.nombre}`, 
          { position: "top-right", autoClose: 2000 }
        );

      } catch (firestoreError) {
        console.error('Error updating in Firestore:', firestoreError);
        
        // Fallback a localStorage si Firestore falla
        setTasks(prevTasks => {
          const nuevoEstado = { ...prevTasks };
          const taskIndex = nuevoEstado[dia][tipo].findIndex(task => task.id === taskId);
          
          if (taskIndex !== -1) {
            nuevoEstado[dia][tipo][taskIndex].completada = newCompletedState;
          }
          
          return nuevoEstado;
        });

        const puntosCambio = newCompletedState ? currentTask.puntos : -currentTask.puntos;
        
        setTotalPoints(prev => {
          const updated = {
            ...prev,
            [dia]: (prev[dia] || 0) + puntosCambio
          };
          
          // Guardar en localStorage como fallback
          localStorage.setItem(`points-${childId}`, JSON.stringify(updated));
          return updated;
        });
        
        setWeeklyTotal(prev => prev + puntosCambio);

        // Guardar tareas en localStorage como fallback
        setTasks(currentTasks => {
          localStorage.setItem(`tasks-${childId}`, JSON.stringify(currentTasks));
          return currentTasks;
        });

        setSyncStatus('error');
        toast.warn('⚠️ Guardado localmente - Firestore no disponible');
      }

    } catch (err) {
      console.error('Error updating task:', err);
      setError('Error al actualizar la tarea');
      setSyncStatus('error');
      toast.error('Error al actualizar la tarea');
      // Recargar datos en caso de error
      await loadWeeklyData();
    }
  };

  // Función para refrescar datos manualmente
  const refreshData = useCallback(async () => {
    await loadWeeklyData();
    toast.success('📡 Datos actualizados', { autoClose: 1500 });
  }, [loadWeeklyData]);

  return {
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
  };
};

// Hook para obtener puntos de todos los hijos de la familia
interface UseFamilyPointsReturn {
  childrenPoints: ChildPoints[];
  loading: boolean;
  error: string | null;
  refreshFamilyPoints: () => Promise<void>;
}

export const useFamilyPoints = (familyId: string): UseFamilyPointsReturn => {
  const [childrenPoints, setChildrenPoints] = useState<ChildPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFamilyPoints = useCallback(async () => {
    if (!familyId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Por ahora retornamos datos vacíos hasta implementar Firestore completamente
      // Aquí se implementaría la lógica para obtener puntos de todos los hijos
      setChildrenPoints([]);
    } catch (err) {
      console.error('Error loading family points:', err);
      setError('Error al cargar los puntos de la familia');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  // Cargar datos iniciales
  useEffect(() => {
    loadFamilyPoints();
  }, [loadFamilyPoints]);

  const refreshFamilyPoints = useCallback(async () => {
    await loadFamilyPoints();
  }, [loadFamilyPoints]);

  return {
    childrenPoints,
    loading,
    error,
    refreshFamilyPoints
  };
};

export default usePointsManagement;