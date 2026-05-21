export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  budget_allocated?: number;
  kanbanBoardIds?: string[];
}

export const projectsService = {
  getAllProjects: async (): Promise<Project[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  },
  
  getProject: async (id: string): Promise<Project | null> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/projects/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  },

  createProject: async (data: Partial<Project>): Promise<Project> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return await res.json();
  },

  updateProject: async (id: string, data: Partial<Project>): Promise<Project> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update project');
    return await res.json();
  }
};
