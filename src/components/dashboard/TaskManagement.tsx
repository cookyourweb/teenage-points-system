// src/components/dashboard/TaskManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faTasks,
  faStar,
  faSpinner,
  faSave,
  faTimes,
  faSync,
  faCheckSquare,
  faToggleOn,
  faToggleOff
} from '@fortawesome/free-solid-svg-icons';

import { toast } from 'react-toastify';
import { useUserRole } from '../../hooks/useUserRole';
import useAuth from '../../hooks/useAuth';
import {
  CustomTask,
  getTasksByFamily,
  addCustomTask,
  updateCustomTask,
  deleteCustomTask,
} from '../../services/customTaskService';

interface TaskManagementProps {
  familyId: string;
}

interface TaskFormData {
  id?: string;
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  isActive: boolean;
  description: string;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ familyId }) => {
  const { user } = useAuth();
  const { role } = useUserRole(user?.uid);
  const isPadre = role === 'padre' || role === 'admin';
  
  // Estados principales
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    nombre: '',
    tipo: 'diarias',
    puntos: 5,
    isActive: true,
    description: ''
  });
  
  // Estados de validación
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Cargar tareas personalizadas
  useEffect(() => {
    loadCustomTasks();
  }, [familyId]);

  const loadCustomTasks = async () => {
    if (!familyId) return;
    
    try {
      setLoading(true);
      const tasks = await getTasksByFamily(familyId);
      setCustomTasks(tasks);
    } catch (error) {
      console.error('Error loading custom tasks:', error);
      toast.error('Error al cargar las tareas personalizadas');
    } finally {
      setLoading(false);
    }
  };

  // Validar formulario
  const validateForm = (data: TaskFormData): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!data.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (data.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (data.nombre.trim().length > 50) {
      newErrors.nombre = 'El nombre no puede exceder 50 caracteres';
    }

    if (data.puntos < 1 || data.puntos > 100) {
      newErrors.puntos = 'Los puntos deben estar entre 1 y 100';
    }

    if (!data.tipo) {
      newErrors.tipo = 'Debe seleccionar un tipo de tarea';
    }

    if (data.description && data.description.length > 200) {
      newErrors.description = 'La descripción no puede exceder 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Abrir modal para crear nueva tarea
  const handleAddTask = () => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar tareas');
      return;
    }

    setEditingTask(null);
    setFormData({
      nombre: '',
      tipo: 'diarias',
      puntos: 5,
      isActive: true,
      description: ''
    });
    setErrors({});
    setShowModal(true);
  };

  // Abrir modal para editar tarea
  const handleEditTask = (task: CustomTask) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar tareas');
      return;
    }

    setEditingTask(task);
    setFormData({
      id: task.id,
      nombre: task.nombre,
      tipo: task.tipo,
      puntos: task.puntos,
      isActive: task.isActive,
      description: task.description || ''
    });
    setErrors({});
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      nombre: '',
      tipo: 'diarias',
      puntos: 5,
      isActive: true,
      description: ''
    });
    setErrors({});
  };

  // Guardar tarea (crear o editar)
  const handleSaveTask = async () => {
    if (!user?.uid || !familyId || !isPadre) return;

    if (!validateForm(formData)) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    setSyncing(true);

    try {
      const taskData: Omit<CustomTask, 'id'> = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        puntos: formData.puntos,
        familyId,
        createdBy: user.uid,
        isActive: formData.isActive,
        description: formData.description.trim()
      };

      if (editingTask && formData.id) {
        // Actualizar tarea existente
        await updateCustomTask(formData.id, taskData);
        setCustomTasks(prev => prev.map(task => 
          task.id === formData.id ? { ...taskData, id: formData.id } : task
        ));
        toast.success('✅ Tarea actualizada correctamente');
      } else {
        // Crear nueva tarea
        const newTask = await addCustomTask(taskData);
        setCustomTasks(prev => [...prev, newTask]);
        toast.success('✅ Nueva tarea creada correctamente');
      }

      handleCloseModal();
      
      // Notificar que las tareas han sido actualizadas
      window.dispatchEvent(new CustomEvent('customTasksUpdated', { 
        detail: { familyId } 
      }));

    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Error al guardar la tarea');
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (task: CustomTask) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar tareas');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar la tarea "${task.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete || !task.id) return;

    setSyncing(true);

    try {
      await deleteCustomTask(task.id);
      setCustomTasks(prev => prev.filter(t => t.id !== task.id));
      toast.success('🗑️ Tarea eliminada correctamente');
      
      // Notificar que las tareas han sido actualizadas
      window.dispatchEvent(new CustomEvent('customTasksUpdated', { 
        detail: { familyId } 
      }));

    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error al eliminar la tarea');
    } finally {
      setSyncing(false);
    }
  };

  // Activar/Desactivar tarea
  const handleToggleTaskStatus = async (task: CustomTask) => {
    if (!isPadre || !task.id) return;

    setSyncing(true);

    try {
      const updatedTask = { ...task, isActive: !task.isActive };
      await updateCustomTask(task.id, updatedTask);
      
      setCustomTasks(prev => prev.map(t => 
        t.id === task.id ? updatedTask : t
      ));

      toast.success(
        `Tarea ${updatedTask.isActive ? 'activada' : 'desactivada'} correctamente`
      );
      
      // Notificar cambios
      window.dispatchEvent(new CustomEvent('customTasksUpdated', { 
        detail: { familyId } 
      }));

    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error('Error al cambiar el estado de la tarea');
    } finally {
      setSyncing(false);
    }
  };

  // Actualizar campo del formulario
  const updateFormField = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Refrescar datos
  const handleRefresh = async () => {
    setSyncing(true);
    await loadCustomTasks();
    setSyncing(false);
    toast.success('Datos actualizados');
  };

  // Estadísticas rápidas
  const activeTasks = customTasks.filter(task => task.isActive);
  const dailyTasks = activeTasks.filter(task => task.tipo === 'diarias');
  const extraTasks = activeTasks.filter(task => task.tipo === 'extra');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTasks} className="text-primary-500" />
            Gestión de Tareas Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-primary-500 mb-4" />
            <p className="text-neutral-600">Cargando tareas personalizadas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTasks} className="text-primary-500" />
                Gestión de Tareas Personalizadas
                {syncing && (
                  <FontAwesomeIcon icon={faSync} className="animate-spin text-sm text-primary-500" />
                )}
              </CardTitle>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {isPadre 
                  ? `${activeTasks.length} tareas activas (${dailyTasks.length} diarias, ${extraTasks.length} extra)`
                  : 'Solo los padres pueden gestionar las tareas'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="neutral" 
                onClick={handleRefresh}
                disabled={syncing}
              >
                <FontAwesomeIcon icon={faSync} className={syncing ? "animate-spin" : ""} />
              </Button>
              {isPadre && (
                <Button onClick={handleAddTask}>
                  <FontAwesomeIcon icon={faPlus} />
                  Nueva Tarea
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customTasks.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faTasks} className="text-4xl text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No hay tareas personalizadas
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                {isPadre 
                  ? 'Crea tu primera tarea personalizada para complementar las tareas base'
                  : 'Los padres pueden crear tareas personalizadas que aparecerán en tu sistema de puntos'
                }
              </p>
              {isPadre && (
                <Button onClick={handleAddTask}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Crear Primera Tarea
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faTasks} className="text-primary-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {customTasks.length}
                      </p>
                      <p className="text-sm text-primary-600 dark:text-primary-400">
                        Total tareas
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faCheckSquare} className="text-success-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                        {dailyTasks.length}
                      </p>
                      <p className="text-sm text-success-600 dark:text-success-400">
                        Tareas diarias
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                        {extraTasks.length}
                      </p>
                      <p className="text-sm text-warning-600 dark:text-warning-400">
                        Tareas extra
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tareas Diarias Personalizadas */}
              <div>
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckSquare} className="text-success-500" />
                  Tareas Diarias Personalizadas ({customTasks.filter(t => t.tipo === 'diarias').length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTasks
                    .filter(task => task.tipo === 'diarias')
                    .map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isPadre={isPadre}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onToggleStatus={handleToggleTaskStatus}
                        tipo="diarias"
                      />
                    ))}
                  {customTasks.filter(t => t.tipo === 'diarias').length === 0 && (
                    <div className="col-span-full text-center py-8 space-y-3 text-neutral-500 dark:text-neutral-400">
                      <FontAwesomeIcon icon={faCheckSquare} className="text-2xl mb-2" />
                      <p>No hay tareas diarias personalizadas</p>
                      {isPadre && (
                        <Button variant="primary" 
                          onClick={handleAddTask}
                        >
                          Crear Tarea Diaria
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tareas Extra Personalizadas */}
              <div>
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faStar} className="text-warning-500" />
                  Tareas Extra Personalizadas ({customTasks.filter(t => t.tipo === 'extra').length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTasks
                    .filter(task => task.tipo === 'extra')
                    .map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isPadre={isPadre}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onToggleStatus={handleToggleTaskStatus}
                        tipo="extra"
                      />
                    ))}
                  {customTasks.filter(t => t.tipo === 'extra').length === 0 && (
                    <div className="col-span-full text-center py-8 space-y-3 text-neutral-500 dark:text-neutral-400">
                      <FontAwesomeIcon icon={faStar} className="text-2xl mb-2" />
                      <p>No hay tareas extra personalizadas</p>
                      {isPadre && (
                        <Button variant="primary" 
                          onClick={handleAddTask}
                        >
                          Crear Tarea Extra
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faTasks} className="text-primary-500 mt-1" />
                  <div>
                    <h5 className="font-medium text-primary-900 dark:text-primary-100 mb-1">
                      Sobre las Tareas Personalizadas
                    </h5>
                    <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
                      <li>• Las tareas aparecerán en el sistema de puntos junto a las tareas base</li>
                      <li>• Solo las tareas activas se muestran a los hijos</li>
                      <li>• Los cambios se sincronizan automáticamente en tiempo real</li>
                      <li>• Las tareas diarias aparecen cada día, las extra son opcionales</li>
                      <li>• Puedes desactivar temporalmente tareas sin eliminarlas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulario */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTask ? 'Editar Tarea Personalizada' : 'Nueva Tarea Personalizada'}
      >
        <div className="max-w-md w-full">

          <form onSubmit={(e) => { e.preventDefault(); handleSaveTask(); }} className="space-y-4">
            {/* Nombre de la tarea */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nombre de la tarea *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => updateFormField('nombre', e.target.value)}
                placeholder="Ej: Organizar el escritorio"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.nombre ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                disabled={saving}
                maxLength={50}
              />
              {errors.nombre && (
                <p className="text-danger-500 text-sm mt-1">{errors.nombre}</p>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Máximo 50 caracteres
              </p>
            </div>

            {/* Tipo de tarea */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tipo de tarea *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => updateFormField('tipo', e.target.value as 'diarias' | 'extra')}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.tipo ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                disabled={saving}
              >
                <option value="diarias">Tarea Diaria</option>
                <option value="extra">Tarea Extra (Bonus)</option>
              </select>
              {errors.tipo && (
                <p className="text-danger-500 text-sm mt-1">{errors.tipo}</p>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {formData.tipo === 'diarias' 
                  ? 'Se mostrará todos los días en el sistema de puntos'
                  : 'Tarea opcional con puntos bonus'
                }
              </p>
            </div>

            {/* Puntos */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Puntos que otorga *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.puntos}
                onChange={(e) => updateFormField('puntos', parseInt(e.target.value) || 0)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.puntos ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                disabled={saving}
              />
              {errors.puntos && (
                <p className="text-danger-500 text-sm mt-1">{errors.puntos}</p>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Entre 1 y 100 puntos. Tareas diarias: 5-15 pts, Tareas extra: 15-50 pts
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                placeholder="Descripción adicional o instrucciones específicas..."
                rows={3}
                maxLength={200}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.description ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                disabled={saving}
              />
              {errors.description && (
                <p className="text-danger-500 text-sm mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Máximo 200 caracteres ({200 - formData.description.length} restantes)
              </p>
            </div>

            {/* Estado activo/inactivo */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => updateFormField('isActive', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                disabled={saving}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tarea activa (visible para los hijos)
              </label>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="neutral" layout="grow"
                onClick={handleCloseModal}
                disabled={saving}
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Cancelar
              </Button>
              <Button layout="grow"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {editingTask ? 'Actualizar' : 'Crear Tarea'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

// Componente TaskCard para reutilizar
interface TaskCardProps {
  task: CustomTask;
  isPadre: boolean;
  onEdit: (task: CustomTask) => void;
  onDelete: (task: CustomTask) => void;
  onToggleStatus: (task: CustomTask) => void;
  tipo: 'diarias' | 'extra';
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isPadre, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  tipo 
}) => {
  const colorClasses = tipo === 'diarias' 
    ? {
        active: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800',
        inactive: 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-600 opacity-60',
        points: 'text-success-600 dark:text-success-400',
        badge: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      }
    : {
        active: 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800',
        inactive: 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-600 opacity-60',
        points: 'text-warning-600 dark:text-warning-400',
        badge: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
      };

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      task.isActive ? colorClasses.active : colorClasses.inactive
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h5 className="font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {task.nombre}
          </h5>
          <p className={`text-sm ${colorClasses.points}`}>
            {task.puntos} puntos{tipo === 'extra' ? ' bonus' : ''}
          </p>
          {task.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        {isPadre && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900 rounded transition-colors"
              title="Editar tarea"
            >
              <FontAwesomeIcon icon={faEdit} size="sm" />
            </button>
            <button
              onClick={() => onDelete(task)}
              className="p-1 text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-900 rounded transition-colors"
              title="Eliminar tarea"
            >
              <FontAwesomeIcon icon={faTrash} size="sm" />
            </button>
          </div>
        )}
      </div>
      {isPadre && (
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            task.isActive ? colorClasses.badge : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
          }`}>
            {task.isActive ? 'Activa' : 'Inactiva'}
          </span>
          <button
            onClick={() => onToggleStatus(task)}
            className={`text-xs px-3 py-1 rounded transition-colors flex items-center gap-1 ${
              task.isActive
                ? 'text-warning-600 hover:bg-warning-100 dark:hover:bg-warning-900'
                : 'text-success-600 hover:bg-success-100 dark:hover:bg-success-900'
            }`}
          >
            <FontAwesomeIcon 
              icon={task.isActive ? faToggleOn : faToggleOff} 
              className={task.isActive ? 'text-warning-500' : 'text-neutral-400'} 
            />
            {task.isActive ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;