import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import AddEditChild from "./AddEditChild";
import InviteMember from "./InviteMember";
import CompleteProfile from "./CompleteProfile";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Card } from "../ui/Card";
import { Child } from "../../types/familyTypes";
import { useUserRole } from "../../hooks/useUserRole";
import { addChildToFamily, fetchFamilyById } from "../../services/familyService";
import { doc, getDoc } from "firebase/firestore";

const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | undefined>(undefined);
const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  const { role, isLoading: isRoleLoading, error: roleError } = useUserRole(user?.uid);
  const isAdmin = role === "admin";

  // Obtener el ID de la familia del usuario
  useEffect(() => {
    const fetchFamilyId = async () => {
      if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef); 
        console.log("Datos del usuario:", userDoc.data()); // Depuración

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const retrievedFamilyId = userData.familyId; // Aquí debe ser solo un string
          if (retrievedFamilyId && typeof retrievedFamilyId === "string") {
            setFamilyId(retrievedFamilyId);
          }
        }
      }
    };

    fetchFamilyId();
  }, [user]);

  // Cargar los hijos de la familia
  useEffect(() => {
    const fetchChildren = async () => {
      if (!familyId) {
        console.warn("No se puede cargar los hijos: el ID de la familia es nulo.");
        return;
      }

      try {
        const family = await fetchFamilyById(familyId);
        if (family) {
          const allChildren = Object.values(family.miembros.hijos || {});
          setChildren(allChildren);
        } else {
          console.warn("No se encontró la familia con el ID proporcionado.");
          setChildren([]);
        }
      } catch (err) {
        console.error("Error al cargar los hijos:", err);
        setError("No se pudieron cargar los hijos.");
      }
    };

    fetchChildren();
  }, [familyId]);

  const handleAddChild = () => {
    console.log("Add Child button clicked"); // Debugging log
    setIsEditing(true);
    setEditingChild(undefined);
  };

  const handleEditChild = (id: string) => {
    const childToEdit = children.find(child => child.id === id);
    if (childToEdit) {
      setIsEditing(true);
      setEditingChild(childToEdit);
    }
  };

  const handleSaveChild = async (child: Child) => {
    if (!familyId) return;

    try {
      await addChildToFamily(familyId, child);
      const family = await fetchFamilyById(familyId);
      if (family) {
        const allChildren = Object.values(family.miembros.hijos || {});
        setChildren(allChildren);
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Error al guardar el hijo:", err);
      setError("No se pudo guardar el hijo.");
    }
  };

  const handleCloseForm = () => {
    setIsEditing(false);
    setEditingChild(undefined);
  };

  const handleProfileUpdated = () => {
    setShowCompleteProfile(false);
  };

  if (isRoleLoading) {
    return <p>Cargando...</p>;
  }

  if (error || roleError) {
    return <p>{error || roleError || "Error inesperado."}</p>;
  }

  if (!familyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard Familiar</h1>
        <p className="text-red-600 mt-4">
          No se encontró un ID de familia asociado a este usuario. Por favor, contacte al soporte.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bienvenido, {user?.displayName || "Usuario"}.</h1>
      <p className="mt-4">
        Este es tu sistema de puntos para adolescentes. Aquí puedes añadir a tus hijos y enviar invitaciones a otros miembros de tu familia.
      </p>

      {showCompleteProfile && user && (
        <CompleteProfile userId={user.uid} onProfileUpdated={handleProfileUpdated} />
      )}

      <div className="flex space-x-4 mt-4">
        <Button onClick={() => { console.log("Button clicked"); handleAddChild(); }}>Añadir Hijo</Button>
        <Button onClick={() => setIsInviting(true)} variant="secondary">
          Invitar Miembro
        </Button>
        {isAdmin && (
          <Button onClick={() => navigate("/admin/faqs")} variant="secondary">
            Administrar FAQs
          </Button>
        )}
      </div>

      {isEditing && (
        <AddEditChild
          childToEdit={editingChild}
          familyId={familyId!}
          onSave={handleSaveChild}
          onCancel={handleCloseForm}
        />
      )}

      {isInviting && (
        <Modal onClose={() => setIsInviting(false)} isOpen={isInviting}>
          <InviteMember familyId={familyId!} onClose={() => setIsInviting(false)} />
        </Modal>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map((child) => (
          <Card key={child.id}>
            <p>
              <strong>Nombre:</strong> {child.nombre}
            </p>
            <p>
              <strong>Edad:</strong> {child.edad}
            </p>
            <p>
<strong>Tipo de Adolescente:</strong> {child.tiposAdolescente.length > 0 ? child.tiposAdolescente.join(', ') : 'No hay tipos de adolescente'}
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => handleEditChild(child.id)}>Editar</Button>
              <Button onClick={() => {
                  navigate(`/reward-tracker/${familyId}/${child.id}`); // Navigate to RewardTracker with familyId
              }}>
                  Acceder a su Sistema de Puntos
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
