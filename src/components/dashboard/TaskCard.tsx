import React from "react";

//TaskCard.tsx
interface Task {
  id: number;
  name: string;
  points: number;
  completed: boolean;
}

interface TaskCardProps {
  task: Task;
  onComplete: (id: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete }) => {
  return (
    <div className="border p-4 rounded shadow bg-white dark:bg-gray-800">
      <h4 className="font-semibold">{task.name}</h4>
      <p className="text-sm text-gray-600">Puntos: {task.points}</p>
      <button
        className={`mt-2 px-4 py-2 rounded ${
          task.completed ? "bg-gray-300 text-gray-600" : "bg-blue-500 text-white"
        }`}
        onClick={() => onComplete(task.id)}
        disabled={task.completed}
      >
        {task.completed ? "Completada" : "Completar"}
      </button>
    </div>
  );
};

export default TaskCard;
