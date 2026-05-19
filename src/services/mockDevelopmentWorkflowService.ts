import type { DevelopmentWorkflow, DevelopmentStep } from '../types/developmentWorkflow';

const mockWorkflows: DevelopmentWorkflow[] = [];

export const developmentWorkflowService = {
  getWorkflow: (id: string): DevelopmentWorkflow | undefined => mockWorkflows.find(w => w.id === id),
  getAllWorkflows: (): DevelopmentWorkflow[] => mockWorkflows,
  updateStep: (_workflowId: string, _stepId: string, _data: Partial<DevelopmentStep>): void => {},
  createWorkflow: (_data: Partial<DevelopmentWorkflow>): DevelopmentWorkflow => ({
    id: 'new-workflow', name: _data?.name || 'New Workflow', steps: [],
  } as DevelopmentWorkflow),
  syncStepFromItemUpdate: (_source: string, _itemId: string): void => {},
};
