export const driveService = {
  getFiles: async () => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/files', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getAllFiles: async () => {
    return driveService.getFiles();
  },

  getFile: async (id: string) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/files/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  },

  updateFile: async (id: string, data: any) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/files/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update file');
    return await res.json();
  },

  uploadFile: async (file: File, projectId?: string) => {
    const token = localStorage.getItem('wop_token');
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('project_id', projectId);
    }

    const res = await fetch('/api/portal/files/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
        // 'Content-Type': 'multipart/form-data' is automatically set by browser for FormData
      },
      body: formData
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to upload file');
    }
    return await res.json();
  },

  deleteFile: async (id: string) => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/files/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return await res.json();
  }
};
