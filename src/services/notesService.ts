import type { Note } from '../types/notes';

export const notesService = {
  getAllNotes: async (): Promise<Note[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/notes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  },
  
  getNote: async (id: string): Promise<Note | null> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/notes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  },

  createNote: async (data: Partial<Note>): Promise<Note> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create note');
    return await res.json();
  },

  updateNote: async (id: string, data: Partial<Note>): Promise<Note> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update note');
    return await res.json();
  }
};
