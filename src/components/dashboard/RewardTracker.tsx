import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TasksState } from "../../types/taskTypes";
import PrivilegeCard from "./PrivilegeCard";

const RewardTracker: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const initialTasks = {
    diarias: [
      { id: 1, nombre: 'Hacer la cama', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 2, nombre: 'Poner la ropa doblada en el armario', puntos: 10, completada: false, tipo: 'diarias' as const },
      { id: 3, nombre: 'Mantener el armario ordenado', puntos: 10, completada: false, tipo: 'diarias' as const },
      { id: 4, nombre: 'Llevar la ropa sucia al cesto del baño', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 5, nombre: 'Recoger y llevar los platos a la cocina', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 6, nombre: 'Enjuagar y colocar los platos en el lavaplatos', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 7, nombre: 'Dejar las sartenes en agua con jabón si las usa', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 8, nombre: 'Limpiar las sartenes si solo él las usó', puntos: 10, completada: false, tipo: 'diarias' as const },
      { id: 9, nombre: 'Preguntar antes de tomar comida', puntos: 10, completada: false, tipo: 'diarias' as const },
      { id: 10, nombre: 'Compartir la habitación sin pelear', puntos: 5, completada: false, tipo: 'diarias' as const },
      { id: 11, nombre: 'Controlar el tono de voz y esperar antes de hablar', puntos: 10, completada: false, tipo: 'diarias' as const },
      { id: 12, nombre: 'Completar los deberes escolares', puntos: 10, completada: false, tipo: 'diarias' as const }
    ],
    extra: [
      { id: 13, nombre: 'Pasar el aspirador', puntos: 15, completada: false, tipo: 'extra' as const },
      { id: 14, nombre: 'Fregar el suelo', puntos: 20, completada: false, tipo: 'extra' as const },
      { id: 15, nombre: 'Limpiar el polvo', puntos: 10, completada: false, tipo: 'extra' as const }
    ]
  };

  const [tasks, setTasks] = useState<TasksState>({});
  const [totalPoints, setTotalPoints] = useState<{ [key: string]: number }>({});
  const [weeklyTotal, setWeeklyTotal] = useState(0);

  // Initialize state
  useEffect(() => {
    const estadoInicial: TasksState = {};
    const puntosIniciales: { [key: string]: number } = {};
    
    diasSemana.forEach(dia => {
      estadoInicial[dia] = {
        diarias: initialTasks.diarias.map(tarea => ({ ...tarea, completada: false })),
        extra: initialTasks.extra.map(tarea => ({ ...tarea, completada: false }))
      };
      puntosIniciales[dia] = 0;
    });
    
    setTasks(estadoInicial);
    setTotalPoints(puntosIniciales);
  }, []);

  // Handle task completion toggle
  const toggleTarea = (dia: string, tipo: 'diarias' | 'extra', taskId: number) => {
    setTasks(prevTasks => {
      const nuevoEstado = { ...prevTasks };
      const taskIndex = nuevoEstado[dia][tipo].findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        const task = nuevoEstado[dia][tipo][taskIndex];
        const wasCompleted = task.completada;
        task.completada = !wasCompleted;
        
        // Actualizar puntos del día
        const puntosCambio = wasCompleted ? -task.puntos : task.puntos;
        setTotalPoints(prev => ({
          ...prev,
          [dia]: prev[dia] + puntosCambio
        }));
        
        // Actualizar total semanal
        setWeeklyTotal(prev => prev + puntosCambio);
        
        // Mostrar notificación
        toast.success(`${wasCompleted ? 'Desmarcada' : 'Completada'}: ${task.nombre}`, {
          position: "top-right"
        });
      }
      
      return nuevoEstado;
    });
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Sistema de tareas de {user?.displayName || 'Usuario'}</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Volver al Dashboard
        </button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Sistema de Puntos Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border bg-gray-100">Tareas</th>
                  {diasSemana.map(dia => (
                    <th key={dia} className="p-2 border bg-gray-100">{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialTasks.diarias.map(tarea => (
                  <tr key={tarea.id}>
                    <td className="p-2 border">{tarea.nombre} ({tarea.puntos} pts)</td>
                    {diasSemana.map(dia => (
                      <td key={`${dia}-${tarea.id}`} className="p-2 border text-center">
                        <button
                          onClick={() => toggleTarea(dia, 'diarias', tarea.id)}
                          className={`p-2 rounded-full transition-colors ${
                            tasks[dia]?.diarias.find(t => t.id === tarea.id)?.completada
                              ? "bg-green-100 hover:bg-green-200"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          <FontAwesomeIcon 
                            icon={faCheckSquare} 
                            className={`w-5 h-5 ${
                              tasks[dia]?.diarias.find(t => t.id === tarea.id)?.completada
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                {initialTasks.extra.map(tarea => (
                  <tr key={tarea.id}>
                    <td className="p-2 border">{tarea.nombre} ({tarea.puntos} pts)</td>
                    {diasSemana.map(dia => (
                      <td key={`${dia}-${tarea.id}`} className="p-2 border text-center">
                        <button
                          onClick={() => toggleTarea(dia, 'extra', tarea.id)}
                          className={`p-2 rounded-full transition-colors ${
                            tasks[dia]?.extra.find(t => t.id === tarea.id)?.completada
                              ? "bg-green-100 hover:bg-green-200"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          <FontAwesomeIcon 
                            icon={faCheckSquare} 
                            className={`w-5 h-5 ${
                              tasks[dia]?.extra.find(t => t.id === tarea.id)?.completada
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="p-2 border">Puntos del Día</td>
                  {diasSemana.map(dia => (
                    <td key={`puntos-${dia}`} className="p-2 border text-center">
                      {totalPoints[dia] || 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Puntos Totales de la Semana: {weeklyTotal}</h3>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-4">Privilegios Disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: '30 minutos de televisión/juegos', pointsRequired: 30 },
                { name: '1 hora de televisión/juegos', pointsRequired: 50 },
                { name: 'Elegir postre especial', pointsRequired: 40 },
                { name: 'Tiempo extra antes de dormir (30min)', pointsRequired: 45 },
                { name: 'Salida al parque', pointsRequired: 60 },
                { name: 'Invitar a un amigo', pointsRequired: 80 },
                { name: 'Elegir película para ver en familia', pointsRequired: 70 },
                { name: 'Ir al cine', pointsRequired: 100 },
                { name: 'Comprar juguete pequeño', pointsRequired: 150 },
                { name: 'Día de actividad especial', pointsRequired: 200 }
              ].map((privilege, index) => (
                <PrivilegeCard
                  key={index}
                  privilege={privilege}
                  points={weeklyTotal}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RewardTracker;
