import React from "react";
import { Task } from "../../types/taskTypes";

interface TaskTableProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  title: string;
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onToggle, title }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border-b bg-gray-100 text-left">Tareas</th>
            <th className="p-2 border-b bg-gray-100 text-left">Puntos</th>
            <th className="p-2 border-b bg-gray-100 text-left">Completada</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="p-2 border-b">{task.nombre}</td>
              <td className="p-2 border-b text-center">{task.puntos}</td>
              <td className="p-2 border-b text-center">
                <button
                  onClick={() => onToggle(task.id)}
                  className={`p-2 rounded-full transition-colors ${
                    task.completada
                      ? "bg-green-100 hover:bg-green-200"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {task.completada ? "✅" : "⬜"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
