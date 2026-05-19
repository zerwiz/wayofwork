export type WorkflowTrack = string;

export interface Workflow {
  id: string;
  name: string;
  track?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
}
