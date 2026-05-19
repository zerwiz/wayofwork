export type TemplateCategory = 'software_development' | 'sales' | 'marketing' | 'project_management' | 'personal' | 'construction' | 'ata';

export interface BoardTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  featured?: boolean;
  tags?: string[];
  columns: string[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  // ── Software Development ──
  {
    id: 'scrum-sprint',
    name: 'Scrum Sprint',
    category: 'software_development',
    description: 'Plan and track a Scrum sprint with Backlog, In Progress, Review, and Done columns.',
    icon: '🏃',
    featured: true,
    tags: ['agile', 'scrum', 'sprint'],
    columns: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
  },
  {
    id: 'kanban-dev',
    name: 'Development Kanban',
    category: 'software_development',
    description: 'Standard development workflow: To Do → In Progress → Code Review → Testing → Done.',
    icon: '💻',
    featured: true,
    tags: ['development', 'workflow'],
    columns: ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'],
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    category: 'software_development',
    description: 'Track reported bugs from triage through to verification and release.',
    icon: '🐛',
    tags: ['bugs', 'qa'],
    columns: ['Reported', 'Triage', 'In Progress', 'Fixed', 'Verified', 'Released'],
  },
  {
    id: 'bmad-method',
    name: 'BMad Method',
    category: 'software_development',
    description: 'BMad development methodology board with structured phases.',
    icon: '🎯',
    featured: true,
    tags: ['bmad', 'methodology'],
    columns: ['Backlog', 'Design', 'Development', 'Review', 'QA', 'Done'],
  },
  {
    id: 'quick-flow',
    name: 'Quick Flow',
    category: 'software_development',
    description: 'Lightweight rapid-development workflow for fast-moving teams.',
    icon: '⚡',
    tags: ['rapid', 'lightweight'],
    columns: ['Queue', 'Working', 'Done'],
  },

  // ── Project Management ──
  {
    id: 'project-mgmt',
    name: 'Project Management',
    category: 'project_management',
    description: 'Full project lifecycle from initiation to closure.',
    icon: '📊',
    featured: true,
    tags: ['project', 'lifecycle'],
    columns: ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closure'],
  },
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    category: 'project_management',
    description: 'Organize sprint goals, tasks, and deliverables.',
    icon: '📋',
    tags: ['sprint', 'planning'],
    columns: ['Goals', 'Tasks', 'In Progress', 'Review', 'Complete'],
  },

  // ── Marketing ──
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    category: 'marketing',
    description: 'Plan, create, and publish content across channels.',
    icon: '📅',
    featured: true,
    tags: ['content', 'calendar'],
    columns: ['Ideas', 'Drafting', 'Review', 'Scheduled', 'Published'],
  },
  {
    id: 'campaign-tracker',
    name: 'Campaign Tracker',
    category: 'marketing',
    description: 'Track marketing campaigns from concept to launch.',
    icon: '📢',
    tags: ['campaign', 'marketing'],
    columns: ['Planning', 'Design', 'Review', 'Live', 'Analysis'],
  },

  // ── Sales ──
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    category: 'sales',
    description: 'Manage leads through the sales funnel.',
    icon: '💰',
    featured: true,
    tags: ['sales', 'pipeline', 'crm'],
    columns: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
  },
  {
    id: 'customer-onboarding',
    name: 'Customer Onboarding',
    category: 'sales',
    description: 'Guide new customers through onboarding steps.',
    icon: '🤝',
    tags: ['onboarding', 'customer'],
    columns: ['Welcome', 'Setup', 'Training', 'Go Live', 'Follow-up'],
  },

  // ── Personal ──
  {
    id: 'personal-tasks',
    name: 'Personal Tasks',
    category: 'personal',
    description: 'Simple personal task management.',
    icon: '✅',
    tags: ['personal', 'tasks'],
    columns: ['To Do', 'Doing', 'Done'],
  },
  {
    id: 'goal-tracker',
    name: 'Goal Tracker',
    category: 'personal',
    description: 'Track personal goals and habits.',
    icon: '⭐',
    tags: ['goals', 'habits'],
    columns: ['Goals', 'In Progress', 'Achieved'],
  },

  // ── Construction ──
  {
    id: 'residential-construction',
    name: 'Residential Construction',
    category: 'construction',
    description: 'Track a residential build from foundation through final inspection.',
    icon: '🏠',
    featured: true,
    tags: ['construction', 'residential', 'building'],
    columns: ['Foundation', 'Framing', 'Roofing', 'Electrical', 'Plumbing', 'HVAC', 'Insulation', 'Drywall', 'Interior Finishes', 'Final Inspection'],
  },
  {
    id: 'commercial-construction',
    name: 'Commercial Construction',
    category: 'construction',
    description: 'Full lifecycle for commercial building projects.',
    icon: '🏢',
    featured: true,
    tags: ['construction', 'commercial', 'building'],
    columns: ['Site Preparation', 'Foundation', 'Structural Steel', 'MEP Rough-In', 'Interior Build-Out', 'Exterior', 'Commissioning', 'Handover'],
  },
  {
    id: 'renovation-project',
    name: 'Renovation Project',
    category: 'construction',
    description: 'Manage a renovation from survey through handover.',
    icon: '🔨',
    tags: ['construction', 'renovation', 'remodel'],
    columns: ['Survey & Assessment', 'Design', 'Permits', 'Demolition', 'Structural', 'MEP', 'Finishes', 'Cleanup', 'Handover'],
  },
  {
    id: 'construction-punch-list',
    name: 'Construction Punch List',
    category: 'construction',
    description: 'Track deficiencies and punch-list items through verification.',
    icon: '📋',
    tags: ['construction', 'punch-list', 'quality'],
    columns: ['Identified', 'Assigned', 'Scheduled', 'In Progress', 'Resolved', 'Verified'],
  },

  // ── ÄTA (Change Orders) ──
  {
    id: 'ata-workflow',
    name: 'ÄTA Workflow',
    category: 'ata',
    description: 'Manage ÄTA (Ändrings-, Tilläggs- och Avgående arbeten) from identification through invoicing.',
    icon: '📝',
    featured: true,
    tags: ['ata', 'change-order', 'construction', 'contract'],
    columns: ['Identified', 'Documented', 'Reviewed', 'Priced', 'Client Approval', 'Executed', 'Completed', 'Invoiced'],
  },
  {
    id: 'ata-change-log',
    name: 'ÄTA Change Order Log',
    category: 'ata',
    description: 'Log and track all change orders and amendments on a project.',
    icon: '📑',
    tags: ['ata', 'change-order', 'amendment'],
    columns: ['Submitted', 'Under Review', 'Negotiation', 'Approved', 'In Progress', 'Completed'],
  },
];

export const getTemplatesByCategory = (category: TemplateCategory): BoardTemplate[] => {
  return BOARD_TEMPLATES.filter(t => t.category === category);
};
