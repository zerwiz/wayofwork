export interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  tags?: string[];
  assignees?: string[];
  kanbanCardId?: string;
}

export interface TaskList {
  id: string;
  title: string;
  tasks: Task[];
}
