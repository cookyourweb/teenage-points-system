//FaqAdmin.tsx
import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Accordion from '../ui/Accordion';
import Field from '../ui/Field';
import Footer from '../Footer';
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
    <div className="min-h-screen bg-surface-page">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
        <div>
          <Link
            to="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
            Volver al panel
          </Link>

          <h1 className="text-2xl font-bold text-content">Administración de preguntas frecuentes</h1>
          <p className="mt-1 text-content-muted">
            Lo que se publica aquí lo ven todas las familias.
          </p>
        </div>

        {/* Nueva categoría */}
        <section
          aria-labelledby="nueva-categoria"
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6"
        >
          <h2 id="nueva-categoria" className="text-lg font-semibold text-content">
            Nueva categoría
          </h2>

          <Field
            label="Título"
            name="nueva-categoria-titulo"
            value={newCategoriaTitulo}
            onChange={(e) => setNewCategoriaTitulo(e.target.value)}
          />
          <Field
            label="Definición"
            name="nueva-categoria-definicion"
            value={newCategoriaDefinicion}
            onChange={(e) => setNewCategoriaDefinicion(e.target.value)}
          />

          <div className="flex">
            <Button onClick={handleAddCategoria}>Añadir categoría</Button>
          </div>
        </section>

        {/* Categorías existentes */}
        <section aria-labelledby="categorias" className="flex flex-col gap-4">
          <h2 id="categorias" className="text-lg font-semibold text-content">
            Categorías publicadas
          </h2>

          {categorias.length === 0 ? (
            <p className="text-content-muted">Todavía no hay ninguna.</p>
          ) : (
            /* Cada categoria se pliega. Con varias, cada una con sus
               preguntas y sus soluciones, esta pantalla es un muro.

               OJO: el titulo del acordeon YA ES UN BOTON, y no se puede meter
               un boton dentro de otro. Por eso Editar y Eliminar van DENTRO
               del panel y no en la cabecera. De paso queda mejor: abres la
               categoria y entonces ves lo que puedes hacerle. */
            <Accordion
              headingLevel={3}
              items={categorias.map((cat) => ({
                id: cat.id,
                titulo: `${cat.titulo} (${cat.preguntas.length} ${cat.preguntas.length === 1 ? 'pregunta' : 'preguntas'})`,
                contenido: (
                  <div className="flex flex-col gap-4 pb-2">
                  {editMode[cat.id] ? (
                    <div className="flex flex-col gap-4">
                      <Field
                        label="Título"
                        name={`editar-titulo-${cat.id}`}
                        value={editCategoriaTitulo[cat.id] || ""}
                        onChange={(e) =>
                          setEditCategoriaTitulo((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                      />
                      <Field
                        label="Definición"
                        name={`editar-definicion-${cat.id}`}
                        value={editCategoriaDefinicion[cat.id] || ""}
                        onChange={(e) =>
                          setEditCategoriaDefinicion((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-3">
                        <Button onClick={() => handleUpdateCategoria(cat.id)}>Guardar cambios</Button>
                        <Button
                          variant="neutral"
                          onClick={() => setEditMode((prev) => ({ ...prev, [cat.id]: false }))}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-content-muted">{cat.definicion}</p>
                      </div>
                      {/* Editar es terciario y Eliminar es destructivo. Antes los
                          dos eran `primary`, o sea que borrar una categoria
                          entera pesaba visualmente lo mismo que guardar. */}
                      <div className="flex shrink-0 gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCategoria(cat)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCategoria(cat.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Preguntas de la categoría */}
                  <div className="flex flex-col gap-4 border-t border-line pt-4">
                    <h4 className="font-medium text-content">Preguntas de «{cat.titulo}»</h4>

                    {cat.preguntas.length > 0 && (
                      <ul className="flex flex-col gap-4">
                        {cat.preguntas.map((preg) => (
                          <li
                            key={preg.id}
                            className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-content">{preg.titulo}</p>
                                <p className="text-sm text-content-muted">{preg.definicion}</p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePreguntaClick(cat.id, preg)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeletePreguntaClick(cat.id, preg.id)}
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </div>

                            {preg.soluciones.length > 0 ? (
                              <ul className="flex flex-col gap-2">
                                {preg.soluciones.map((sol) => (
                                  <li
                                    key={sol.id}
                                    className="flex items-center justify-between gap-3 rounded border border-line bg-surface p-2"
                                  >
                                    <span className="text-sm text-content">{sol.texto}</span>
                                    <div className="flex shrink-0 gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUpdateSolucionClick(cat.id, preg, sol)}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDeleteSolucionClick(cat.id, preg, sol.id)}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-content-muted">Sin soluciones todavía.</p>
                            )}

                            {/* El campo y su boton van EN LA MISMA FILA, alineados
                                por abajo. Antes el boton caia pegado debajo del
                                campo y no se veia que fueran la misma accion. */}
                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <Field
                                  label="Nueva solución"
                                  name={`nueva-solucion-${cat.id}-${preg.id}`}
                                  value={newSolucionTexto[`${cat.id}-${preg.id}`] || ""}
                                  onChange={(e) =>
                                    setNewSolucionTexto((prev) => ({
                                      ...prev,
                                      [`${cat.id}-${preg.id}`]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <Button onClick={() => handleAddSolucionClick(cat.id, preg)}>
                                Añadir
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Nueva pregunta */}
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line-strong p-4">
                      <p className="font-medium text-content">Añadir una pregunta</p>
                      <Field
                        label="Título de la pregunta"
                        name={`nueva-pregunta-titulo-${cat.id}`}
                        value={newPreguntaTitulo[cat.id] || ""}
                        onChange={(e) =>
                          setNewPreguntaTitulo((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                      />
                      <Field
                        label="Definición"
                        name={`nueva-pregunta-definicion-${cat.id}`}
                        value={newPreguntaDefinicion[cat.id] || ""}
                        onChange={(e) =>
                          setNewPreguntaDefinicion((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                      />
                      <div className="flex">
                        <Button onClick={() => handleAddPreguntaClick(cat.id)}>
                          Añadir pregunta
                        </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                ),
              }))}
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FaqAdmin;
