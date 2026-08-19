// src/components/ui/TaskForm.tsx
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Definir CustomTask localmente para evitar dependencias circulares
interface CustomTask {
  id?: string;
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  familyId: string;
  createdBy: string;
  isActive: boolean;
  description?: string;
}

interface TaskFormProps {
  task?: CustomTask | null;
  familyId: string;
  onSave: (taskData: Omit<CustomTask, 'id' | 'familyId' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  nombre: string;
  tipo: 'diarias' | 'extra';
  puntos: number;
  isActive: boolean;
  description: string;
}

interface FormErrors {
  [key: string]: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  onSave,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    tipo: 'diarias',
    puntos: 5,
    isActive: true,
    description: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario con datos de la tarea si existe
  useEffect(() => {
    if (task) {
      setFormData({
        nombre: task.nombre,
        tipo: task.tipo,
        puntos: task.puntos,
        isActive: task.isActive,
        description: task.description || ''
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'diarias',
        puntos: 5,
        isActive: true,
        description: ''
      });
    }
    setErrors({});
  }, [task]);

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.trim().length > 50) {
      newErrors.nombre = 'El nombre no puede exceder 50 caracteres';
    }

    // Validar puntos
    if (formData.puntos < 1) {
      newErrors.puntos = 'Los puntos deben ser mayor a 0';
    } else if (formData.puntos > 100) {
      newErrors.puntos = 'Los puntos no pueden exceder 100';
    }

    // Validar descripción
    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'La descripción no puede exceder 200 caracteres';
    }

    // Validar tipo
    if (!formData.tipo || !['diarias', 'extra'].includes(formData.tipo)) {
      newErrors.tipo = 'Debe seleccionar un tipo válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Actualizar campo del formulario
  const updateField = (
    field: keyof FormData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        puntos: formData.puntos,
        isActive: formData.isActive,
        description: formData.description.trim()
      };

      await onSave(taskData);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = loading || isSubmitting;

  return (
    <div className="max-w-md w-full">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        {task ? 'Editar Tarea Personalizada' : 'Nueva Tarea Personalizada'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre de la tarea */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Nombre de la tarea *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            placeholder="Ej: Organizar el escritorio"
            maxLength={50}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.nombre 
                ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
                : 'border-neutral-300 dark:border-neutral-600'
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
            disabled={isDisabled}
          />
          {errors.nombre && (
            <p className="text-danger-500 text-sm mt-1">{errors.nombre}</p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {formData.nombre.length}/50 caracteres
          </p>
        </div>

        {/* Tipo de tarea */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Tipo de tarea *
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => updateField('tipo', e.target.value as 'diarias' | 'extra')}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.tipo 
                ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
                : 'border-neutral-300 dark:border-neutral-600'
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
            disabled={isDisabled}
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
          <div className="relative">
            <input
              type="number"
              min="1"
              max="100"
              value={formData.puntos}
              onChange={(e) => updateField('puntos', parseInt(e.target.value) || 0)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.puntos 
                  ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
                  : 'border-neutral-300 dark:border-neutral-600'
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
              disabled={isDisabled}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <span className="text-neutral-500 text-sm">pts</span>
            </div>
          </div>
          {errors.puntos && (
            <p className="text-danger-500 text-sm mt-1">{errors.puntos}</p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Recomendado: Tareas diarias 5-15 pts, Tareas extra 15-50 pts
          </p>
          
          {/* Barra de puntos visual */}
          <div className="mt-2">
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  formData.puntos <= 15 ? 'bg-success-500' :
                  formData.puntos <= 30 ? 'bg-warning-500' :
                  formData.puntos <= 50 ? 'bg-warning-500' : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min((formData.puntos / 100) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>Bajo (1-15)</span>
              <span>Medio (16-30)</span>
              <span>Alto (31-50)</span>
              <span>Muy alto (51-100)</span>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Instrucciones específicas, ejemplos o detalles adicionales..."
            rows={3}
            maxLength={200}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
              errors.description 
                ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
                : 'border-neutral-300 dark:border-neutral-600'
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
            disabled={isDisabled}
          />
          {errors.description && (
            <p className="text-danger-500 text-sm mt-1">{errors.description}</p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {formData.description.length}/200 caracteres
          </p>
        </div>

        {/* Estado activo/inactivo */}
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => updateField('isActive', e.target.checked)}
            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2"
            disabled={isDisabled}
          />
          <div className="flex-1">
            <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
              Tarea activa
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {formData.isActive 
                ? 'Los hijos podrán ver y completar esta tarea'
                : 'La tarea estará oculta y no se mostrará a los hijos'
              }
            </p>
          </div>
        </div>

        {/* Preview de la tarea */}
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">
            Vista previa:
          </h4>
          <div className={`p-3 border rounded-lg ${
            formData.tipo === 'diarias' 
              ? 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800'
              : 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800'
          }`}>
            <h5 className="font-medium text-neutral-900 dark:text-neutral-100">
              {formData.nombre || 'Nombre de la tarea'}
            </h5>
            <p className={`text-sm ${
              formData.tipo === 'diarias' 
                ? 'text-success-600 dark:text-success-400' 
                : 'text-warning-600 dark:text-warning-400'
            }`}>
              {formData.puntos} puntos{formData.tipo === 'extra' ? ' bonus' : ''}
            </p>
            {formData.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {formData.description}
              </p>
            )}
            <span className={`inline-block text-xs px-2 py-1 rounded-full mt-2 ${
              formData.isActive 
                ? (formData.tipo === 'diarias' 
                    ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                    : 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
                  )
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
            }`}>
              {formData.isActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-neutral-500 hover:bg-neutral-600"
            disabled={isDisabled}
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                {task ? 'Actualizar' : 'Crear Tarea'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;