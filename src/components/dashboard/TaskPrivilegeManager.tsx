// src/components/dashboard/TaskPrivilegeManager.tsx
import React, { useState, useEffect } from "react";
import { getPrivilegeHistory } from "../../services/privilegesService";
import { PrivilegeHistory } from "../../types/privilegeTypes";

interface TaskPrivilegeManagerProps {
  childId: string;
}

const TaskPrivilegeManager: React.FC<TaskPrivilegeManagerProps> = ({ childId }) => {
  const [privilegeHistory, setPrivilegeHistory] = useState<PrivilegeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivilegeHistory = async () => {
      if (!childId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Obtener historial de privilegios del child específico
        const history = await getPrivilegeHistory(childId);
        setPrivilegeHistory(history);
      } catch (err) {
        console.error('Error fetching privilege history:', err);
        setError('Error al cargar el historial de privilegios');
      } finally {
        setLoading(false);
      }
    };

    fetchPrivilegeHistory();
  }, [childId]);

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Historial de Privilegios</h2>
        <p className="text-neutral-600">Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Historial de Privilegios</h2>
        <p className="text-danger-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Historial de Privilegios</h2>
      {privilegeHistory.length === 0 ? (
        <p className="text-neutral-500">No hay privilegios redimidos aún.</p>
      ) : (
        <div className="space-y-3">
          {privilegeHistory.map((privilege, index) => (
            <div key={index} className="p-3 border rounded-lg bg-white dark:bg-neutral-800 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {privilege.privilegeName || 'Privilegio sin nombre'}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Fecha: {privilege.dateUnlocked}
                  </p>
                </div>
                <span className="text-xs bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200 px-2 py-1 rounded-full">
                  Redimido
                </span>
              </div>
              {privilege.unlockedBy && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Redimido por: {privilege.unlockedBy}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskPrivilegeManager;