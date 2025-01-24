import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import { fetchCategorias } from "../../services/faqsService";
import { Child } from "../../types/familyTypes";
import { Categoria, Pregunta } from "../../types/faqsTypes"; // Importar Pregunta
import { addChildToFamily } from "../../services/familyService";
import Modal from "../ui/Modal"; // Asegúrate de que el componente Modal esté importado

interface AddEditChildProps {
  childToEdit?: Child;
  familyId: string;
  onSave: (child: Child) => Promise<void>;
  onCancel: () => void;
}

const AddEditChild: React.FC<AddEditChildProps> = ({
  childToEdit,
  familyId,
  onSave,
  onCancel,
}) => {
  const [nombre, setNombre] = useState(childToEdit?.nombre || "");
  const [edad, setEdad] = useState<number>(childToEdit?.edad || 0);
  const [tiposAdolescente, setTiposAdolescente] = useState<string[]>(
    (childToEdit?.tiposAdolescente as string[]) || []
  );
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPregunta, setSelectedPregunta] = useState<Pregunta | null>(null);
  // const [rewardLink, setRewardLink] = useState<string>("");

  // Cargar la categoría "Tipo de Adolescente"
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const categoriasData = await fetchCategorias();
        const tipoAdolescenteCategoria = categoriasData.find(c => c.titulo.toLowerCase() === "tipo de adolescente");
        if (tipoAdolescenteCategoria) {
          setCategoria(tipoAdolescenteCategoria); // Guardamos la categoría en el estado
          console.log("Preguntas de la categoría:", tipoAdolescenteCategoria.preguntas); // Verificar preguntas
        } else {
          console.log("No se encontró la categoría 'Tipo de Adolescente'"); // Depuración
        }
      } catch (err) {
        console.error("Error al cargar las categorías:", err);
      } finally {
        setLoading(false); // Para detener el estado de carga
      }
    };

    loadCategorias();
  }, []);

  const handleTipoChange = (preguntaId: string) => {
    setTiposAdolescente((prev) =>
      prev.includes(preguntaId)
        ? prev.filter((id) => id !== preguntaId)
        : [...prev, preguntaId]
    );
  };

  const handleSave = async () => {
    const selectedTitles = tiposAdolescente.map(id => {
      const pregunta = categoria?.preguntas.find(p => p.id === id);
      return pregunta ? pregunta.titulo : id; // Use title if found, otherwise keep ID
    });

    if (!nombre || !edad) {
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    // Generar el link de Reward Tracker en formato relativo
    const childId = childToEdit?.id || `new-${Date.now()}`;

    const rewardLink = `http://localhost/family/${nombre}/${childId}`; // Formato relativo

    const child: Child = {
      id: childId,
      nombre,
      edad,
      tiposAdolescente: selectedTitles, // Use selectedTitles to save titles instead of IDs
      rewardLink,
    };

    try {
      await addChildToFamily(familyId, child);
      await onSave(child);
      onCancel();
    } catch (err) {
      console.error("Error al guardar el hijo:", err);
      alert("No se pudo guardar el hijo. Por favor, inténtalo de nuevo más tarde.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">{childToEdit ? "Editar Hijo" : "Añadir Hijo"}</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
          <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        <div className="mb-4">
          <label htmlFor="edad" className="block text-sm font-medium text-gray-700">Edad</label>
          <input type="number" id="edad" value={edad} onChange={(e) => setEdad(Number(e.target.value))} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        <div className="mb-4">
          {loading ? (
            <p>Cargando preguntas...</p>
          ) : categoria ? (
            <div>
              <h3 className="text-lg font-bold">Tipos de Adolescente</h3>
              <div className="mt-2">
                {categoria.preguntas.map((pregunta) => (
                  <div key={pregunta.id} className="mb-4">
                    <label className="flex items-center">
                      <input type="checkbox" value={pregunta.id} checked={tiposAdolescente.includes(pregunta.id)} onChange={() => handleTipoChange(pregunta.id)} className="mr-2" />
                      <span className="flex items-center">
                        {pregunta.titulo}
                        <button type="button" onClick={() => { setSelectedPregunta(pregunta); setShowModal(true); }} className="ml-2 text-blue-500 hover:underline">❓</button>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>No se encontraron preguntas para "Tipo de Adolescente".</p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onCancel} variant="secondary">Cancelar</Button>
          <Button type="submit" variant="primary">{childToEdit ? "Guardar Cambios" : "Añadir Hijo"}</Button>
        </div>
      </form>

      {/* Agregar el link a Reward Tracker */}
      {/* Eliminar el link inicial que no funciona */}

      {/* Modal para mostrar definición y soluciones */}
      {showModal && selectedPregunta && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-lg font-bold">Consejos para tratar a estos adolescentes</h2>
          <p><strong>Definición:</strong> {selectedPregunta.definicion}</p>
          <p><strong>Soluciones:</strong> {selectedPregunta.soluciones.join(", ")}</p>
        </Modal>
      )}
    </div>
  );
};

export default AddEditChild;
