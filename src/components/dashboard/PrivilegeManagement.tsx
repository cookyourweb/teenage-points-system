// src/components/dashboard/PrivilegeManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Checkbox from '../ui/Checkbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faGift,
  faStar,
  faSpinner,
  faSave,
  faTimes,
  faSync,
  faTrophy

} from '@fortawesome/free-solid-svg-icons';
import { 
  fetchPrivileges, 
  addPrivilege, 
  updatePrivilege, 
  deletePrivilege 
} from '../../services/privilegesService';
import { toast } from 'react-toastify';
import { useUserRole } from '../../hooks/useUserRole';
import useAuth from '../../hooks/useAuth';
import { Privilege } from '../../types/privilegeTypes';

interface PrivilegeManagementProps {
  familyId: string;
}

interface PrivilegeFormData {
  id?: string;
  name: string;
  points: number;
  description: string;
  unlocked: boolean;
}

const PrivilegeManagement: React.FC<PrivilegeManagementProps> = ({ familyId }) => {
  const { user } = useAuth();
  const { role } = useUserRole(user?.uid);
  const isPadre = role === 'padre' || role === 'admin';
  
  // Estados principales
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [editingPrivilege, setEditingPrivilege] = useState<Privilege | null>(null);
  const [formData, setFormData] = useState<PrivilegeFormData>({
    name: '',
    points: 30,
    description: '',
    unlocked: false
  });
  
  // Estados de validación
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Cargar privilegios
  useEffect(() => {
    loadPrivileges();
  }, []);

  const loadPrivileges = async () => {
    try {
      setLoading(true);
      const privilegesData = await fetchPrivileges();
      setPrivileges(privilegesData);
    } catch (error) {
      console.error('Error loading privileges:', error);
      toast.error('Error al cargar los privilegios');
    } finally {
      setLoading(false);
    }
  };

  // Validar formulario
  const validateForm = (data: PrivilegeFormData): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!data.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (data.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (data.name.trim().length > 60) {
      newErrors.name = 'El nombre no puede exceder 60 caracteres';
    }

    if (data.points < 1 || data.points > 500) {
      newErrors.points = 'Los puntos deben estar entre 1 y 500';
    }

    if (data.description && data.description.length > 300) {
      newErrors.description = 'La descripción no puede exceder 300 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Abrir modal para crear nuevo privilegio
  const handleAddPrivilege = () => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar privilegios');
      return;
    }

    setEditingPrivilege(null);
    setFormData({
      name: '',
      points: 30,
      description: '',
      unlocked: false
    });
    setErrors({});
    setShowModal(true);
  };

  // Abrir modal para editar privilegio
  const handleEditPrivilege = (privilege: Privilege) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar privilegios');
      return;
    }

    setEditingPrivilege(privilege);
    setFormData({
      id: privilege.id || privilege.privilegioId,
      name: privilege.name,
      points: privilege.points,
      description: privilege.description || '',
      unlocked: privilege.unlocked
    });
    setErrors({});
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPrivilege(null);
    setFormData({
      name: '',
      points: 30,
      description: '',
      unlocked: false
    });
    setErrors({});
  };

  // Guardar privilegio (crear o editar)
  const handleSavePrivilege = async () => {
    if (!user?.uid || !isPadre) return;

    if (!validateForm(formData)) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    setSyncing(true);

    try {
      const privilegeData: Privilege = {
        name: formData.name.trim(),
        points: formData.points,
        description: formData.description.trim(),
        unlocked: formData.unlocked,
        history: []
      };

      if (editingPrivilege && formData.id) {
        // Actualizar privilegio existente
        await updatePrivilege(formData.id, privilegeData);
        setPrivileges(prev => prev.map(privilege => 
          (privilege.id === formData.id || privilege.privilegioId === formData.id) 
            ? { ...privilegeData, id: formData.id } 
            : privilege
        ));
        toast.success('✅ Privilegio actualizado correctamente');
      } else {
        // Crear nuevo privilegio
        const newPrivilege = await addPrivilege(privilegeData);
        setPrivileges(prev => [...prev, newPrivilege]);
        toast.success('✅ Nuevo privilegio creado correctamente');
      }

      handleCloseModal();
      
      // Notificar que los privilegios han sido actualizados
      window.dispatchEvent(new CustomEvent('privilegesUpdated', { 
        detail: { familyId } 
      }));

    } catch (error) {
      console.error('Error saving privilege:', error);
      toast.error('Error al guardar el privilegio');
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };

  // Eliminar privilegio
  const handleDeletePrivilege = async (privilege: Privilege) => {
    if (!isPadre) {
      toast.error('Solo los padres pueden gestionar privilegios');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar el privilegio "${privilege.name}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    const privilegeId = privilege.id || privilege.privilegioId;
    if (!privilegeId) return;

    setSyncing(true);

    try {
      await deletePrivilege(privilegeId);
      setPrivileges(prev => prev.filter(p => 
        p.id !== privilegeId && p.privilegioId !== privilegeId
      ));
      toast.success('🗑️ Privilegio eliminado correctamente');
      
      // Notificar que los privilegios han sido actualizados
      window.dispatchEvent(new CustomEvent('privilegesUpdated', { 
        detail: { familyId } 
      }));

    } catch (error) {
      console.error('Error deleting privilege:', error);
      toast.error('Error al eliminar el privilegio');
    } finally {
      setSyncing(false);
    }
  };

  // Actualizar campo del formulario
  const updateFormField = (
    field: keyof PrivilegeFormData, 
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Refrescar datos
  const handleRefresh = async () => {
    setSyncing(true);
    await loadPrivileges();
    setSyncing(false);
    toast.success('Datos actualizados');
  };

  // Obtener color según los puntos requeridos
  const getPointsColor = (points: number) => {
    if (points <= 50) return 'text-success-600 dark:text-success-400';
    if (points <= 100) return 'text-warning-600 dark:text-warning-400';
    if (points <= 200) return 'text-warning-600 dark:text-warning-400';
    return 'text-danger-600 dark:text-danger-400';
  };

  const getPointsLabel = (points: number) => {
    if (points <= 50) return 'Fácil';
    if (points <= 100) return 'Medio';
    if (points <= 200) return 'Difícil';
    return 'Muy Difícil';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGift} className="text-accent-500" />
            Gestión de Privilegios Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-accent-500 mb-4" />
            <p className="text-neutral-600">Cargando privilegios...</p>
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
                <FontAwesomeIcon icon={faGift} className="text-accent-500" />
                Gestión de Privilegios Personalizados
                {syncing && (
                  <FontAwesomeIcon icon={faSync} className="animate-spin text-sm text-accent-500" />
                )}
              </CardTitle>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {isPadre 
                  ? `${privileges.length} privilegios personalizados creados`
                  : 'Solo los padres pueden gestionar los privilegios'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="neutral"
                onClick={handleRefresh}
                disabled={syncing}
                iconOnly={<FontAwesomeIcon icon={faSync} className={syncing ? "animate-spin" : ""} />}
                label={syncing ? "Actualizando" : "Actualizar la lista"}
              />
              {isPadre && (
                <Button variant="primary" onClick={handleAddPrivilege}>
                  <FontAwesomeIcon icon={faPlus} />
                  Nuevo Privilegio
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {privileges.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faGift} className="text-4xl text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No hay privilegios personalizados
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                {isPadre 
                  ? 'Crea privilegios únicos que complementen los privilegios base del sistema'
                  : 'Los padres pueden crear privilegios personalizados especiales para la familia'
                }
              </p>
              {isPadre && (
                <Button variant="primary" onClick={handleAddPrivilege}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Crear Primer Privilegio
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faTrophy} className="text-accent-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                        {privileges.length}
                      </p>
                      <p className="text-sm text-accent-600 dark:text-accent-400">
                        Total privilegios
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faStar} className="text-success-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                        {privileges.filter(p => p.points <= 50).length}
                      </p>
                      <p className="text-sm text-success-600 dark:text-success-400">
                        Fáciles (≤50 pts)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                        {privileges.filter(p => p.points > 50 && p.points <= 100).length}
                      </p>
                      <p className="text-sm text-warning-600 dark:text-warning-400">
                        Medios (51-100 pts)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faTrophy} className="text-danger-500 text-xl" />
                    <div>
                      <p className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                        {privileges.filter(p => p.points > 100).length}
                      </p>
                      <p className="text-sm text-danger-600 dark:text-danger-400">
                        Difíciles ({'>'}100 pts)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de privilegios */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {privileges
                  .sort((a, b) => a.points - b.points) // Ordenar por puntos
                  .map(privilege => {
                    const privilegeId = privilege.id || privilege.privilegioId;
                    
                    return (
                      <div 
                        key={privilegeId} 
                        className="border rounded-lg p-6 transition-all bg-white dark:bg-neutral-800 hover:shadow-lg"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FontAwesomeIcon icon={faGift} className="text-accent-500" />
                              <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                                {privilege.name}
                              </h5>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg font-bold ${getPointsColor(privilege.points)}`}>
                                {privilege.points} puntos
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                privilege.points <= 50 ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200' :
                                privilege.points <= 100 ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200' :
                                privilege.points <= 200 ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200' :
                                'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200'
                              }`}>
                                {getPointsLabel(privilege.points)}
                              </span>
                            </div>
                            {privilege.description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
                                {privilege.description}
                              </p>
                            )}
                          </div>
                          {isPadre && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditPrivilege(privilege)}
                                className="p-1 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900 rounded transition-colors"
                                title="Editar privilegio"
                              >
                                <FontAwesomeIcon icon={faEdit} size="sm" />
                              </button>
                              <button
                                onClick={() => handleDeletePrivilege(privilege)}
                                className="p-1 text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-900 rounded transition-colors"
                                title="Eliminar privilegio"
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Barra de progreso simulada */}
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-3">
                          <div 
                            className="bg-gradient-to-r from-accent-500 to-accent-500 h-2 rounded-full"
                            style={{ width: `${Math.min((privilege.points / 500) * 100, 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                          <span>Dificultad: {getPointsLabel(privilege.points)}</span>
                          <span>ID: {privilegeId?.substring(0, 8)}...</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Información adicional */}
              <div className="mt-6 p-4 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faGift} className="text-accent-500 mt-1" />
                  <div>
                    <h5 className="font-medium text-accent-900 dark:text-accent-100 mb-1">
                      Sobre los Privilegios Personalizados
                    </h5>
                    <ul className="text-sm text-accent-700 dark:text-accent-300 space-y-1">
                      <li>• Los privilegios aparecerán junto a los privilegios base del sistema</li>
                      <li>• Los hijos podrán canjearlos cuando tengan suficientes puntos</li>
                      <li>• Puedes crear privilegios únicos para situaciones especiales</li>
                      <li>• Se recomienda usar entre 30-200 puntos para mantener equilibrio</li>
                      <li>• Los privilegios se sincronizan automáticamente en tiempo real</li>
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
        title={editingPrivilege ? 'Editar Privilegio Personalizado' : 'Nuevo Privilegio Personalizado'}
      >
        <div className="max-w-md w-full">

          <form onSubmit={(e) => { e.preventDefault(); handleSavePrivilege(); }} className="space-y-4">
            <Field
              label="Nombre del privilegio"
              name="name"
              value={formData.name}
              onChange={(e) => updateFormField('name', e.target.value)}
              placeholder="Ej: Elegir restaurante para cenar"
              maxLength={60}
              required
              disabled={saving}
              error={errors.name}
              hint={`${formData.name.length}/60 caracteres`}
            />

            {/* Puntos necesarios */}
            <div>
              <Field
                label="Puntos necesarios"
                name="points"
                type="number"
                min={1}
                max={500}
                value={formData.points}
                onChange={(e) => updateFormField('points', parseInt(e.target.value) || 0)}
                required
                disabled={saving}
                error={errors.points}
                hint="Recomendado: entre 30 y 80 para privilegios especiales"
              />
              
              {/* Indicador visual de dificultad */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <span>Dificultad: {getPointsLabel(formData.points)}</span>
                  <span className={getPointsColor(formData.points)}>
                    {formData.points} puntos
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      formData.points <= 50 ? 'bg-success-500' :
                      formData.points <= 100 ? 'bg-warning-500' :
                      formData.points <= 200 ? 'bg-warning-500' : 'bg-danger-500'
                    }`}
                    style={{ width: `${Math.min((formData.points / 500) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>Fácil (1-50)</span>
                  <span>Medio (51-100)</span>
                  <span>Difícil (101-200)</span>
                  <span>Muy difícil (201-500)</span>
                </div>
              </div>
              
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Recomendado: 30-80 puntos para privilegios especiales
              </p>
            </div>

            <Field
              as="textarea"
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              placeholder="Detalles, condiciones o instrucciones"
              rows={3}
              maxLength={300}
              disabled={saving}
              error={errors.description}
              hint={`Opcional. ${formData.description.length}/300 caracteres`}
            />

            <div className="rounded-lg bg-surface-sunken px-3">
              <Checkbox
                name="unlocked"
                label="Privilegio desbloqueado por defecto"
                description={
                  formData.unlocked
                    ? 'Los hijos pueden canjearlo sin restricciones'
                    : 'Los hijos necesitan alcanzar los puntos para desbloquearlo'
                }
                checked={formData.unlocked}
                onChange={(e) => updateFormField('unlocked', e.target.checked)}
                disabled={saving}
              />
            </div>

            {/* Preview del privilegio */}
            <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-accent-900 dark:text-accent-100 mb-2">
                Vista previa:
              </h4>
              <div className="p-4 border border-accent-200 dark:border-accent-800 rounded-lg bg-white dark:bg-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGift} className="text-accent-500" />
                  <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formData.name || 'Nombre del privilegio'}
                  </h5>
                </div>
                <p className="text-sm text-accent-600 dark:text-accent-400 mb-2">
                  {formData.points} puntos necesarios
                </p>
                {formData.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    {formData.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    formData.points <= 50 ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200' :
                    formData.points <= 100 ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200' :
                    formData.points <= 200 ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200' :
                    'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200'
                  }`}>
                    {getPointsLabel(formData.points)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    formData.unlocked 
                      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                  }`}>
                    {formData.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </span>
                </div>
              </div>
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
              <button
                type="submit"
                className="flex-1 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded px-4 py-2 transition-colors disabled:opacity-60 flex items-center justify-center"
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
                    {editingPrivilege ? 'Actualizar' : 'Crear Privilegio'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default PrivilegeManagement;
                  