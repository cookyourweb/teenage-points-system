import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import { fetchCategorias } from "../../services/faqsService";
import { Child } from "../../types/familyTypes";
import { Categoria, Pregunta } from "../../types/faqsTypes";
import { addChildToFamily, updateChildInFamily } from "../../services/familyService";
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
  const [nombre, setNombre] = useState<string>(childToEdit ? childToEdit.nombre.trim() : "");
  const [edad, setEdad] = useState<number>(childToEdit ? Math.max(0, childToEdit.edad) : 0);
  const [tiposAdolescente, setTiposAdolescente] = useState<string[]>(childToEdit ? childToEdit.tiposAdolescente : []);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPregunta, setSelectedPregunta] = useState<Pregunta | null>(null);

  // Cargar la categoría "Tipo de Adolescente"
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const categoriasData = await fetchCategorias();
        const tipoAdolescenteCategoria = categoriasData.find(c => c.titulo.toLowerCase() === "tipo de adolescente");
        if (tipoAdolescenteCategoria) {
          setCategoria(tipoAdolescenteCategoria); // Guardamos la categoría en el estado
          setTiposAdolescente(childToEdit?.tiposAdolescente || []); // Set selected types for editing
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
  }, [childToEdit]);

  // Función para verificar si un tipo ya existe (ignorando mayúsculas/minúsculas)
  const tipoExiste = (tipo: string, lista: string[]) => {
    return lista.some(t => t.toLowerCase() === tipo.toLowerCase());
  };

  const handleTipoChange = (preguntaId: string) => {
    const pregunta = categoria?.preguntas.find(p => p.id === preguntaId);
    if (!pregunta) return;

    setTiposAdolescente((prev) => {
      // Si el tipo ya existe (ignorando mayúsculas/minúsculas), lo removemos
      if (tipoExiste(pregunta.titulo, prev)) {
        return prev.filter(tipo => tipo.toLowerCase() !== pregunta.titulo.toLowerCase());
      }
      // Si no existe, lo añadimos
      return [...prev, pregunta.titulo];
    });
  };

  const handleSave = async () => {
    // Validación de campos requeridos según la interfaz Child
    if (!nombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    if (edad <= 0) {
      alert("La edad debe ser mayor que 0.");
      return;
    }

    if (tiposAdolescente.length === 0) {
      alert("Por favor, selecciona al menos un tipo de adolescente.");
      return;
    }

    console.log("Saving child data:", { nombre, edad, tiposAdolescente });

    // Ya no necesitamos mapear los IDs a títulos porque ahora guardamos directamente los títulos
    const uniqueTipos = [...new Set(tiposAdolescente.map(tipo => tipo.trim()))];

    // Si estamos editando, mantener el ID existente
    const childId = childToEdit?.id || `new-${Date.now()}`;
    
    // Generar el rewardLink usando el nombre normalizado (sin espacios)
    const normalizedName = nombre.trim().toLowerCase().replace(/\s+/g, '-');
    const rewardLink = `http://localhost/family/${normalizedName}/${childId}`;

    const child: Child = {
      id: childId,
      nombre: nombre.trim(),
      edad,
      tiposAdolescente: uniqueTipos,
      rewardLink,
    };

    try {
      if (childToEdit) {
        // Si estamos editando, usamos updateChildInFamily
        await updateChildInFamily(familyId, childId, child);
      } else {
        // Si estamos creando uno nuevo, usamos addChildToFamily
        await addChildToFamily(familyId, child);
      }
      await onSave(child);
      onCancel();
    } catch (err) {
      console.error("Error al guardar el hijo:", err);
      alert("No se pudo guardar el hijo. Por favor, inténtalo de nuevo más tarde.");
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">{childToEdit ? "Estos son los datos de tu hijo" : "Vamos a añadir a tu hijo"}</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
          <input 
            type="text" 
            id="nombre" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value.replace(/\s+/g, ' '))} 
            onBlur={(e) => setNombre(e.target.value.trim())}
            required 
            className="mt-1 block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
          />
        </div>

        <div className="mb-4">
          <label htmlFor="edad" className="block text-sm font-medium text-gray-700">Edad</label>
          <input 
            type="number" 
            id="edad" 
            value={edad} 
            onChange={(e) => setEdad(Math.max(0, Number(e.target.value)))} 
            min="0"
            required 
            className="mt-1 block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
          />
        </div>

        <div className="mb-4">
          {loading ? (
            <p>Cargando preguntas...</p>
          ) : categoria ? (
            <div>
              <h3 className="text-lg font-bold">Tipos de Adolescente</h3>
              <div className="mt-2">
                {categoria.preguntas.map((pregunta) => {
                  const isChecked = tipoExiste(pregunta.titulo, tiposAdolescente);
                  return (
                    <div key={pregunta.id} className="mb-4">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          value={pregunta.id} 
                          checked={isChecked}
                          onChange={() => handleTipoChange(pregunta.id)} 
                          className="mr-2" 
                        />
                        <span className="flex items-center">
                          {pregunta.titulo}
                          <button 
                            type="button" 
                            onClick={() => { 
                              setSelectedPregunta(pregunta); 
                              setShowModal(true); 
                            }} 
                            className="ml-2 text-blue-500 hover:underline"
                          >
                            ❓
                          </button>
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p>No se encontraron preguntas para "Tipo de Adolescente".</p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button onClick={onCancel} className="bg-gray-300">Cancelar</Button> {/* Light gray button */}
          <Button onClick={handleSave}>{childToEdit ? "Guardar Cambios" : "Guardar"}</Button>
        </div>
      </form>

      {/* Modal para mostrar definición y soluciones */}
      {showModal && selectedPregunta && (
        <Modal onClose={() => setShowModal(false)} isOpen={showModal}>
          <h2 className="text-lg font-bold">Consejos para tratar a estos adolescentes</h2>
          <p><strong>Definición:</strong> {selectedPregunta.definicion}</p>
          <p><strong>Soluciones:</strong> {selectedPregunta.soluciones.join(", ")}</p>
        </Modal>
      )}
    </div>
  );
};

export default AddEditChild;