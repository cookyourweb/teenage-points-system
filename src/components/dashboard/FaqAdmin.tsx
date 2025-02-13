//FaqAdmin.tsx
import React, { useEffect, useState } from "react";
import {
  fetchCategorias,
  addCategoria,
  updateCategoria,
  deleteCategoria,
  addPregunta,
  updatePregunta,
  deletePregunta,
  addSolucion,
  updateSolucion,
  deleteSolucion
} from "../../services/faqsService";
import { Categoria, Pregunta, Solucion } from "../../types/faqsTypes";
import Button from "../ui/Button";

const FaqAdmin: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Campos para nueva categoría
  const [newCategoriaTitulo, setNewCategoriaTitulo] = useState<string>("");
  const [newCategoriaDefinicion, setNewCategoriaDefinicion] = useState<string>("");

  // Almacena el estado de edición de cada categoría (para editar su título/definición)
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editCategoriaTitulo, setEditCategoriaTitulo] = useState<Record<string, string>>({});
  const [editCategoriaDefinicion, setEditCategoriaDefinicion] = useState<Record<string, string>>({});

  // Almacena el campo de nueva pregunta para cada categoría
  const [newPreguntaTitulo, setNewPreguntaTitulo] = useState<Record<string, string>>({});
  const [newPreguntaDefinicion, setNewPreguntaDefinicion] = useState<Record<string, string>>({});

  // Almacena el campo de nueva solución para cada pregunta (key: categoriaId-preguntaId)
  const [newSolucionTexto, setNewSolucionTexto] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    const data = await fetchCategorias();
    setCategorias(data);
  };

  const handleAddCategoria = async () => {
    if (!newCategoriaTitulo.trim()) return;
    await addCategoria(newCategoriaTitulo, newCategoriaDefinicion);
    setNewCategoriaTitulo("");
    setNewCategoriaDefinicion("");
    await loadCategorias();
  };

  const handleEditCategoria = (cat: Categoria) => {
    setEditMode((prev) => ({ ...prev, [cat.id]: true }));
    setEditCategoriaTitulo((prev) => ({ ...prev, [cat.id]: cat.titulo }));
    setEditCategoriaDefinicion((prev) => ({ ...prev, [cat.id]: cat.definicion }));
  };

  const handleUpdateCategoria = async (catId: string) => {
    const titulo = editCategoriaTitulo[catId];
    const definicion = editCategoriaDefinicion[catId];
    if (!titulo.trim()) return;

    await updateCategoria(catId, { titulo, definicion });
    setEditMode((prev) => ({ ...prev, [catId]: false }));
    await loadCategorias();
  };

  const handleDeleteCategoria = async (catId: string) => {
    const confirmDelete = window.confirm("¿Estás seguro de eliminar esta categoría?");
    if (!confirmDelete) return;

    await deleteCategoria(catId);
    await loadCategorias();
  };

  const handleAddPreguntaClick = async (catId: string) => {
    const titulo = newPreguntaTitulo[catId];
    const definicion = newPreguntaDefinicion[catId];
    if (!titulo || !titulo.trim()) return;

    const nuevaPregunta: Pregunta = {
      id: crypto.randomUUID(),
      titulo,
      definicion: definicion || "", // Si no se pone nada, quedará vacío
      soluciones: [],
    };

    await addPregunta(catId, nuevaPregunta);
    setNewPreguntaTitulo((prev) => ({ ...prev, [catId]: "" }));
    setNewPreguntaDefinicion((prev) => ({ ...prev, [catId]: "" }));
    await loadCategorias();
  };

  const handleUpdatePreguntaClick = async (catId: string, pregunta: Pregunta) => {
    const nuevoTitulo = prompt("Editar título de la pregunta:", pregunta.titulo);
    if (nuevoTitulo === null) return; // Si cancela el prompt, no hacer nada

    const nuevaDefinicion = prompt("Editar definición de la pregunta:", pregunta.definicion);
    if (nuevaDefinicion === null) return;

    await updatePregunta(catId, pregunta.id, { titulo: nuevoTitulo, definicion: nuevaDefinicion });
    await loadCategorias();
  };

  const handleDeletePreguntaClick = async (catId: string, preguntaId: string) => {
    const confirmDelete = window.confirm("¿Estás seguro de eliminar esta pregunta?");
    if (!confirmDelete) return;

    await deletePregunta(catId, preguntaId);
    await loadCategorias();
  };

  const handleAddSolucionClick = async (catId: string, pregunta: Pregunta) => {
    const key = `${catId}-${pregunta.id}`;
    const texto = newSolucionTexto[key];
    if (!texto || !texto.trim()) return;

    const nuevaSolucion: Solucion = {
      id: crypto.randomUUID(),
      texto,
    };

    await addSolucion(catId, pregunta.id, nuevaSolucion);
    setNewSolucionTexto((prev) => ({ ...prev, [key]: "" }));
    await loadCategorias();
  };

  const handleUpdateSolucionClick = async (catId: string, pregunta: Pregunta, solucion: Solucion) => {
    const nuevoTexto = prompt("Editar texto de la solución:", solucion.texto);
    if (!nuevoTexto) return;

    await updateSolucion(catId, pregunta.id, solucion.id, nuevoTexto);
    await loadCategorias();
  };

  const handleDeleteSolucionClick = async (catId: string, pregunta: Pregunta, solucionId: string) => {
    const confirmDelete = window.confirm("¿Estás seguro de eliminar esta solución?");
    if (!confirmDelete) return;

    await deleteSolucion(catId, pregunta.id, solucionId);
    await loadCategorias();
  };

  return (
<div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Administración de FAQs</h1>

      {/* Agregar categoría */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Categorías</h2>
        <label className="block font-medium">Título de la categoría:</label>
        <input
          type="text"
          value={newCategoriaTitulo}
          onChange={(e) => setNewCategoriaTitulo(e.target.value)}
          placeholder="Título de la categoría"
          className="border p-2 rounded mr-2 w-full"
        />
        <label className="block font-medium mt-2">Definición de la categoría:</label>
        <input
          type="text"
          value={newCategoriaDefinicion}
          onChange={(e) => setNewCategoriaDefinicion(e.target.value)}
          placeholder="Definición de la categoría"
          className="border p-2 rounded mr-2 w-full"
        />
        <Button onClick={handleAddCategoria} className="mt-2">Agregar Categoría</Button>
      </div>

      <ul className="space-y-4">
        {categorias.map((cat) => (
          <li key={cat.id} className="p-4 bg-gray-100 rounded shadow">
            {editMode[cat.id] ? (
              <div>
                <label className="block font-medium">Editar Título:</label>
                <input
                  type="text"
                  value={editCategoriaTitulo[cat.id] || ""}
                  onChange={(e) =>
                    setEditCategoriaTitulo((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  className="border p-2 rounded w-full"
                />
                <label className="block font-medium mt-2">Editar Definición:</label>
                <input
                  type="text"
                  value={editCategoriaDefinicion[cat.id] || ""}
                  onChange={(e) =>
                    setEditCategoriaDefinicion((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  className="border p-2 rounded w-full"
                />
                <div className="flex space-x-2 mt-2">
<Button onClick={() => handleUpdateCategoria(cat.id)}>Guardar Cambios</Button>
                  <Button onClick={() => setEditMode((prev) => ({ ...prev, [cat.id]: false }))}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold">
                  <strong>Categoría:</strong> {cat.titulo}
                </p>
                <p className="italic">Definición: {cat.definicion}</p>
                <div className="flex space-x-2 mt-2">
<Button onClick={() => handleEditCategoria(cat)}>Editar</Button>
<Button onClick={() => handleDeleteCategoria(cat.id)}>Eliminar</Button>
                </div>
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium">Agregar Pregunta a {cat.titulo}:</h3>
              <label className="block font-medium mt-2">Título de la pregunta:</label>
              <input
                type="text"
                value={newPreguntaTitulo[cat.id] || ""}
                onChange={(e) => setNewPreguntaTitulo((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder="Título de la pregunta"
                className="border p-2 rounded w-full mt-2"
              />
              <label className="block font-medium mt-2">Definición de la pregunta:</label>
              <input
                type="text"
                value={newPreguntaDefinicion[cat.id] || ""}
                onChange={(e) => setNewPreguntaDefinicion((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder="Definición de la pregunta"
                className="border p-2 rounded w-full mt-2"
              />
              <Button onClick={() => handleAddPreguntaClick(cat.id)} className="mt-2">Agregar Pregunta</Button>

              {cat.preguntas.length > 0 && (
                <ul className="mt-4 space-y-4">
                  {cat.preguntas.map((preg) => (
                    <li key={preg.id} className="bg-white p-4 rounded border">
                      <p className="font-semibold">Título: {preg.titulo}</p>
                      <p className="italic">Definición: {preg.definicion}</p>
                      <div className="flex space-x-2 mt-2">
                        <Button onClick={() => handleUpdatePreguntaClick(cat.id, preg)}>
                          Editar Pregunta
                        </Button>
                        <Button onClick={() => handleDeletePreguntaClick(cat.id, preg.id)}>
                          Eliminar Pregunta
                        </Button>
                      </div>

                      {/* Agregar solución */}
                      <label className="block font-medium mt-2">Nueva solución:</label>
                      <input
                        type="text"
                        value={newSolucionTexto[`${cat.id}-${preg.id}`] || ""}
                        onChange={(e) => setNewSolucionTexto((prev) => ({ ...prev, [`${cat.id}-${preg.id}`]: e.target.value }))}
                        placeholder="Nueva solución"
                        className="border p-2 rounded w-full mt-2"
                      />
                      <Button onClick={() => handleAddSolucionClick(cat.id, preg)} className="mt-2">
                        Agregar Solución
                      </Button>

                      {preg.soluciones.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {preg.soluciones.map((sol) => (
                            <li key={sol.id} className="ml-4 flex items-center justify-between border p-2 rounded">
                              <span>{sol.texto}</span>
                              <div className="flex space-x-2">
                                <Button onClick={() => handleDeleteSolucionClick(cat.id, preg, sol.id)}>
                                  Eliminar
                                </Button>
                                <Button onClick={() => handleUpdateSolucionClick(cat.id, preg, sol)}>
                                  Editar
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 mt-2">Sin soluciones</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FaqAdmin;
