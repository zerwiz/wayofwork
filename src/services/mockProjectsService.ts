export interface Project {
  id: string;
  name: string;
  description?: string;
  kanbanBoardIds?: string[];
}

const mockProjects: Project[] = [];

export const projectsService = {
  getAllProjects: (): Project[] => mockProjects,
  getProject: (id: string): Project | undefined => mockProjects.find(p => p.id === id),
  updateProject: (id: string, _data: Partial<Project>): void => {},
};
