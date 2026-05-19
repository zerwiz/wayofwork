import React from 'react';
import type { DevelopmentPhase } from '../../types/developmentWorkflow';

interface DevelopmentWorkflowSelectorProps {
  selectedPhase?: DevelopmentPhase;
  onPhaseChange?: (phase: DevelopmentPhase) => void;
}

const DevelopmentWorkflowSelector: React.FC<DevelopmentWorkflowSelectorProps> = ({
  selectedPhase,
  onPhaseChange,
}) => {
  return (
    <div className="development-workflow-selector">
      <span>{selectedPhase || 'No phase selected'}</span>
    </div>
  );
};

export default DevelopmentWorkflowSelector;
