// src/hooks/useChildManagement.ts
import { useState, useEffect, useCallback } from "react";
import { fetchFamilyById, addChildToFamily, updateChildInFamily, deleteChildFromFamily } from "../services/familyService";
import { Child, Family } from "../types/familyTypes";

interface UseChildManagementReturn {
  family: Family | null;
  children: Child[];
  isLoading: boolean;
  error: string | null;
  handleAddChild: (child: Child) => Promise<boolean>;
  handleEditChild: (childId: string, updatedChild: Child) => Promise<boolean>;
  handleDeleteChild: (childId: string) => Promise<boolean>;
  refreshFamily: () => Promise<void>;
  clearError: () => void;
}

const useChildManagement = (initialFamilyId: string | null): UseChildManagementReturn => {
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar la familia
  const loadFamily = useCallback(async () => {
    if (!initialFamilyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedFamily = await fetchFamilyById(initialFamilyId);
      
      if (fetchedFamily) {
        setFamily(fetchedFamily);
        
        // Extraer los hijos del objeto de familia
        const childrenArray = fetchedFamily.miembros?.hijos 
          ? Object.values(fetchedFamily.miembros.hijos)
          : [];
        
        setChildren(childrenArray);
      } else {
        setError("No se encontró la familia");
      }
    } catch (err) {
      console.error("Error loading family:", err);
      setError("Error al cargar la familia");
    } finally {
      setIsLoading(false);
    }
  }, [initialFamilyId]);

  // Cargar familia al montar el hook
  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  // Función para añadir un hijo
  const handleAddChild = async (child: Child): Promise<boolean> => {
    if (!family) {
      setError("No hay familia cargada");
      return false;
    }

    try {
      setError(null);
      
      await addChildToFamily(family.familyId, child);

      // Actualizar estado local
      setFamily(prev => prev ? {
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: {
            ...prev.miembros.hijos,
            [child.id]: child,
          },
        },
      } : prev);

      setChildren(prev => [...prev, child]);

      return true;
    } catch (err) {
      console.error("Error adding child:", err);
      setError("Error al añadir el hijo");
      return false;
    }
  };

  // Función para refrescar los datos de la familia
  const refreshFamily = async (): Promise<void> => {
    await loadFamily();
  };

  // Función para limpiar errores
  const clearError = (): void => {
    setError(null);
  };

  // Función para editar un hijo
  const handleEditChild = async (childId: string, updatedChild: Child): Promise<boolean> => {
    if (!family) {
      setError("No hay familia cargada");
      return false;
    }

    try {
      setError(null);
      
      await updateChildInFamily(family.familyId, childId, updatedChild);
      
      // Actualizar estado local
      setFamily(prev => prev ? {
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: {
            ...prev.miembros.hijos,
            [childId]: updatedChild,
          },
        },
      } : prev);

      setChildren(prev => prev.map(child => 
        child.id === childId ? updatedChild : child
      ));
      
      return true;
    } catch (err) {
      console.error("Error editing child:", err);
      setError("Error al editar el hijo");
      return false;
    }
  };

  // Función para eliminar un hijo
  const handleDeleteChild = async (childId: string): Promise<boolean> => {
    if (!family) {
      setError("No hay familia cargada");
      return false;
    }

    try {
      setError(null);
      
      await deleteChildFromFamily(family.familyId, childId);
      
      // Actualizar estado local
      setFamily(prev => prev ? {
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: Object.fromEntries(
            Object.entries(prev.miembros.hijos || {}).filter(([id]) => id !== childId)
          ),
        },
      } : prev);

      setChildren(prev => prev.filter(child => child.id !== childId));

      return true;
    } catch (err) {
      console.error("Error deleting child:", err);
      setError("Error al eliminar el hijo");
      return false;
    }
  };

  return {
    family,
    children,
    isLoading,
    error,
    handleAddChild,
    handleEditChild,
    handleDeleteChild,
    refreshFamily,
    clearError,
  };
};

export default useChildManagement;
