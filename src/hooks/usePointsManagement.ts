// src/hooks/usePointsManagement.ts (Actualizado con soporte para tareas personalizadas)
import { useState, useEffect, useCallback } from 'react';
import { TasksState } from '../types/taskTypes';
import { getChildNameById } from '../services/familyService';
import { initialTasks } from '../config/rewardConfig';

import { toast } from 'react-toastify';
import { CustomTask, getActiveTasksByFamily } from '../components/FamilyPointsOverview';

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

  // Cargar tareas personalizadas
  const loadCustomTasks = useCallback(async () => {
    if (!familyId) return [];
    
    try {
      const customTasksData = await getActiveTasksByFamily(familyId);
      setCustomTasks(customTasksData);
      return customTasksData;
    } catch (err) {
      console.error('Error loading custom tasks:', err);
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

      // Tareas personalizadas
      const customDailyTasks = customTasksData
        .filter(task => task.tipo === 'diarias' && task.isActive)
        .map(task => ({
          id: task.id || `custom-${Date.now()}`,
          nombre: task.nombre,
          tipo: 'diarias' as const,
          puntos: task.puntos,
          completada: false,
          childId,
          isCustom: true,
          description: task.description
        }));

      const customExtraTasks = customTasksData
        .filter(task => task.tipo === 'extra' && task.isActive)
        .map(task => ({
          id: task.id || `custom-${Date.now()}`,
          nombre: task.nombre,
          tipo: 'extra' as const,
          puntos: task.puntos,
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

  // Cargar datos iniciales
  const loadWeeklyData = useCallback(async () => {
    if (!familyId || !childId || !userId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Cargar tareas personalizadas primero
      const customTasksData = await loadCustomTasks();
      
      // Comprobar localStorage para datos existentes
      const storedTasks = localStorage.getItem(`tasks-${childId}`);
      const storedPoints = localStorage.getItem(`points-${childId}`);
      
      if (storedTasks && storedPoints) {
        const savedTasks = JSON.parse(storedTasks) as TasksState;
        const savedPoints = JSON.parse(storedPoints) as { [key: string]: number };
        
        // Crear estructura actualizada con tareas personalizadas
        const combinedTasks = createCombinedTasks(customTasksData);
        
        // Mantener el estado de completado de las tareas existentes
        diasSemana.forEach(dia => {
          if (savedTasks[dia]) {
            // Actualizar tareas diarias
            combinedTasks[dia].diarias = combinedTasks[dia].diarias.map(task => {
              const savedTask = savedTasks[dia].diarias.find(t => t.id === task.id);
              return savedTask ? { ...task, completada: savedTask.completada } : task;
            });
            
            // Actualizar tareas extra
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
        
        // Guardar tareas actualizadas
        localStorage.setItem(`tasks-${childId}`, JSON.stringify(combinedTasks));
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
        
        // Guardar en localStorage
        localStorage.setItem(`tasks-${childId}`, JSON.stringify(estadoInicial));
        localStorage.setItem(`points-${childId}`, JSON.stringify(puntosIniciales));
      }
      
      setLastUpdatedBy(userId);
      setIsUpdatedByOther(false);
    } catch (err) {
      console.error('Error loading weekly data:', err);
      setError('Error al cargar los datos de la semana');
      toast.error('Error al cargar los datos de la semana');
    } finally {
      setLoading(false);
    }
  }, [familyId, childId, userId, diasSemana, loadCustomTasks, createCombinedTasks]);

  // Cargar datos al montar
  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  // Escuchar cambios en tareas personalizadas
  useEffect(() => {
    const handleCustomTasksUpdate = (event: CustomEvent) => {
      if (event.detail.familyId === familyId) {
        console.log('📝 Tareas personalizadas actualizadas, recargando...');
        loadWeeklyData();
        toast.info('🔄 Tareas actualizadas', { autoClose: 2000 });
      }
    };

    window.addEventListener('customTasksUpdated', handleCustomTasksUpdate as EventListener);
    
    return () => {
      window.removeEventListener('customTasksUpdated', handleCustomTasksUpdate as EventListener);
    };
  }, [familyId, loadWeeklyData]);

  // Función para alternar el estado de una tarea
  const toggleTask = async (dia: string, tipo: 'diarias' | 'extra', taskId: string, isCustom = false) => {
    if (!familyId || !childId || !userId) return;

    try {
      // Encontrar la tarea actual
      const currentTask = tasks[dia]?.[tipo]?.find(task => task.id === taskId);
      if (!currentTask) {
        console.error(`Tarea no encontrada: ${taskId}`);
        return;
      }

      const newCompletedState = !currentTask.completada;
      
      // Actualizar inmediatamente en el estado local
      setTasks(prevTasks => {
        const nuevoEstado = { ...prevTasks };
        const taskIndex = nuevoEstado[dia][tipo].findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          nuevoEstado[dia][tipo][taskIndex].completada = newCompletedState;
        }
        
        return nuevoEstado;
      });

      // Actualizar puntos localmente
      const puntosCambio = newCompletedState ? currentTask.puntos : -currentTask.puntos;
      setTotalPoints(prev => {
        const updated = {
          ...prev,
          [dia]: (prev[dia] || 0) + puntosCambio
        };
        
        // Guardar en localStorage
        localStorage.setItem(`points-${childId}`, JSON.stringify(updated));
        return updated;
      });
      
      setWeeklyTotal(prev => prev + puntosCambio);

      // Guardar tareas actualizadas en localStorage
      setTasks(currentTasks => {
        localStorage.setItem(`tasks-${childId}`, JSON.stringify(currentTasks));
        return currentTasks;
      });

      // Mensaje diferente para tareas personalizadas
      const taskTypeMessage = isCustom ? '✨ Tarea personalizada' : '📋 Tarea';
      toast.success(
        `${taskTypeMessage} ${newCompletedState ? 'completada' : 'desmarcada'}: ${currentTask.nombre}`, 
        { position: "top-right", autoClose: 2000 }
      );

      // Log para debugging
      console.log(`${newCompletedState ? '✅' : '❌'} Tarea ${isCustom ? 'personalizada' : 'base'} ${newCompletedState ? 'completada' : 'desmarcada'}:`, {
        taskId,
        taskName: currentTask.nombre,
        points: currentTask.puntos,
        day: dia,
        type: tipo,
        isCustom
      });

    } catch (err) {
      console.error('Error updating task:', err);
      setError('Error al actualizar la tarea');
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
    isUpdatedByOther
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