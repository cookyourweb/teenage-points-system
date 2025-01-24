import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faGift, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useUserRole } from '../../hooks/useUserRole';
import useAuth from '../../hooks/useAuth'; 
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { ToastContainer, toast } from 'react-toastify'; // Import toast notifications
import 'react-toastify/dist/ReactToastify.css'; // Import toast styles

const RewardTracker: React.FC = () => {
  const { user } = useAuth();
  useUserRole(user?.uid);
  const navigate = useNavigate(); // Initialize useNavigate
  
  const diasSemana = React.useMemo(() => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], []);
  
  const initialPrivileges = [
    { nombre: '30 minutos de televisión/juegos', puntos: 30 },
    { nombre: '1 hora de televisión/juegos', puntos: 50 },
    { nombre: 'Elegir postre especial', puntos: 40 },
    { nombre: 'Tiempo extra antes de dormir (30min)', puntos: 45 },
    { nombre: 'Salida al parque', puntos: 60 },
    { nombre: 'Invitar a un amigo', puntos: 80 },
    { nombre: 'Elegir película para ver en familia', puntos: 70 },
    { nombre: 'Ir al cine', puntos: 100 },
    { nombre: 'Comprar juguete pequeño', puntos: 150 },
    { nombre: 'Día de actividad especial', puntos: 200 }
  ];

  const initialTasks = {
    diarias: [
      { nombre: 'Hacer la cama', puntos: 5 },
      { nombre: 'Poner la ropa doblada en el armario', puntos: 10 },
      { nombre: 'Mantener el armario ordenado', puntos: 10 },
      { nombre: 'Llevar la ropa sucia al cesto del baño', puntos: 5 },
      { nombre: 'Recoger y llevar los platos a la cocina', puntos: 5 },
      { nombre: 'Enjuagar y colocar los platos en el lavaplatos', puntos: 5 },
      { nombre: 'Dejar las sartenes en agua con jabón si las usa', puntos: 5 },
      { nombre: 'Limpiar las sartenes si solo él las usó', puntos: 10 },
      { nombre: 'Preguntar antes de tomar comida', puntos: 10 },
      { nombre: 'Compartir la habitación sin pelear', puntos: 5 },
      { nombre: 'Controlar el tono de voz y esperar antes de hablar', puntos: 10 },
      { nombre: 'Completar los deberes escolares', puntos: 10 }
    ],
    extra: [
      { nombre: 'Pasar el aspirador', puntos: 15 },
      { nombre: 'Fregar el suelo', puntos: 20 },
      { nombre: 'Limpiar el polvo', puntos: 10 }
    ]
  };

  type Task = { nombre: string; puntos: number; completada: boolean };
  type TasksState = {
    [key: string]: {
      diarias: Task[];
      extra: Task[];
    };
  };
  
  const [tasks, setTasks] = useState<TasksState>({});
  const [privileges] = useState(initialPrivileges);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<{ tasks: Task[]; privileges: { nombre: string; puntos: number; fecha: string }[] }>({ tasks: [], privileges: [] });

  // Initialize state
  useEffect(() => {
    const estadoInicial: { [key: string]: { diarias: Task[]; extra: Task[] } } = {};
    diasSemana.forEach(dia => {
      estadoInicial[dia] = {
        diarias: initialTasks.diarias.map(tarea => ({ ...tarea, completada: false })),
        extra: initialTasks.extra.map(tarea => ({ ...tarea, completada: false }))
      };
    });
    setTasks(estadoInicial);
  }, []); // Empty dependency array to run only once

  // Calculate points for the day
  const calcularPuntosDia = React.useCallback((dia: string) => {
    if (!tasks[dia]) return 0;
    const puntosDiarios = tasks[dia].diarias.reduce((total, tarea) => 
      total + (tarea.completada ? tarea.puntos : 0), 0);
    const puntosExtra = tasks[dia].extra.reduce((total, tarea) => 
      total + (tarea.completada ? tarea.puntos : 0), 0);
    return puntosDiarios + puntosExtra;
  }, [tasks]);

  // Calculate total points
  const calcularPuntosTotales = React.useCallback(() => {
    return diasSemana.reduce((total, dia) => total + calcularPuntosDia(dia), 0);
  }, [diasSemana, calcularPuntosDia]);

  // Update available points when tasks change
  useEffect(() => {
    const puntosGastados = history.privileges.reduce((total, privilegio) => 
      total + privilegio.puntos, 0);
    const totalPoints = calcularPuntosTotales();
    setAvailablePoints(totalPoints - puntosGastados);
  }, [tasks, history, calcularPuntosTotales]);

  // Handle task completion toggle
  const toggleTarea = (dia: string, tipo: 'diarias' | 'extra', index: number) => {
    setTasks(prevTasks => {
      const nuevoEstado = { ...prevTasks };
      nuevoEstado[dia][tipo][index].completada = !nuevoEstado[dia][tipo][index].completada;
      // Calculate total points after toggling the task
      const totalPoints = calcularPuntosTotales();
      // Check for unlocking privileges
      const unlockedPrivileges = privileges.filter(privilege => totalPoints >= privilege.puntos);
      if (unlockedPrivileges.length > 0) {
        // Logic to unlock privileges can be added here
        toast.success("¡Privilegios desbloqueados!", { position: "top-right" }); // Notify user
      }
      return nuevoEstado;
    });
  };

  // Redeem privilege
  const canjearPrivilegio = (privilegio: { nombre: string; puntos: number }) => {
    if (availablePoints >= privilegio.puntos) {
      setHistory(prev => ({
        ...prev,
        privileges: [...prev.privileges, {
          ...privilegio,
          fecha: new Date().toLocaleDateString()
        }]
      }));
      setErrorMessage('');
    } else {
      setErrorMessage(`Necesitas ${privilegio.puntos - availablePoints} puntos más para ${privilegio.nombre}`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer /> {/* Add ToastContainer for notifications */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Tracker de Recompensas</h1>
        <button 
          onClick={() => navigate('/dashboard')} // Navigate to dashboard
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Volver al Dashboard
        </button>
      </div>
     
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Privilegios Disponibles
            <span className="block text-lg text-green-600 mt-2">
              Puntos Disponibles: {availablePoints}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
              <FontAwesomeIcon icon={faExclamationCircle} className="w-5 h-5 mr-2" />
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {privileges.map((privilegio, index) => (
              <div 
                key={index}
                className={`p-4 border rounded-lg ${
                  availablePoints >= privilegio.puntos 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{privilegio.nombre}</h3>
                  <span className="text-sm font-medium text-gray-600">
                    {privilegio.puntos} puntos
                  </span>
                </div>
                <button
                  onClick={() => canjearPrivilegio(privilegio)}
                  className={`w-full mt-2 px-4 py-2 rounded-md flex items-center justify-center space-x-2 ${
                    availablePoints >= privilegio.puntos
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                  aria-label={`Redeem privilege ${privilegio.nombre}`} // Accessibility improvement
                >
                  <FontAwesomeIcon icon={faGift} className="w-4 h-4" />
                  <span>Canjear</span>
                </button>
              </div>
            ))}
          </div>

          {history.privileges.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold text-lg mb-4">Privilegios Canjeados</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {history.privileges.map((privilegio, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{privilegio.nombre}</span>
                    <span className="text-sm text-gray-600">
                      {privilegio.fecha} • {privilegio.puntos} puntos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
                    </Card>
           
            <Card className="w-full max-w-6xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">Sistema de Puntos Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border bg-gray-100">Tareas</th>
                        <th className="p-2 border bg-gray-100">Puntos</th>
                        {diasSemana.map(dia => (
                          <th key={dia} className="p-2 border bg-gray-100">{dia}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={9} className="p-2 border bg-blue-50 font-bold">
                          Tareas Diarias
                        </td>
                      </tr>
                      {initialTasks.diarias.map((tarea, index) => (
                        <tr key={`diaria-${index}`}>
                          <td className="p-2 border">{tarea.nombre}</td>
                          <td className="p-2 border text-center">{tarea.puntos}</td>
                          {diasSemana.map(dia => (
                            <td key={`${dia}-${index}`} className="p-2 border text-center">
                              <button
                                onClick={() => toggleTarea(dia, 'diarias', index)}
                                className={`p-2 rounded-full transition-colors ${
                                  tasks[dia]?.diarias[index]?.completada 
                                    ? 'bg-green-100 hover:bg-green-200' 
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                                aria-label={`Toggle task ${tarea.nombre} for ${dia}`} // Accessibility improvement
                              >
                                <FontAwesomeIcon 
                                  icon={faCheckSquare}
                                  className={`w-5 h-5 ${
                                    tasks[dia]?.diarias[index]?.completada 
                                      ? 'text-green-600' 
                                      : 'text-gray-400'
                                  }`} 
                                />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={9} className="p-2 border bg-purple-50 font-bold">
                          Tareas Extra (Opcionales)
                        </td>
                      </tr>
                      {initialTasks.extra.map((tarea, index) => (
                        <tr key={`extra-${index}`}>
                          <td className="p-2 border">{tarea.nombre}</td>
                          <td className="p-2 border text-center">{tarea.puntos}</td>
                          {diasSemana.map(dia => (
                            <td key={`${dia}-${index}`} className="p-2 border text-center">
                              <button
                                onClick={() => toggleTarea(dia, 'extra', index)}
                                className={`p-2 rounded-full transition-colors ${
                                  tasks[dia]?.extra[index]?.completada 
                                    ? 'bg-green-100 hover:bg-green-200' 
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                                aria-label={`Toggle extra task ${tarea.nombre} for ${dia}`} // Accessibility improvement
                              >
                                <FontAwesomeIcon 
                                  icon={faCheckSquare}
                                  className={`w-5 h-5 ${
                                    tasks[dia]?.extra[index]?.completada 
                                      ? 'text-green-600' 
                                      : 'text-gray-400'
                                  }`} 
                                />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan={2} className="p-2 border">Puntos Totales del Día</td>
                        {diasSemana.map(dia => (
                          <td key={`total-${dia}`} className="p-2 border text-center">
                            {calcularPuntosDia(dia)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      };
      
      export default RewardTracker;
