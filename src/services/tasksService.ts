export const tasksService = {
  getTasks: async () => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getAllTasks: async () => {
    return tasksService.getTasks();
  },

  getTask: async (id: string) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/tasks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  },
  
  createTask: async (taskData: any) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/tasks', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Failed to create task');
    return await res.json();
  },

  updateTask: async (id: string, data: any) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/tasks/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return await res.json();
  },

  deleteTask: async (id: string) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return await res.json();
  },

  getTaskList: async (id: string) => {
    // For now, we don't have a separate TaskList entity in DB, 
    // so we return null or a mock if needed by UI.
    return null;
  },

  getTasksByTaskList: async (taskListId: string) => {
    // For now, return empty array as we don't have TaskList entity
    return [];
  }
};
