import type { DevelopmentWorkflow } from '../types/developmentWorkflow';

export const developmentWorkflowService = {
  getWorkflows: async (): Promise<DevelopmentWorkflow[]> => [],
  getAllWorkflows: async (): Promise<DevelopmentWorkflow[]> => [],
  getWorkflow: async (_id: string): Promise<DevelopmentWorkflow | null> => null,
  syncStepFromItemUpdate: async (_source: string, _item: any) => {},
  updateStep: async (_workflowId: string, _stepId: string, _data: any) => {},
};
