import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import TaskCard from "./TaskCard";

const meta = {
  title: "Dashboard/TaskCard",
  component: TaskCard,
  parameters: { layout: "centered" },
  args: { onComplete: fn() },
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pendiente: Story = {
  args: {
    task: { id: 1, name: "Recoger la habitación", points: 10, completed: false },
  },
};

export const Completada: Story = {
  args: {
    task: { id: 2, name: "Sacar la basura", points: 5, completed: true },
  },
};

export const PuntuacionAlta: Story = {
  args: {
    task: { id: 3, name: "Estudiar para el examen", points: 50, completed: false },
  },
};
