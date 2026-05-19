import type { Note } from '../types/notes';

const mockNotes: Note[] = [];

export const notesService = {
  getAllNotes: (): Note[] => mockNotes,
  getNote: (id: string): Note | undefined => mockNotes.find(n => n.id === id),
  updateNote: (id: string, data: Partial<Note>): void => {
    const idx = mockNotes.findIndex(n => n.id === id);
    if (idx >= 0) mockNotes[idx] = { ...mockNotes[idx], ...data };
  },
};
