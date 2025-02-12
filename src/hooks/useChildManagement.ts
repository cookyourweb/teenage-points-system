import { useState, useEffect } from "react";
import { fetchFamilyById, addChildToFamily, deleteChildFromFamily, updateChildInFamily } from "../services/familyService";
import { Child, Family } from "../types/familyTypes";

const useChildManagement = (initialFamilyId: string | null) => {
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadFamily = async () => {
      if (!initialFamilyId) return;
      setIsLoading(true);
      try {
        const fetchedFamily = await fetchFamilyById(initialFamilyId);
        setFamily(fetchedFamily);
      } catch (err) {
        console.error(err);
        setError("Error al cargar la familia.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFamily();
  }, [initialFamilyId]);

  const handleAddChild = async (child: Child) => {
    if (!family) return false;
    try {
      await addChildToFamily(family.familyId, child);
      setFamily(prev => prev ? ({
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: {
            ...prev.miembros.hijos,
            [child.id]: child,
          },
        },
      }) : prev);
      return true;
    } catch {
      setError("Error al añadir el hijo.");
      return false;
    }
  };

  const handleEditChild = async (childId: string, updatedChild: Child) => {
    if (!family) return false;
    try {
      await updateChildInFamily(family.familyId, childId, updatedChild);
      setFamily(prev => prev ? ({
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: {
            ...prev.miembros.hijos,
            [childId]: updatedChild,
          },
        },
      }) : prev);
      return true;
    } catch {
      setError("Error al editar el hijo.");
      return false;
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!family) return;
    try {
      await deleteChildFromFamily(family.familyId, childId);
      setFamily(prev => prev ? ({
        ...prev,
        miembros: {
          ...prev.miembros,
          hijos: Object.fromEntries(
            Object.entries(prev.miembros.hijos).filter(([key]) => key !== childId)
          ),
        },
      }) : prev);
    } catch {
      setError("Error al eliminar el hijo.");
    }
  };

  return {
    family,
    isLoading,
    error,
    handleAddChild,
    handleEditChild,
    handleDeleteChild,
  };
};

export default useChildManagement;
