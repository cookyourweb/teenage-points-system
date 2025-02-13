import React from "react";
import { Task } from "../../types/taskTypes";

interface TaskTableProps {
  tasks: Task[];
  onToggle: (taskId: number) => void;
  title: string;
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onToggle, title }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border bg-gray-100">Tareas</th>
            <th className="p-2 border bg-gray-100">Puntos</th>
            <th className="p-2 border bg-gray-100">Completada</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="p-2 border">{task.nombre}</td>
              <td className="p-2 border text-center">{task.puntos}</td>
              <td className="p-2 border text-center">
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