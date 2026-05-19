export type BoardViewType = 'kanban' | 'list' | 'timeline' | 'calendar' | 'drive' | 'docs' | 'members' | 'settings';

export interface CardAssignee {
  userId: string;
  email: string;
  displayName: string;
  phone?: string;
  avatar?: string;
}

export interface CardNotification {
  id: string;
  type: 'status_change' | 'due_date' | 'overdue' | 'comment' | 'admin_manual';
  message: string;
  sentAt: number;
  recipientPhone: string;
}

export interface CardComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface CardChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface CardChecklist {
  id: string;
  title: string;
  items: CardChecklistItem[];
  createdAt: string;
}

export interface CardAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: number;
}

export interface CardTimeLog {
  id: string;
  userId: string;
  userName: string;
  hours: number;
  description: string;
  date: string;
  createdAt: number;
}

export interface CardCover {
  type: 'color' | 'image' | 'gradient' | 'emoji';
  value: string;
  size: 'small' | 'medium' | 'large';
}

export interface BoardCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  startDate?: string;
  dueDate?: string;
  estimatedTime?: number;
  estimatedTimeUnit?: 'hours' | 'days';
  assignees: CardAssignee[];
  labels: string[];
  tags?: string[];
  completed?: boolean;
  enableWhatsApp?: boolean;
  notifications?: CardNotification[];
  checklists: CardChecklist[];
  comments: CardComment[];
  attachments: CardAttachment[];
  timeLogs?: CardTimeLog[];
  cover?: CardCover;
  metadata?: Record<string, any>;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  order: number;
  wip?: number;
}

export interface BoardMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  addedAt: string | number;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  columns: BoardColumn[];
  members: string[]; // user IDs
  isStarred?: boolean;
  isArchived?: boolean;
  starred?: boolean;
  archived?: boolean;
  icon?: string;
  color?: string;
  defaultView?: BoardViewType;
  visibility?: 'private' | 'company' | 'public';
  columnWidth?: number;
  projectIds?: string[];
  stats?: { totalCards: number; completedCards?: number; overdueCards?: number; totalMembers?: number };
  createdBy?: string;
  updatedAt?: number;
  settings?: Record<string, any>;
  createdAt: number;
}
