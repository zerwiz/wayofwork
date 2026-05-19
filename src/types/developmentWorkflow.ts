export type DevelopmentPhase = 'discovery' | 'design' | 'development' | 'testing' | 'deployment';

export interface DevelopmentStep {
  id: string;
  name: string;
  phase: DevelopmentPhase;
  description?: string;
  dueDate?: string;
  kanbanCardIds?: string[];
}

export interface DevelopmentWorkflow {
  id: string;
  name: string;
  description?: string;
  track?: string;
  steps: DevelopmentStep[];
}
