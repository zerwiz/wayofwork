/**
 * PushWorkflowToKanbanModal Component
 * Modal for pushing entire development workflows to Kanban boards
 * Supports two modes: create cards in existing board OR create new board
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { kanbanService } from '../../../services/mockKanbanService';
import { developmentWorkflowService } from '../../../services/mockDevelopmentWorkflowService';
import { useToast } from '../../../context/ToastContext';
import type { Board, BoardColumn } from '../../../types/kanban';
import type { DevelopmentWorkflow } from '../../../types/developmentWorkflow';
import { X, LayoutGrid, Folder, Check, Plus, FileText } from 'lucide-react';
import { BOARD_TEMPLATES } from '../../../services/boardTemplates';

interface PushWorkflowToKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  onSuccess?: (boardId?: string) => void;
}

export function PushWorkflowToKanbanModal({
  isOpen,
  onClose,
  workflowId,
  onSuccess,
}: PushWorkflowToKanbanModalProps) {
  const { showToast } = useToast();
  const [workflow, setWorkflow] = useState<DevelopmentWorkflow | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [pushMode, setPushMode] = useState<'existing' | 'new-board'>('existing');
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardTemplateId, setNewBoardTemplateId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createCardsForAllSteps, setCreateCardsForAllSteps] = useState(true);

  // Load workflow when modal opens
  useEffect(() => {
    if (isOpen && workflowId) {
      (async () => {
        const loaded = developmentWorkflowService.getWorkflow(workflowId);
        if (loaded) {
          setWorkflow(loaded);
          setNewBoardName(`${loaded.name} - Development Board`);
          // Auto-select appropriate template based on workflow track
          if (loaded.track === 'bmad-method') {
            const template = BOARD_TEMPLATES.find(t => t.name.includes('BMad Method'));
            if (template) setNewBoardTemplateId(template.id);
          } else if (loaded.track === 'quick-flow') {
            const template = BOARD_TEMPLATES.find(t => t.name.includes('Quick Flow'));
            if (template) setNewBoardTemplateId(template.id);
          } else {
            // Default to Development Workflow template
            const template = BOARD_TEMPLATES.find(t => t.name.includes('Development'));
            if (template) setNewBoardTemplateId(template.id);
          }
        }

        const allBoards = await kanbanService.getAllBoards();
        setBoards(allBoards);
        
        // Auto-select first board if available
        if (allBoards.length > 0 && pushMode === 'existing') {
          setSelectedBoardId(allBoards[0].id);
        }
      })();
    } else {
      // Reset state when modal closes
      setSelectedBoardId('');
      setSelectedColumnId('');
      setColumns([]);
      setPushMode('existing');
      setNewBoardName('');
      setNewBoardTemplateId('');
      setCreateCardsForAllSteps(true);
    }
  }, [isOpen, workflowId, pushMode]);

  // Load columns when board is selected
  useEffect(() => {
    if (selectedBoardId && pushMode === 'existing') {
      (async () => {
        const board = await kanbanService.getBoard(selectedBoardId);
        if (board) {
          setColumns(board.columns);
          // Auto-select first column
          if (board.columns.length > 0) {
            setSelectedColumnId(board.columns[0].id);
          }
        }
      })();
    } else {
      setColumns([]);
      setSelectedColumnId('');
    }
  }, [selectedBoardId, pushMode]);

  const handlePushToKanban = async () => {
    if (!workflow) {
      showToast({
        type: 'error',
        message: 'Workflow not found',
        description: 'Unable to load workflow data',
        duration: 3000,
      });
      return;
    }

    if (pushMode === 'existing' && (!selectedBoardId || !selectedColumnId)) {
      showToast({
        type: 'error',
        message: 'Missing Information',
        description: 'Please select a board and column',
        duration: 3000,
      });
      return;
    }

    if (pushMode === 'new-board' && !newBoardName.trim()) {
      showToast({
        type: 'error',
        message: 'Missing Information',
        description: 'Please enter a board name',
        duration: 3000,
      });
      return;
    }

    setIsCreating(true);

    try {
      let targetBoardId = selectedBoardId;

      // Create new board if needed
      if (pushMode === 'new-board') {
        const newBoard = await kanbanService.createBoard(
          {
            name: newBoardName.trim(),
            description: `Kanban board for workflow: ${workflow.name}`,
          },
          newBoardTemplateId || undefined
        );
        targetBoardId = newBoard.id;

        showToast({
          type: 'success',
          message: 'Board Created',
          description: `Board "${newBoardName}" has been created`,
          duration: 3000,
        });
      }

      // Get target board and column
      const targetBoard = await kanbanService.getBoard(targetBoardId);
      if (!targetBoard) {
        throw new Error('Target board not found');
      }

      const targetColumnId = pushMode === 'new-board' 
        ? targetBoard.columns[0]?.id || ''
        : selectedColumnId;

      if (!targetColumnId) {
        throw new Error('No target column available');
      }

      // Create cards for workflow steps
      let cardsCreated = 0;
      if (createCardsForAllSteps && workflow.steps.length > 0) {
        for (const step of workflow.steps) {
          try {
            const cardData: Partial<any> = {
              title: step.name,
              description: step.description || undefined,
              priority: 'medium',
              tags: ['From Workflow', `Phase: ${step.phase}`],
              dueDate: step.dueDate ? new Date(step.dueDate).toISOString() : undefined,
              metadata: {
                developmentWorkflowId: workflow.id,
                developmentStepId: step.id,
              },
              columnId: targetColumnId,
            };

            const card = await kanbanService.createCard(targetBoardId, cardData);

            // Link step to card (bidirectional)
            const updatedKanbanCardIds = [...(step.kanbanCardIds || []), card.id];
            developmentWorkflowService.updateStep(workflow.id, step.id, {
              kanbanCardIds: updatedKanbanCardIds,
            });

            cardsCreated++;
          } catch (error) {
            console.error(`Failed to create card for step "${step.name}":`, error);
          }
        }
      } else {
        // Create a single card for the workflow itself
        const cardData: Partial<any> = {
          title: workflow.name,
          description: workflow.description || undefined,
          priority: 'medium',
          tags: ['From Workflow', `Track: ${workflow.track}`],
          metadata: {
            developmentWorkflowId: workflow.id,
          },
          columnId: targetColumnId,
        };

        await kanbanService.createCard(targetBoardId, cardData);
        cardsCreated = 1;
      }

      showToast({
        type: 'success',
        message: pushMode === 'new-board' ? 'Board and Cards Created' : 'Cards Created',
        description: `${cardsCreated} card${cardsCreated !== 1 ? 's' : ''} ${pushMode === 'new-board' ? 'created in new board' : 'added to board'}`,
        duration: 3000,
      });

      if (onSuccess) {
        onSuccess(pushMode === 'new-board' ? targetBoardId : undefined);
      }

      onClose();
    } catch (error) {
      console.error('Error pushing workflow to Kanban:', error);
      showToast({
        type: 'error',
        message: 'Failed to Push Workflow',
        description: error instanceof Error ? error.message : 'An error occurred',
        duration: 3000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !workflow) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card rounded-lg shadow-2xl max-w-2xl w-full border border-orange-500/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
          <div>
            <h2 className="text-xl font-bold gradient-text">Push Workflow to Kanban</h2>
            <p className="text-sm text-orange-300/70 mt-1">
              {pushMode === 'existing'
                ? 'Create cards from workflow steps in an existing board'
                : 'Create a new Kanban board with cards from all workflow steps'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#858585] hover:text-[#cccccc] transition-all duration-200 hover:bg-gradient-to-r hover:from-[#ea580c]/20 hover:to-[#c2410c]/20 hover:shadow-lg hover:shadow-orange-500/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Workflow Info */}
          <div className="p-4 bg-[#ea580c]/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold text-[#cccccc]">{workflow.name}</h3>
            </div>
            {workflow.description && (
              <p className="text-sm text-[#cccccc] mb-2">{workflow.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-[#858585]">
              <span>{workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>Track: {workflow.track}</span>
            </div>
          </div>

          {/* Push Mode Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#cccccc] mb-3">Push Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPushMode('existing')}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  pushMode === 'existing'
                    ? 'bg-gradient-to-r from-[#ea580c]/20 to-[#c2410c]/20 border-orange-500/50 text-[#cccccc]'
                    : 'bg-[#1e1e1e]/60 border-gray-700/50 text-[#cccccc] hover:border-[#3c3c3c]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="font-medium">Use Existing Board</span>
                </div>
                <p className="text-xs mt-1 opacity-75">Create cards in existing board</p>
              </button>
              <button
                type="button"
                onClick={() => setPushMode('new-board')}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  pushMode === 'new-board'
                    ? 'bg-gradient-to-r from-[#ea580c]/20 to-[#c2410c]/20 border-orange-500/50 text-[#cccccc]'
                    : 'bg-[#1e1e1e]/60 border-gray-700/50 text-[#cccccc] hover:border-[#3c3c3c]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Create New Board</span>
                </div>
                <p className="text-xs mt-1 opacity-75">Create new board with cards</p>
              </button>
            </div>
          </div>

          {/* Existing Board Mode */}
          {pushMode === 'existing' && (
            <>
              {/* Board Selector */}
              <div>
                <label className="block text-sm font-semibold text-[#cccccc] mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#ea580c]/20 to-[#c2410c]/20 flex items-center justify-center">
                    <LayoutGrid className="w-3 h-3 text-orange-400" />
                  </div>
                  Select Board
                </label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] select transition-all hover:border-orange-500/50"
                >
                  <option value="">Choose a board...</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column Selector */}
              {selectedBoardId && (
                <div>
                  <label className="block text-sm font-semibold text-[#cccccc] mb-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#ea580c]/20 to-[#c2410c]/20 flex items-center justify-center">
                      <Folder className="w-3 h-3 text-orange-400" />
                    </div>
                    Select Column
                  </label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] select transition-all hover:border-orange-500/50"
                  >
                    <option value="">Choose a column...</option>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* New Board Mode */}
          {pushMode === 'new-board' && (
            <>
              {/* Board Name */}
              <div>
                <label className="block text-sm font-semibold text-[#cccccc] mb-2">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] input-text transition-all hover:border-orange-500/50"
                  placeholder="Enter board name..."
                />
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-sm font-semibold text-[#cccccc] mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#ea580c]/20 to-[#c2410c]/20 flex items-center justify-center">
                    <LayoutGrid className="w-3 h-3 text-orange-400" />
                  </div>
                  Board Template (Optional)
                </label>
                <select
                  value={newBoardTemplateId}
                  onChange={(e) => setNewBoardTemplateId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] select transition-all hover:border-orange-500/50"
                >
                  <option value="">Default (To Do, In Progress, Done)</option>
                  {BOARD_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#858585] mt-1">
                  Select a template to pre-configure board columns
                </p>
              </div>
            </>
          )}

          {/* Options */}
          <div className="space-y-3 p-4 bg-[#ea580c]/5 border border-orange-500/20 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={createCardsForAllSteps}
                onChange={(e) => setCreateCardsForAllSteps(e.target.checked)}
                className="w-4 h-4 rounded border-orange-500/50 bg-[#1e1e1e]/60 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
              />
              <span className="text-sm text-[#cccccc] group-hover:text-[#cccccc] transition-colors">
                Create cards for all workflow steps ({workflow.steps.length} cards)
              </span>
            </label>
            {!createCardsForAllSteps && (
              <p className="text-xs text-[#858585] ml-7">
                A single card will be created for the workflow itself
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-orange-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1e1e1e]/60 hover:bg-[#252526]/80 text-[#cccccc] rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-[#3c3c3c]"
          >
            Cancel
          </button>
          <button
            onClick={handlePushToKanban}
            disabled={
              isCreating ||
              (pushMode === 'existing' && (!selectedBoardId || !selectedColumnId)) ||
              (pushMode === 'new-board' && !newBoardName.trim())
            }
            className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-orange-700 hover:to-orange-700 text-[#cccccc] rounded-lg transition-all font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {pushMode === 'new-board' ? 'Creating Board...' : 'Creating Cards...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {pushMode === 'new-board' ? 'Create Board & Cards' : 'Create Cards'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PushWorkflowToKanbanModal;
