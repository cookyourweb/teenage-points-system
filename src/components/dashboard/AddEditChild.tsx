import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import { fetchCategorias } from "../../services/faqsService";
import { Child } from "../../types/familyTypes";
import { Categoria, Pregunta } from "../../types/faqsTypes";
import { familyService } from "../../services/familyService";
import Modal from "../ui/Modal";

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

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const categoriasData = await fetchCategorias();
        const tipoAdolescenteCategoria = categoriasData.find(c => c.titulo.toLowerCase() === "tipo de adolescente");
        if (tipoAdolescenteCategoria) {
          setCategoria(tipoAdolescenteCategoria);
          setTiposAdolescente(childToEdit?.tiposAdolescente || []);
        }
      } catch (err) {
        console.error("Error al cargar las categorías:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCategorias();
  }, [childToEdit]);

  const tipoExiste = (tipo: string, lista: string[]) => {
    return lista.some(t => t.toLowerCase() === tipo.toLowerCase());
  };

  const handleTipoChange = (preguntaId: string) => {
    const pregunta = categoria?.preguntas.find(p => p.id === preguntaId);
    if (!pregunta) return;

    setTiposAdolescente((prev: string[]) => {
      if (tipoExiste(pregunta.titulo, prev)) {
        return prev.filter(tipo => tipo.toLowerCase() !== pregunta.titulo.toLowerCase());
      }
      return [...prev, pregunta.titulo];
    });
  };

  const handleSave = async () => {
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

    const uniqueTipos = [...new Set(tiposAdolescente.map(tipo => tipo.trim()))];
    const childId = childToEdit?.id || `new-${Date.now()}`;
    const normalizedName = nombre.trim().toLowerCase().replace(/\s+/g, '-');
    const rewardLink = `/family/${normalizedName}/${childId}`;

    const child: Child = {
      id: childId,
      nombre: nombre.trim(),
      edad,
      tiposAdolescente: uniqueTipos,
      rewardLink,
    };

    try {
      if (childToEdit) {
        await familyService.updateChildInFamily(familyId, childId, child);
      } else {
        await familyService.addChildToFamily(familyId, child);
      }
      await onSave(child);
      onCancel();
    } catch (err) {
      console.error("Error al guardar el hijo:", err);
      alert("No se pudo guardar el hijo. Por favor, inténtalo de nuevo más tarde.");
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-neutral-800 shadow-md rounded-md transition-colors">
      <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">{childToEdit ? "Estos son los datos de tu hijo" : "Vamos a añadir a tu hijo"}</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre</label>
          <input 
            type="text" 
            id="nombre" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value.replace(/\s+/g, ' '))} 
            onBlur={(e) => setNombre(e.target.value.trim())}
            required 
            className="mt-1 block w-full p-3 rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100" 
          />
        </div>

        <div className="mb-4">
          <label htmlFor="edad" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Edad</label>
          <input 
            type="number" 
            id="edad" 
            value={edad} 
            onChange={(e) => setEdad(Math.max(0, Number(e.target.value)))} 
            min="0"
            required 
            className="mt-1 block w-full p-3 rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100" 
          />
        </div>

        <div className="mb-4">
          {loading ? (
            <p>Cargando preguntas...</p>
          ) : categoria ? (
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Tipos de Adolescente</h3>
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
                        <span className="flex items-center text-neutral-900 dark:text-neutral-100">
                          {pregunta.titulo}
                          <button 
                            type="button" 
                            onClick={() => { 
                              setSelectedPregunta(pregunta); 
                              setShowModal(true); 
                            }} 
                            className="ml-2 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
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
          <Button variant="neutral" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave}>{childToEdit ? "Guardar Cambios" : "Guardar"}</Button>
        </div>
      </form>

      {showModal && selectedPregunta && (
        <Modal onClose={() => setShowModal(false)} isOpen={showModal}>
          <h2 className="text-lg font-bold">Consejos para tratar a estos adolescentes</h2>
          <p><strong>Definición:</strong> {selectedPregunta.definicion}</p>
          <p><strong>Soluciones:</strong></p>
          {selectedPregunta.soluciones.map(sol => (
            <p key={sol.id}>{sol.texto}</p>
          ))}
        </Modal>
      )}
    </div>
  );
};

export default AddEditChild;