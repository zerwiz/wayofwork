import type { Task, TaskList } from '../types/tasks';

const mockTasks: Task[] = [];
const mockTaskLists: TaskList[] = [];

export const tasksService = {
  getAllTasks: (): Task[] => mockTasks,
  getTask: (id: string): Task | undefined => mockTasks.find(t => t.id === id),
  getTasksByTaskList: (_taskListId: string): Task[] => [],
  updateTask: (id: string, _data: Partial<Task>): void => {},
  getTaskList: (id: string): TaskList | undefined => mockTaskLists.find(tl => tl.id === id),
};
