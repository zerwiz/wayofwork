import React from 'react';
import { Search, Filter, Users, Settings, User } from 'lucide-react';
import { DevelopmentPhase } from '../../../../types/developmentWorkflow';
import { NSRFolder } from '../../../../types/nsrCompliance';
import { WorkflowTrack } from '../../../../types/workflows';

interface BoardControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onlyMyTasks: boolean;
  setOnlyMyTasks: (only: boolean) => void;
  selectedDevelopmentWorkflowId: string;
  setSelectedDevelopmentWorkflowId: (id: string) => void;
  selectedDevelopmentPhase: DevelopmentPhase | '';
  setSelectedDevelopmentPhase: (phase: DevelopmentPhase | '') => void;
  availableWorkflows: any[]; 
  selectedNSRFolder: NSRFolder | '';
  setSelectedNSRFolder: (folder: NSRFolder | '') => void;
  selectedWorkflowTrack: WorkflowTrack | '';
  setSelectedWorkflowTrack: (track: WorkflowTrack | '') => void;
  selectedWorkflowId: string;
  setSelectedWorkflowId: (id: string) => void;
  selectedEnterprisePhase: string;
  setSelectedEnterprisePhase: (phase: string) => void;
  availableWorkflowTracks: any[];
  setShowWorkTeamView: (show: boolean) => void;
  setShowBoardSettings: (show: boolean) => void;
  stats: any;
}

export const BoardControls: React.FC<BoardControlsProps> = ({
  searchQuery,
  setSearchQuery,
  onlyMyTasks,
  setOnlyMyTasks,
  selectedDevelopmentWorkflowId,
  setSelectedDevelopmentWorkflowId,
  selectedDevelopmentPhase,
  setSelectedDevelopmentPhase,
  availableWorkflows,
  selectedNSRFolder,
  setSelectedNSRFolder,
  selectedWorkflowTrack,
  setSelectedWorkflowTrack,
  selectedWorkflowId,
  setSelectedWorkflowId,
  selectedEnterprisePhase,
  setSelectedEnterprisePhase,
  availableWorkflowTracks,
  setShowWorkTeamView,
  setShowBoardSettings,
  stats,
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap p-4 bg-[#1e1e1e]">
      {/* Search */}
      <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
        <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#858585]" />
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#252526] border border-[#3c3c3c] rounded-lg pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-[#cccccc] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-[#cccccc] cursor-pointer hover:text-white transition-colors">
           <input type="checkbox" checked={onlyMyTasks} onChange={e => setOnlyMyTasks(e.target.checked)} className="accent-orange-500" />
           <User size={16} /> My Tasks
        </label>
      </div>

      {/* Development Workflow Filters */}
      {availableWorkflows.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <select
            value={selectedDevelopmentWorkflowId}
            onChange={(e) => setSelectedDevelopmentWorkflowId(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#252526] border border-[#3c3c3c] rounded-lg text-[#cccccc] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[120px] sm:min-w-0"
          >
            <option value="">All Workflows</option>
            {availableWorkflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name.length > 20 ? `${workflow.name.substring(0, 20)}...` : workflow.name}
              </option>
            ))}
          </select>
          {selectedDevelopmentWorkflowId && (
            <select
              value={selectedDevelopmentPhase}
              onChange={(e) => setSelectedDevelopmentPhase(e.target.value as DevelopmentPhase | '')}
              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#252526] border border-[#3c3c3c] rounded-lg text-[#cccccc] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[100px] sm:min-w-0"
            >
              <option value="">All Phases</option>
              <option value="analysis">Analysis</option>
              <option value="planning">Planning</option>
              <option value="solutioning">Solutioning</option>
              <option value="developing">Developing</option>
              <option value="implementation">Implementation</option>
              <option value="deploying">Deploying</option>
            </select>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          onClick={() => setShowWorkTeamView(true)}
          className="p-2 sm:px-4 sm:py-2 bg-[#252526] text-[#cccccc] rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          title="Members"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Members</span>
        </button>
        <button
          onClick={() => setShowBoardSettings(true)}
          className="p-2 sm:px-4 sm:py-2 bg-[#252526] text-[#cccccc] rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          title="Board Settings"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </div>
  );
};
