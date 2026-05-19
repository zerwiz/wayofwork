/**
 * Mock Kanban Service — In-Memory Persistence
 * 
 * This mock service stores boards and cards in memory so that
 * the Kanban UI can be used for demos and development without
 * a backend. Data is ephemeral (lost on page refresh).
 */
import type { Board, BoardColumn, BoardCard, BoardMember, CardTimeLog } from '../types/kanban';
import { BOARD_TEMPLATES } from './boardTemplates';
import type { BoardTemplate } from './boardTemplates';

// ── In-Memory Stores ──
let boardStore: Map<string, Board> = new Map();
let cardStore: Map<string, Map<string, BoardCard>> = new Map(); // boardId → Map<cardId, card>
let memberStore: Map<string, BoardMember[]> = new Map(); // boardId → members

// ── Helpers ──
let _boardIdCounter = 100;
let _cardIdCounter = 1000;

function nextBoardId(): string {
  return `board-${++_boardIdCounter}`;
}

function nextCardId(): string {
  return `card-${++_cardIdCounter}`;
}

const DEFAULT_COLUMNS: Omit<BoardColumn, 'boardId'>[] = [
  { id: 'col-todo', name: 'To Do', order: 0 },
  { id: 'col-inprogress', name: 'In Progress', order: 1 },
  { id: 'col-review', name: 'Review', order: 2 },
  { id: 'col-done', name: 'Done', order: 3 },
];

const SEED_USERS = [
  { id: 'user-1', email: 'alice@example.com', displayName: 'Alice Johnson', phone: '+46701234567' },
  { id: 'user-2', email: 'bob@example.com', displayName: 'Bob Smith', phone: '+46702345678' },
  { id: 'user-3', email: 'carol@example.com', displayName: 'Carol Williams', phone: '+46703456789' },
  { id: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin', phone: '+46704567890' },
  { id: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker', phone: '+46705678901' },
  { id: 'demo-client', email: 'client@example.com', displayName: 'Demo Client', phone: '+46706789012' },
];

const userStore = new Map(SEED_USERS.map(u => [u.id, u]));

// ── Seed Data ──
function seedInitialData() {
  if (boardStore.size > 0) return; // already seeded

  // Board 0: Global Planning (for Work Mode integration)
  const b0Columns: BoardColumn[] = [
    { id: 'b0-col-1', boardId: 'board-0', name: 'To Do', order: 0 },
    { id: 'b0-col-2', boardId: 'board-0', name: 'In Progress', order: 1 },
    { id: 'b0-col-3', boardId: 'board-0', name: 'Review', order: 2 },
    { id: 'b0-col-4', boardId: 'board-0', name: 'Done', order: 3 },
  ];
  const board0: Board = {
    id: 'board-0',
    name: 'Global Planning',
    description: 'Central task board for the entire team',
    columns: b0Columns,
    members: ['demo-admin', 'demo-worker', 'demo-client', 'user-1'],
    icon: '🌍',
    starred: true,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
    stats: { totalCards: 11, completedCards: 1, overdueCards: 2 },
  };
  boardStore.set(board0.id, board0);

  const b0cards = new Map<string, BoardCard>();
  
  // Admin Tasks
  b0cards.set('b0-c1', {
    id: 'b0-c1', boardId: 'board-0', columnId: 'b0-col-1',
    title: 'Review quarterly financial reports',
    description: 'Verify all project margins and overhead costs for Q1.',
    priority: 'high', 
    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    order: 0, createdAt: Date.now() - 86400000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin' }],
    checklists: [
      {
        id: 'cl-1',
        title: 'Review Checklist',
        items: [
          { id: 'cli-1', title: 'Verify project margins', completed: true },
          { id: 'cli-2', title: 'Check overhead allocations', completed: false },
          { id: 'cli-3', title: 'Confirm tax compliance', completed: false },
        ]
      }
    ],
    comments: [], attachments: [], tags: ['finance', 'admin'],
    timeLogs: [
      { id: 'log-1', userId: 'demo-admin', userName: 'Demo Admin', hours: 2, description: 'Initial review of Q1 sheets', date: new Date().toISOString().split('T')[0], createdAt: Date.now() }
    ],
    estimatedTime: 12,
    estimatedTimeUnit: 'hours',
    cover: { type: 'gradient', value: 'linear-gradient(135deg, #3b82f6, #2dd4bf)', size: 'medium' },
    metadata: {},
  });
  b0cards.set('b0-c2', {
    id: 'b0-c2', boardId: 'board-0', columnId: 'b0-col-2',
    title: 'Update company security policies',
    description: 'Align internal policies with new GDPR requirements.',
    priority: 'urgent', 
    startDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    order: 1, createdAt: Date.now() - 172800000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin' }],
    checklists: [],
    comments: [], attachments: [], tags: ['compliance'],
    estimatedTime: 24,
    estimatedTimeUnit: 'hours',
    cover: { type: 'color', value: '#991b1b', size: 'medium' },
    metadata: {},
  });

  // Worker Tasks
  b0cards.set('b0-c3', {
    id: 'b0-c3', boardId: 'board-0', columnId: 'b0-col-2',
    title: 'Implement API rate limiting',
    description: 'Add Redis-backed rate limiting to the main gateway.',
    priority: 'high', 
    startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    order: 0, createdAt: Date.now() - 259200000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [
      {
        id: 'cl-2',
        title: 'Development Steps',
        items: [
          { id: 'cli-4', title: 'Setup Redis cluster', completed: true },
          { id: 'cli-5', title: 'Implement rate limiting middleware', completed: true },
          { id: 'cli-6', title: 'Add bypass for admin IPs', completed: false },
        ]
      }
    ],
    comments: [], attachments: [], tags: ['backend'],
    timeLogs: [
      { id: 'log-2', userId: 'demo-worker', userName: 'Demo Worker', hours: 4.5, description: 'Setting up Redis environment', date: new Date().toISOString().split('T')[0], createdAt: Date.now() }
    ],
    estimatedTime: 16,
    estimatedTimeUnit: 'hours',
    cover: { type: 'emoji', value: '⚡', size: 'medium' },
    metadata: {},
  });
  b0cards.set('b0-c4', {
    id: 'b0-c4', boardId: 'board-0', columnId: 'b0-col-1',
    title: 'Fix CSS layout bugs on mobile',
    description: 'Address the clipping issues in the navigation bar on small screens.',
    priority: 'medium', 
    startDate: new Date(Date.now() - 86400000).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    order: 1, createdAt: Date.now() - 86400000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [],
    comments: [], attachments: [], tags: ['frontend', 'mobile'],
    estimatedTime: 8,
    estimatedTimeUnit: 'hours',
    cover: { type: 'image', value: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80', size: 'medium' },
    metadata: {},
  });

  // Client Tasks/Cards
  b0cards.set('b0-c5', {
    id: 'b0-c5', boardId: 'board-0', columnId: 'b0-col-3',
    title: 'Review project milestones',
    description: 'Client needs to sign off on the Phase 1 deliverables.',
    priority: 'medium', 
    startDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    order: 0, createdAt: Date.now() - 345600000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-client', email: 'client@example.com', displayName: 'Demo Client' }],
    checklists: [],
    comments: [], attachments: [], tags: ['review'],
    estimatedTime: 4,
    estimatedTimeUnit: 'hours',
    metadata: {},
  });
  b0cards.set('b0-c6', {
    id: 'b0-c6', boardId: 'board-0', columnId: 'b0-col-4',
    title: 'Onboarding meeting scheduled',
    description: 'Introductory call with the new development team.',
    priority: 'low', 
    startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    completed: true, order: 0, createdAt: Date.now() - 604800000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-client', email: 'client@example.com', displayName: 'Demo Client' }],
    checklists: [],
    comments: [], attachments: [], tags: ['meeting'],
    estimatedTime: 2,
    estimatedTimeUnit: 'hours',
    metadata: {},
  });

  // Overdue Tasks
  b0cards.set('b0-c7', {
    id: 'b0-c7', boardId: 'board-0', columnId: 'b0-col-1',
    title: 'OVERDUE: Quarterly compliance audit',
    description: 'Internal audit must be completed before the board meeting.',
    priority: 'critical', 
    startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    order: 2, createdAt: Date.now() - 86400000 * 10, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin' }],
    checklists: [],
    comments: [], attachments: [], tags: ['admin', 'compliance'],
    estimatedTime: 40,
    estimatedTimeUnit: 'hours',
    metadata: {},
  });
  b0cards.set('b0-c8', {
    id: 'b0-c8', boardId: 'board-0', columnId: 'b0-col-2',
    title: 'OVERDUE: Critical security patch',
    description: 'Patch CVE-2026-1234 in the authentication module.',
    priority: 'urgent', 
    startDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    order: 1, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [],
    comments: [], attachments: [], tags: ['security', 'worker'],
    estimatedTime: 12,
    estimatedTimeUnit: 'hours',
    metadata: {},
  });

  // Multi-day Tasks
  b0cards.set('b0-c9', {
    id: 'b0-c9', boardId: 'board-0', columnId: 'b0-col-1',
    title: 'Enterprise Architecture Blueprint',
    description: 'Design the high-level system architecture for the next 2 years.',
    priority: 'high', 
    startDate: new Date(Date.now()).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    order: 3, createdAt: Date.now(), updatedAt: Date.now(),
    assignees: [{ userId: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin' }],
    checklists: [
      {
        id: 'cl-3',
        title: 'Planning Phases',
        items: [
          { id: 'cli-7', title: 'Stakeholder interviews', completed: true },
          { id: 'cli-8', title: 'System auditing', completed: false },
          { id: 'cli-9', title: 'Technology selection', completed: false },
        ]
      }
    ],
    comments: [], attachments: [], tags: ['architecture', 'admin'],
    estimatedTime: 10,
    estimatedTimeUnit: 'days',
    cover: { type: 'gradient', value: 'linear-gradient(135deg, #1e3a8a, #7e22ce)', size: 'medium' },
    metadata: {},
  });
  b0cards.set('b0-c10', {
    id: 'b0-c10', boardId: 'board-0', columnId: 'b0-col-2',
    title: 'Frontend Library Migration',
    description: 'Migrate the entire UI component library from CSS modules to Tailwind.',
    priority: 'medium', 
    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    order: 2, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [
      {
        id: 'cl-4',
        title: 'Migration Track',
        items: [
          { id: 'cli-10', title: 'Setup Tailwind config', completed: true },
          { id: 'cli-11', title: 'Convert core buttons', completed: true },
          { id: 'cli-12', title: 'Convert navigation components', completed: false },
        ]
      }
    ],
    comments: [], attachments: [], tags: ['ui', 'refactor'],
    estimatedTime: 15,
    estimatedTimeUnit: 'days',
    metadata: {},
  });
  b0cards.set('b0-c11', {
    id: 'b0-c11', boardId: 'board-0', columnId: 'b0-col-1',
    title: 'Multi-Tenant Data Isolation',
    description: 'Implement logical database partitioning for enterprise clients.',
    priority: 'urgent', 
    startDate: new Date(Date.now() - 86400000).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    order: 4, createdAt: Date.now() - 86400000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [
      {
        id: 'cl-5',
        title: 'Security Milestones',
        items: [
          { id: 'cli-13', title: 'Define schema boundaries', completed: true },
          { id: 'cli-14', title: 'Implement tenant middleware', completed: false },
          { id: 'cli-15', title: 'Encryption at rest audit', completed: false },
        ]
      }
    ],
    comments: [], attachments: [], tags: ['backend', 'security'],
    estimatedTime: 20,
    estimatedTimeUnit: 'days',
    metadata: {},
  });

  cardStore.set(board0.id, b0cards);

  // Board 1
  const b1Columns: BoardColumn[] = [
    { id: 'b1-col-1', boardId: 'board-1', name: 'To Do', order: 0 },
    { id: 'b1-col-2', boardId: 'board-1', name: 'In Progress', order: 1 },
    { id: 'b1-col-3', boardId: 'board-1', name: 'Done', order: 2 },
  ];
  const board1: Board = {
    id: 'board-1',
    name: 'Sprint 24',
    description: 'Current sprint backlog and tasks',
    columns: b1Columns,
    members: ['user-1', 'user-2'],
    icon: '🏃',
    starred: true,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
    stats: { totalCards: 3, completedCards: 1 },
  };
  boardStore.set(board1.id, board1);

  const b1cards = new Map<string, BoardCard>();
  b1cards.set('b1-c1', {
    id: 'b1-c1', boardId: 'board-1', columnId: 'b1-col-1',
    title: 'Design new dashboard layout',
    description: 'Create wireframes and mockups for the updated dashboard',
    priority: 'high', order: 0, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000,
    assignees: [{ userId: 'user-1', email: 'alice@example.com', displayName: 'Alice Johnson' }],
    checklists: [], comments: [], attachments: [], tags: ['design'],
    metadata: {},
  });
  b1cards.set('b1-c2', {
    id: 'b1-c2', boardId: 'board-1', columnId: 'b1-col-2',
    title: 'Implement user authentication',
    description: 'Add login/signup with JWT tokens',
    priority: 'urgent', dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), order: 0,
    createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 3600000,
    assignees: [{ userId: 'user-2', email: 'bob@example.com', displayName: 'Bob Smith' }],
    checklists: [], comments: [], attachments: [], tags: ['backend', 'auth'],
    metadata: {},
  });
  b1cards.set('b1-c3', {
    id: 'b1-c3', boardId: 'board-1', columnId: 'b1-col-3',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated builds',
    priority: 'medium', completed: true, order: 0,
    createdAt: Date.now() - 86400000 * 7, updatedAt: Date.now() - 86400000 * 2,
    assignees: [], checklists: [], comments: [], attachments: [], tags: [],
    metadata: {},
  });
  cardStore.set(board1.id, b1cards);

  // Board 2
  const b2Columns: BoardColumn[] = [
    { id: 'b2-col-1', boardId: 'board-2', name: 'Backlog', order: 0 },
    { id: 'b2-col-2', boardId: 'board-2', name: 'In Progress', order: 1 },
    { id: 'b2-col-3', boardId: 'board-2', name: 'Review', order: 2 },
    { id: 'b2-col-4', boardId: 'board-2', name: 'Done', order: 3 },
  ];
  const board2: Board = {
    id: 'board-2',
    name: 'Bug Tracking',
    description: 'Track reported bugs and issues',
    columns: b2Columns,
    members: ['user-1', 'user-3'],
    icon: '🐛',
    starred: true,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 7200000,
    stats: { totalCards: 2, completedCards: 0 },
  };
  boardStore.set(board2.id, board2);

  const b2cards = new Map<string, BoardCard>();
  // ... (b2 cards) ...
  cardStore.set(board2.id, b2cards);

  // Board 3: Complex Residential Project (Oak Ridge Estate)
  const b3Columns: BoardColumn[] = [
    { id: 'b3-col-1', boardId: 'board-3', name: 'Excavation & Foundation', order: 0 },
    { id: 'b3-col-2', boardId: 'board-3', name: 'Framing & Structural', order: 1 },
    { id: 'b3-col-3', boardId: 'board-3', name: 'MEP Rough-in', order: 2 },
    { id: 'b3-col-4', boardId: 'board-3', name: 'Interior Finishes', order: 3 },
    { id: 'b3-col-5', boardId: 'board-3', name: 'Completed / Handover', order: 4 },
  ];
  const board3: Board = {
    id: 'board-3',
    name: 'Oak Ridge Estate - Phase 1',
    description: 'Luxury residential development project management',
    columns: b3Columns,
    members: ['demo-admin', 'demo-worker', 'demo-client'],
    icon: '🏠',
    starred: true,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now(),
    stats: { totalCards: 8, completedCards: 1, overdueCards: 1 },
  };
  boardStore.set(board3.id, board3);

  const b3cards = new Map<string, BoardCard>();
  
  b3cards.set('b3-c1', {
    id: 'b3-c1', boardId: 'board-3', columnId: 'b3-col-1',
    title: 'Site Clearing & Grading',
    description: 'Removal of debris and leveling the construction site.',
    priority: 'medium', 
    startDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 12).toISOString(),
    completed: true, order: 0, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [{ id: 'cl-r1', title: 'Site Prep', items: [{ id: 'ri-1', title: 'Utility marking', completed: true }, { id: 'ri-2', title: 'Topsoil removal', completed: true }] }],
    comments: [], attachments: [], tags: ['site'],
    timeLogs: [{ id: 'log-r1', userId: 'demo-worker', userName: 'Demo Worker', hours: 8, description: 'Completed grading', date: '2026-05-01', createdAt: Date.now() }],
    estimatedTime: 3, estimatedTimeUnit: 'days',
    cover: { type: 'image', value: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?w=800&q=80', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c2', {
    id: 'b3-c2', boardId: 'board-3', columnId: 'b3-col-1',
    title: 'Footing Reinforcement',
    description: 'Installation of rebar for the foundation footings.',
    priority: 'high', 
    startDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    order: 1, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [{ id: 'cl-r2', title: 'Inspection', items: [{ id: 'ri-3', title: 'Check rebar spacing', completed: false }] }],
    comments: [], attachments: [], tags: ['foundation'],
    estimatedTime: 5, estimatedTimeUnit: 'days',
    cover: { type: 'color', value: '#1e40af', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c3', {
    id: 'b3-c3', boardId: 'board-3', columnId: 'b3-col-2',
    title: 'OVERDUE: First Floor Framing',
    description: 'Assembling the structural walls for the ground floor.',
    priority: 'urgent', 
    startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    order: 0, createdAt: Date.now() - 86400000 * 7, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [{ id: 'cl-r3', title: 'Wall Sets', items: [{ id: 'ri-4', title: 'Exterior load-bearing', completed: true }, { id: 'ri-5', title: 'Interior partitions', completed: false }] }],
    comments: [], attachments: [], tags: ['framing'],
    estimatedTime: 7, estimatedTimeUnit: 'days',
    cover: { type: 'gradient', value: 'linear-gradient(135deg, #f97316, #ea580c)', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c4', {
    id: 'b3-c4', boardId: 'board-3', columnId: 'b3-col-3',
    title: 'Electrical Rough-in',
    description: 'Running wiring through the studs before drywall.',
    priority: 'high', 
    startDate: new Date(Date.now()).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    order: 0, createdAt: Date.now(), updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [], comments: [], attachments: [], tags: ['mep'],
    estimatedTime: 6, estimatedTimeUnit: 'days',
    cover: { type: 'emoji', value: '🔌', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c5', {
    id: 'b3-c5', boardId: 'board-3', columnId: 'b3-col-3',
    title: 'Plumbing Main Lines',
    description: 'Installing sewage and supply lines before the pour.',
    priority: 'high', 
    startDate: new Date(Date.now() - 86400000).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    order: 1, createdAt: Date.now() - 86400000, updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [], comments: [], attachments: [], tags: ['mep'],
    estimatedTime: 5, estimatedTimeUnit: 'days',
    cover: { type: 'color', value: '#065f46', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c6', {
    id: 'b3-c6', boardId: 'board-3', columnId: 'b3-col-4',
    title: 'Drywall Hanging & Finishing',
    description: 'Hanging sheetrock and multi-stage mudding/sanding.',
    priority: 'medium', 
    startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    order: 0, createdAt: Date.now(), updatedAt: Date.now(),
    assignees: [{ userId: 'demo-worker', email: 'worker@wayofwork.ai', displayName: 'Demo Worker' }],
    checklists: [{ id: 'cl-r4', title: 'Wall Check', items: [{ id: 'ri-6', title: 'Sand for primer', completed: false }] }],
    comments: [], attachments: [], tags: ['interior'],
    estimatedTime: 10, estimatedTimeUnit: 'days',
    cover: { type: 'image', value: 'https://images.unsplash.com/photo-1621905235277-3e1150247659?w=800&q=80', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c7', {
    id: 'b3-c7', boardId: 'board-3', columnId: 'b3-col-4',
    title: 'Interior Painting',
    description: 'Final coat of eggshell on all wall surfaces.',
    priority: 'low', 
    startDate: new Date(Date.now() + 86400000 * 21).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 25).toISOString(),
    order: 1, createdAt: Date.now(), updatedAt: Date.now(),
    assignees: [{ userId: 'demo-client', email: 'client@example.com', displayName: 'Demo Client' }],
    checklists: [{ id: 'cl-r5', title: 'Color Match', items: [{ id: 'ri-7', title: 'Confirm Slate Grey', completed: true }] }],
    comments: [], attachments: [], tags: ['interior', 'client'],
    estimatedTime: 4, estimatedTimeUnit: 'days',
    cover: { type: 'gradient', value: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', size: 'medium' },
    metadata: {},
  });

  b3cards.set('b3-c8', {
    id: 'b3-c8', boardId: 'board-3', columnId: 'b3-col-4',
    title: 'Cabinetry Installation',
    description: 'Kitchen and master bath custom cabinet mounting.',
    priority: 'medium', 
    startDate: new Date(Date.now() + 86400000 * 26).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 34).toISOString(),
    order: 2, createdAt: Date.now(), updatedAt: Date.now(),
    assignees: [{ userId: 'demo-admin', email: 'admin@wayofwork.ai', displayName: 'Demo Admin' }],
    checklists: [], comments: [], attachments: [], tags: ['interior', 'admin'],
    estimatedTime: 8, estimatedTimeUnit: 'days',
    cover: { type: 'gradient', value: 'linear-gradient(135deg, #a855f7, #ec4899)', size: 'medium' },
    metadata: {},
  });

  cardStore.set(board3.id, b3cards);

  // Members
  memberStore.set('board-1', [
    { id: 'mem-1', userId: 'user-1', email: 'alice@example.com', displayName: 'Alice Johnson', role: 'admin', addedAt: Date.now() - 86400000 * 7 },
    { id: 'mem-2', userId: 'user-2', email: 'bob@example.com', displayName: 'Bob Smith', role: 'member', addedAt: Date.now() - 86400000 * 5 },
  ]);
  memberStore.set('board-2', [
    { id: 'mem-3', userId: 'user-1', email: 'alice@example.com', displayName: 'Alice Johnson', role: 'owner', addedAt: Date.now() - 86400000 * 10 },
    { id: 'mem-4', userId: 'user-3', email: 'carol@example.com', displayName: 'Carol Williams', role: 'member', addedAt: Date.now() - 86400000 * 8 },
  ]);

  _boardIdCounter = 2;
  _cardIdCounter = 11;
}

// Initialize seed data immediately
seedInitialData();

// ── Service Implementation ──
export const kanbanService = {
  // ── Boards ──
  getAllBoards: async (): Promise<Board[]> => {
    return Array.from(boardStore.values());
  },

  getBoard: async (id: string): Promise<Board | null> => {
    return boardStore.get(id) || null;
  },

  createBoard: async (data: Partial<Board>, templateId?: string): Promise<Board> => {
    // If templateId is provided, delegate to createBoardFromTemplate
    if (templateId) {
      const board = await kanbanService.createBoardFromTemplate(templateId, data.name);
      if (data.description) {
        board.description = data.description;
      }
      return board;
    }
    const id = nextBoardId();
    const now = Date.now();
    const columns: BoardColumn[] = (data.columns && data.columns.length > 0
      ? data.columns
      : DEFAULT_COLUMNS
    ).map((col, i) => ({
      id: col.id || `col-${id}-${i}`,
      boardId: id,
      name: col.name,
      order: col.order ?? i,
      wip: col.wip,
    }));

    const board: Board = {
      id,
      name: data.name || 'Untitled Board',
      description: data.description || '',
      columns,
      members: data.members || [],
      icon: data.icon || '📋',
      starred: data.starred || false,
      archived: data.archived || false,
      createdAt: now,
      updatedAt: now,
      stats: { totalCards: 0, completedCards: 0 },
    };

    boardStore.set(id, board);
    cardStore.set(id, new Map());
    return board;
  },

  createBoardFromTemplate: async (templateIdOrData: string | BoardTemplate, nameOverride?: string): Promise<Board> => {
    const template = typeof templateIdOrData === 'string'
      ? BOARD_TEMPLATES.find(t => t.id === templateIdOrData)
      : templateIdOrData;

    if (!template) {
      // Fallback: create board with default columns
      return kanbanService.createBoard({ name: nameOverride || 'New Board' });
    }

    const id = nextBoardId();
    const now = Date.now();
    const columns: BoardColumn[] = template.columns.map((colName, i) => ({
      id: `col-${id}-${i}`,
      boardId: id,
      name: colName,
      order: i,
    }));

    const board: Board = {
      id,
      name: nameOverride || template.name,
      description: template.description,
      columns,
      members: [],
      icon: template.icon || '📋',
      starred: false,
      createdAt: now,
      updatedAt: now,
      stats: { totalCards: 0, completedCards: 0 },
    };

    boardStore.set(id, board);
    cardStore.set(id, new Map());
    return board;
  },

  updateBoard: async (id: string, data: Partial<Board>): Promise<void> => {
    const existing = boardStore.get(id);
    if (!existing) return;
    boardStore.set(id, { ...existing, ...data, updatedAt: Date.now() });
  },

  deleteBoard: async (id: string): Promise<void> => {
    boardStore.delete(id);
    cardStore.delete(id);
    memberStore.delete(id);
  },

  // ── Columns ──
  createColumn: async (boardId: string, column: Partial<BoardColumn>): Promise<void> => {
    const board = boardStore.get(boardId);
    if (!board) return;
    const maxOrder = board.columns.reduce((max, c) => Math.max(max, c.order), -1);
    const newCol: BoardColumn = {
      id: column.id || `col-${boardId}-${board.columns.length}`,
      boardId,
      name: column.name || 'New Column',
      order: column.order ?? maxOrder + 1,
      wip: column.wip,
    };
    board.columns.push(newCol);
    board.updatedAt = Date.now();
  },

  deleteColumn: async (boardId: string, columnId: string): Promise<void> => {
    const board = boardStore.get(boardId);
    if (!board) return;
    board.columns = board.columns.filter(c => c.id !== columnId);
    board.updatedAt = Date.now();

    // Delete cards in the deleted column
    const cards = cardStore.get(boardId);
    if (cards) {
      for (const [cid, card] of cards) {
        if (card.columnId === columnId) cards.delete(cid);
      }
    }
  },

  // ── Cards ──
  getAllCardsForBoard: async (boardId: string): Promise<BoardCard[]> => {
    const cards = cardStore.get(boardId);
    return cards ? Array.from(cards.values()) : [];
  },

  getCard: async (boardId: string, cardId: string): Promise<BoardCard | null> => {
    const cards = cardStore.get(boardId);
    return cards ? cards.get(cardId) || null : null;
  },

  createCard: async (boardId: string, cardData: Partial<BoardCard>): Promise<BoardCard> => {
    const id = nextCardId();
    const now = Date.now();
    const cards = cardStore.get(boardId) || new Map();
    cardStore.set(boardId, cards);

    // Determine order: place at end of column
    const sameColumn = Array.from(cards.values()).filter(c => c.columnId === cardData.columnId);
    const order = sameColumn.length;

    const card: BoardCard = {
      id,
      boardId,
      columnId: cardData.columnId || 'col-default',
      title: cardData.title || 'Untitled Card',
      description: cardData.description || '',
      priority: cardData.priority || 'medium',
      startDate: cardData.startDate,
      dueDate: cardData.dueDate,
      estimatedTime: cardData.estimatedTime,
      estimatedTimeUnit: cardData.estimatedTimeUnit || 'hours',
      assignees: cardData.assignees || [],
      labels: cardData.labels || [],
      tags: cardData.tags || [],
      completed: cardData.completed || false,
      checklists: cardData.checklists || [],
      comments: cardData.comments || [],
      attachments: cardData.attachments || [],
      cover: cardData.cover,
      metadata: cardData.metadata || {},
      order: cardData.order ?? order,
      createdAt: now,
      updatedAt: now,
    };

    cards.set(id, card);

    // Update board stats
    const board = boardStore.get(boardId);
    if (board) {
      const totalCards = cards.size;
      const completedCards = Array.from(cards.values()).filter(c => c.completed).length;
      board.stats = { totalCards, completedCards };
      board.updatedAt = now;
    }

    return card;
  },

  updateCard: async (boardId: string, cardId: string, data: Partial<BoardCard>): Promise<void> => {
    const cards = cardStore.get(boardId);
    if (!cards) return;
    const existing = cards.get(cardId);
    if (!existing) return;
    const updated = { ...existing, ...data, updatedAt: Date.now() };
    cards.set(cardId, updated);
  },

  deleteCard: async (cardId: string): Promise<void> => {
    for (const [boardId, cards] of cardStore) {
      if (cards.has(cardId)) {
        cards.delete(cardId);
        // Update board stats
        const board = boardStore.get(boardId);
        if (board) {
          const totalCards = cards.size;
          const completedCards = Array.from(cards.values()).filter(c => c.completed).length;
          board.stats = { totalCards, completedCards };
          board.updatedAt = Date.now();
        }
        return;
      }
    }
  },

  moveCard: async (boardId: string, cardId: string, targetColumnId: string, index: number): Promise<void> => {
    const cards = cardStore.get(boardId);
    if (!cards) return;
    const card = cards.get(cardId);
    if (!card) return;
    card.columnId = targetColumnId;
    card.order = index;
    card.updatedAt = Date.now();

    // Trigger auto notification if enabled
    if (card.enableWhatsApp) {
      await kanbanService.triggerTaskAutoNotification(boardId, cardId, 'status_change', `Task status changed to ${targetColumnId}`);
    }
  },

  // ── WhatsApp Integration ──
  sendWhatsAppMessage: async (boardId: string, cardId: string, userId: string, message: string): Promise<void> => {
    const cards = cardStore.get(boardId);
    if (!cards) return;
    const card = cards.get(cardId);
    if (!card) return;

    const user = userStore.get(userId);
    if (!user || !user.phone) throw new Error('User or WhatsApp number not found');

    const notification: any = {
      id: `wa-${Date.now()}`,
      type: 'admin_manual',
      message,
      sentAt: Date.now(),
      recipientPhone: user.phone,
    };

    if (!card.notifications) card.notifications = [];
    card.notifications.push(notification);
    card.updatedAt = Date.now();
    
    console.log(`[WhatsApp Bot] Sent to ${user.phone}: ${message}`);
  },

  toggleCardWhatsApp: async (boardId: string, cardId: string, enabled: boolean): Promise<void> => {
    const cards = cardStore.get(boardId);
    if (!cards) return;
    const card = cards.get(cardId);
    if (!card) return;
    card.enableWhatsApp = enabled;
    card.updatedAt = Date.now();
  },

  triggerTaskAutoNotification: async (boardId: string, cardId: string, type: string, message: string): Promise<void> => {
    const cards = cardStore.get(boardId);
    if (!cards) return;
    const card = cards.get(cardId);
    if (!card || !card.enableWhatsApp) return;

    // Send to all assignees
    card.assignees.forEach(assignee => {
      const user = userStore.get(assignee.userId);
      if (user && user.phone) {
        const notification: any = {
          id: `auto-${Date.now()}-${assignee.userId}`,
          type,
          message,
          sentAt: Date.now(),
          recipientPhone: user.phone,
        };
        if (!card.notifications) card.notifications = [];
        card.notifications.push(notification);
        console.log(`[Auto WhatsApp] Sent to ${user.phone}: ${message}`);
      }
    });
  },

  // ── Members ──
  getBoardMembers: async (boardId: string): Promise<BoardMember[]> => {
    return memberStore.get(boardId) || [];
  },

  inviteBoardMember: async (boardId: string, email: string, role: string): Promise<void> => {
    const members = memberStore.get(boardId) || [];
    const existingUser = SEED_USERS.find(u => u.email === email);
    if (!existingUser) return;
    // Don't add duplicates
    if (members.some(m => m.email === email)) return;
    const newMember: BoardMember = {
      id: `mem-${boardId}-${members.length + 1}`,
      userId: existingUser.id,
      email: existingUser.email,
      displayName: existingUser.displayName,
      role: role as BoardMember['role'],
      addedAt: Date.now(),
    };
    members.push(newMember);
    memberStore.set(boardId, members);

    // Add user to board members list
    const board = boardStore.get(boardId);
    if (board) {
      if (!board.members.includes(existingUser.id)) {
        board.members.push(existingUser.id);
      }
    }
  },

  removeBoardMember: async (boardId: string, memberId: string): Promise<void> => {
    const members = memberStore.get(boardId);
    if (!members) return;
    const member = members.find(m => m.id === memberId);
    memberStore.set(boardId, members.filter(m => m.id !== memberId));

    // Remove from board members list
    if (member) {
      const board = boardStore.get(boardId);
      if (board) {
        board.members = board.members.filter(id => id !== member.userId);
      }
    }
  },

  updateBoardMemberRole: async (boardId: string, memberId: string, role: string): Promise<void> => {
    const members = memberStore.get(boardId);
    if (!members) return;
    const member = members.find(m => m.id === memberId);
    if (member) {
      member.role = role as BoardMember['role'];
    }
  },

  // ── Time Logs ──
  addCardTimeLog: async (boardId: string, cardId: string, log: Omit<CardTimeLog, 'id' | 'createdAt'>): Promise<CardTimeLog> => {
    const cards = cardStore.get(boardId);
    if (!cards) throw new Error('Board not found');
    const card = cards.get(cardId);
    if (!card) throw new Error('Card not found');

    const newLog: CardTimeLog = {
      ...log,
      id: `log-${Date.now()}`,
      createdAt: Date.now(),
    };

    if (!card.timeLogs) card.timeLogs = [];
    card.timeLogs.push(newLog);
    card.updatedAt = Date.now();
    
    return newLog;
  },
};
