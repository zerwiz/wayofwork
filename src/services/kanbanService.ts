import type { Board, BoardColumn, BoardCard, BoardMember, CardTimeLog } from '../types/kanban';

export const kanbanService = {
  getAllBoards: async (): Promise<Board[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const projects = await res.json();
    
    return Promise.all(projects.map(async (p: any) => {
      const membersRes = await fetch(`/api/projects/${p.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const members = membersRes.ok ? await membersRes.json() : [];
      const settings = p.settings_json ? JSON.parse(p.settings_json) : {};
      
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        columns: settings.columns || [
          { id: 'todo', name: 'To Do', order: 0, boardId: p.id },
          { id: 'in_progress', name: 'In Progress', order: 1, boardId: p.id },
          { id: 'complete', name: 'Complete', order: 2, boardId: p.id },
        ],
        members: members.map((m: any) => m.id),
        createdAt: new Date(p.created_at).getTime(),
      };
    }));
  },

  getBoards: async (): Promise<Board[]> => {
    return kanbanService.getAllBoards();
  },

  getBoard: async (id: string): Promise<Board | null> => {
    const boards = await kanbanService.getAllBoards();
    return boards.find(b => b.id === id) || null;
  },

  createBoard: async (data: Partial<Board>, _templateId?: string): Promise<Board> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create board');
    const p = await res.json();
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      columns: [
        { id: 'todo', name: 'To Do', order: 0, boardId: p.id },
        { id: 'in_progress', name: 'In Progress', order: 1, boardId: p.id },
        { id: 'complete', name: 'Complete', order: 2, boardId: p.id },
      ],
      members: [],
      createdAt: new Date(p.created_at).getTime(),
    };
  },

  createBoardFromTemplate: async (templateId: string, name: string): Promise<Board> => {
    return kanbanService.createBoard({ name });
  },

  updateBoard: async (id: string, data: Partial<Board>): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },

  deleteBoard: async (id: string): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete board');
  },

  // ── Columns ──
  createColumn: async (boardId: string, column: Partial<BoardColumn>): Promise<void> => {
    const board = await kanbanService.getBoard(boardId);
    if (!board) throw new Error('Board not found');
    const newColumns = [...board.columns, { ...column, id: column.id || Date.now().toString(), boardId, order: board.columns.length }];
    await kanbanService.updateBoard(boardId, { settings: { ...board.settings, columns: newColumns } } as any);
  },

  deleteColumn: async (boardId: string, columnId: string): Promise<void> => {
    const board = await kanbanService.getBoard(boardId);
    if (!board) throw new Error('Board not found');
    const newColumns = board.columns.filter(c => c.id !== columnId);
    await kanbanService.updateBoard(boardId, { settings: { ...board.settings, columns: newColumns } } as any);
  },

  // ── Cards ──
  getAllCardsForBoard: async (boardId: string): Promise<BoardCard[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const tasks = await res.json();
    
    return tasks
      .filter((t: any) => t.project_id === boardId)
      .map((t: any) => ({
        id: t.id,
        boardId: t.project_id,
        columnId: t.status || 'todo',
        title: t.title,
        description: t.description,
        priority: t.priority || 'medium',
        order: 0,
        createdAt: new Date(t.created_at).getTime(),
        updatedAt: new Date(t.updated_at || t.created_at).getTime(),
        assignees: t.assigned_to ? [{ userId: t.assigned_to, displayName: t.assigned_name || 'Assigned', email: '' }] : [],
        checklists: [],
        comments: [],
        attachments: [],
        metadata: {
          taskId: t.id
        }
      }));
  },

  getCard: async (boardId: string, cardId: string): Promise<BoardCard | null> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/portal/tasks/${cardId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const t = await res.json();
    return {
      id: t.id,
      boardId: t.project_id,
      columnId: t.status || 'todo',
      title: t.title,
      description: t.description,
      priority: t.priority || 'medium',
      order: 0,
      createdAt: new Date(t.created_at).getTime(),
      updatedAt: new Date(t.updated_at || t.created_at).getTime(),
      assignees: t.assigned_to ? [{ userId: t.assigned_to, displayName: t.assigned_name || 'Assigned', email: '' }] : [],
      checklists: [],
      comments: [],
      attachments: [],
      metadata: {
        taskId: t.id
      }
    };
  },

  createCard: async (boardId: string, cardData: Partial<BoardCard>): Promise<BoardCard> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/tasks', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: cardData.title,
        project_id: boardId,
        status: cardData.columnId || 'todo',
        priority: cardData.priority || 'medium'
      })
    });
    if (!res.ok) throw new Error('Failed to create card');
    const t = await res.json();
    return {
      id: t.id,
      boardId: t.project_id,
      columnId: t.status || 'todo',
      title: t.title,
      description: t.description,
      priority: t.priority || 'medium',
      order: 0,
      createdAt: new Date(t.created_at).getTime(),
      updatedAt: new Date(t.updated_at || t.created_at).getTime(),
      assignees: [],
      checklists: [],
      comments: [],
      attachments: [],
      metadata: {
        taskId: t.id
      }
    };
  },

  updateCard: async (boardId: string, cardId: string, data: Partial<BoardCard>): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.columnId) updateData.status = data.columnId;
    if (data.priority) updateData.priority = data.priority;
    if (data.description !== undefined) updateData.description = data.description;
    
    await fetch(`/api/portal/tasks/${cardId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
  },

  deleteCard: async (cardId: string): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    await fetch(`/api/portal/tasks/${cardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  moveCard: async (boardId: string, cardId: string, targetColumnId: string, index: number): Promise<void> => {
    await kanbanService.updateCard(boardId, cardId, { columnId: targetColumnId });
  },

  // ── Members ──
  getBoardMembers: async (boardId: string): Promise<BoardMember[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/projects/${boardId}/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const members = await res.json();
    return members.map((m: any) => ({
      id: m.id,
      userId: m.id,
      email: '',
      displayName: m.full_name || m.username,
      role: (m.role === 'LEADER' ? 'admin' : m.role === 'WORKER' ? 'member' : 'viewer') as BoardMember['role'],
      addedAt: Date.now(),
    }));
  },

  inviteBoardMember: async (boardId: string, email: string, role: string): Promise<void> => {
    // email here is actually username; we need userId. Look up the user first.
    const token = localStorage.getItem('wop_token');
    // Try to find user by email (which in this app doubles as username)
    const usersRes = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!usersRes.ok) throw new Error('Failed to look up users');
    const users = await usersRes.json();
    const user = users.find((u: any) => u.email === email || u.username === email);
    if (!user) throw new Error('User not found');
    const mappedRole = role === 'admin' ? 'LEADER' : role === 'member' ? 'WORKER' : 'VIEWER';
    const res = await fetch(`/api/projects/${boardId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.id, role: mappedRole })
    });
    if (!res.ok) throw new Error('Failed to add member');
  },

  removeBoardMember: async (boardId: string, memberId: string): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/projects/${boardId}/members/${memberId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to remove member');
  },

  updateBoardMemberRole: async (boardId: string, memberId: string, role: string): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    const mappedRole = role === 'admin' ? 'LEADER' : role === 'member' ? 'WORKER' : 'VIEWER';
    await fetch(`/api/projects/${boardId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: memberId, role: mappedRole })
    });
  },

  // ── Time Logs ──
  addCardTimeLog: async (boardId: string, cardId: string, log: Omit<CardTimeLog, 'id' | 'createdAt'>): Promise<CardTimeLog> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/portal/time', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        hours: log.hours,
        project: boardId,
        date: log.date,
        taskId: cardId,
        description: log.description
      })
    });
    if (!res.ok) throw new Error('Failed to add time log');
    return await res.json();
  },

  // ── WhatsApp ──
  toggleCardWhatsApp: async (boardId: string, cardId: string, enabled: boolean): Promise<void> => {
    // TODO
  },

  sendWhatsAppMessage: async (boardId: string, cardId: string, userId: string, message: string): Promise<void> => {
    // TODO
  }
};
