export const developmentWorkflowService = {
  getWorkflows: async () => [],
  getAllWorkflows: async () => [],
  getWorkflow: async (_id: string): Promise<{ id: string; steps: { id: string; kanbanCardIds?: string[] }[] } | null> => null,
  syncStepFromItemUpdate: async (_source: string, _item: any) => {},
  updateStep: async (_workflowId: string, _stepId: string, _data: any) => {},
};
