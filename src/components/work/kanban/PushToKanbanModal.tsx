/**
 * PushToKanbanModal Component
 * Modal for pushing tasks or notes to Kanban boards
 * Based on WHN Chat PushToKanbanModal
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { kanbanService } from '../../../services/mockKanbanService';
import { tasksService } from '../../../services/mockTasksService';
import { calendarService } from '../../../services/mockCalendarService';
import { developmentWorkflowService } from '../../../services/mockDevelopmentWorkflowService';
import { notesService } from '../../../services/mockNotesService';
import { useToast } from '../../../context/ToastContext';
import type { Board, BoardColumn, BoardCard } from '../../../types/kanban';
import { X, LayoutGrid, Folder, Check, FileText, Plus } from 'lucide-react';

interface PushToKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: 'task' | 'note' | 'calendar' | 'developmentStep';
  sourceId: string;
  sourceTitle: string;
  sourceDescription?: string;
  sourceAttachments?: Array<{ id: string; name: string; url: string; type: string; size: number }>;
  onSuccess?: (cardId: string) => void;
}

export function PushToKanbanModal({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  sourceTitle,
  sourceDescription,
  sourceAttachments,
  onSuccess,
}: PushToKanbanModalProps) {
  const { showToast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [linkToSource, setLinkToSource] = useState(true);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pushMode, setPushMode] = useState<'new' | 'existing'>('new');
  const [availableCards, setAvailableCards] = useState<BoardCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  // Load boards when modal opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        const allBoards = await kanbanService.getAllBoards();
        setBoards(allBoards);

        // Pre-fill title and description
        setCardTitle(sourceTitle);
        setCardDescription(sourceDescription || '');

        // Auto-select first board if available
        if (allBoards.length > 0) {
          setSelectedBoardId(allBoards[0].id);
        }

        // Reset push mode
        setPushMode('new');
        setSelectedCardId('');
      })();
    } else {
      // Reset all state when modal closes
      setSelectedBoardId('');
      setSelectedColumnId('');
      setCardTitle('');
      setCardDescription('');
      setPushMode('new');
      setSelectedCardId('');
      setAvailableCards([]);
    }
  }, [isOpen, sourceTitle, sourceDescription]);

  // Load columns when board is selected
  useEffect(() => {
    if (selectedBoardId) {
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
      setAvailableCards([]);
      setSelectedCardId('');
    }
  }, [selectedBoardId]);

  // Load cards when column is selected and push mode is 'existing'
  useEffect(() => {
    if (selectedBoardId && selectedColumnId && pushMode === 'existing') {
      (async () => {
        const allCards = await kanbanService.getAllCardsForBoard(selectedBoardId);
        const columnCards = allCards.filter((card) => card.columnId === selectedColumnId);
        setAvailableCards(columnCards);
        setSelectedCardId('');
      })();
    } else {
      setAvailableCards([]);
      setSelectedCardId('');
    }
  }, [selectedBoardId, selectedColumnId, pushMode]);

  const handlePushToKanban = async () => {
    if (!selectedBoardId || !selectedColumnId) {
      showToast({
        type: 'error',
        message: 'Missing Information',
        description: 'Please select a board and column',
        duration: 3000,
      });
      return;
    }

    if (pushMode === 'new' && !cardTitle.trim()) {
      showToast({
        type: 'error',
        message: 'Missing Information',
        description: 'Please enter a card title',
        duration: 3000,
      });
      return;
    }

    if (pushMode === 'existing' && !selectedCardId) {
      showToast({
        type: 'error',
        message: 'Missing Information',
        description: 'Please select a card to push to',
        duration: 3000,
      });
      return;
    }

    setIsCreating(true);

    try {
      // Convert attachments if included
      const cardAttachments = includeAttachments && sourceAttachments
        ? sourceAttachments.map(att => ({
            id: att.id,
            name: att.name,
            url: att.url,
            type: att.type,
            size: att.size,
            uploadedBy: 'current-user',
            uploadedAt: Date.now(),
          }))
        : [];

      if (pushMode === 'new') {
        // Create new card
        const cardData: Partial<any> = {
          title: cardTitle.trim(),
          description: cardDescription.trim() || undefined,
          priority: 'medium',
          tags: sourceType === 'task' ? ['From Task'] : sourceType === 'calendar' ? ['From Calendar'] : sourceType === 'developmentStep' ? ['From Workflow'] : ['From Note'],
          attachments: cardAttachments.length > 0 ? cardAttachments : undefined,
          metadata: linkToSource
            ? {
                ...(sourceType === 'task' ? { taskId: sourceId } : {}),
                ...(sourceType === 'note' ? { noteId: sourceId } : {}),
                ...(sourceType === 'calendar' ? { calendarEventId: sourceId } : {}),
                ...(sourceType === 'developmentStep' ? { developmentStepId: sourceId } : {}),
              }
            : undefined,
          columnId: selectedColumnId,
        };

        const card = await kanbanService.createCard(selectedBoardId, cardData);

        // Link source to card (bidirectional link)
        if (linkToSource) {
          if (sourceType === 'task') {
            tasksService.updateTask(sourceId, { kanbanCardId: card.id });
          } else if (sourceType === 'calendar') {
            calendarService.updateEvent(sourceId, { kanbanCardId: card.id, boardId: selectedBoardId });
          } else if (sourceType === 'developmentStep') {
            // Find the workflow and step
            const allWorkflows = developmentWorkflowService.getAllWorkflows();
            for (const workflow of allWorkflows) {
              const step = workflow.steps.find((s) => s.id === sourceId);
              if (step) {
                const updatedKanbanCardIds = [...(step.kanbanCardIds || []), card.id];
                developmentWorkflowService.updateStep(workflow.id, sourceId, { kanbanCardIds: updatedKanbanCardIds });
                break;
              }
            }
          } else if (sourceType === 'note') {
            notesService.updateNote(sourceId, { kanbanCardId: card.id });
          }
          if (onSuccess) {
            onSuccess(card.id);
          }
        }

        showToast({
          type: 'success',
          message: 'Card Created Successfully',
          description: `Card "${cardTitle}" has been added to the Kanban board`,
          duration: 3000,
        });
      } else {
        // Update existing card
        const existingCard = await kanbanService.getCard(selectedBoardId, selectedCardId);
        if (!existingCard) {
          throw new Error('Selected card not found');
        }

        // Merge content with existing card
        const updatedDescription = existingCard.description
          ? `${existingCard.description}\n\n---\n\n**From ${sourceType === 'task' ? 'Task' : 'Note'}:**\n${cardDescription.trim() || sourceDescription || ''}`
          : (cardDescription.trim() || sourceDescription || undefined);

        // Merge attachments
        const mergedAttachments = [
          ...(existingCard.attachments || []),
          ...cardAttachments,
        ];

        // Merge tags
        const sourceTag = sourceType === 'task' ? 'From Task' : sourceType === 'calendar' ? 'From Calendar' : sourceType === 'developmentStep' ? 'From Workflow' : 'From Note';
        const mergedTags = [
          ...(existingCard.tags || []),
          sourceTag,
        ];
        const uniqueTags = Array.from(new Set(mergedTags));

        // Update metadata
        const updatedMetadata = {
          ...(existingCard.metadata || {}),
          ...(linkToSource
            ? {
                ...(sourceType === 'task' ? { taskId: sourceId } : {}),
                ...(sourceType === 'note' ? { noteId: sourceId } : {}),
                ...(sourceType === 'calendar' ? { calendarEventId: sourceId } : {}),
                ...(sourceType === 'developmentStep' ? { developmentStepId: sourceId } : {}),
              }
            : {}),
        };

        // Update the card
        await kanbanService.updateCard(selectedBoardId, selectedCardId, {
          description: updatedDescription,
          attachments: mergedAttachments.length > 0 ? mergedAttachments : undefined,
          tags: uniqueTags,
          metadata: updatedMetadata,
        });

        // Link source to card (bidirectional link)
        if (linkToSource) {
          if (sourceType === 'task') {
            tasksService.updateTask(sourceId, { kanbanCardId: selectedCardId });
          } else if (sourceType === 'calendar') {
            calendarService.updateEvent(sourceId, { kanbanCardId: selectedCardId, boardId: selectedBoardId });
          } else if (sourceType === 'developmentStep') {
            // Find the workflow and step
            const allWorkflows = developmentWorkflowService.getAllWorkflows();
            for (const workflow of allWorkflows) {
              const step = workflow.steps.find((s) => s.id === sourceId);
              if (step && !step.kanbanCardIds?.includes(selectedCardId)) {
                const updatedKanbanCardIds = [...(step.kanbanCardIds || []), selectedCardId];
                developmentWorkflowService.updateStep(workflow.id, sourceId, { kanbanCardIds: updatedKanbanCardIds });
                break;
              }
            }
          } else if (sourceType === 'note') {
            notesService.updateNote(sourceId, { kanbanCardId: selectedCardId });
          }
          if (onSuccess) {
            onSuccess(selectedCardId);
          }
        }

        const sourceTypeLabel = sourceType === 'task' ? 'task' : sourceType === 'calendar' ? 'calendar event' : sourceType === 'developmentStep' ? 'development step' : 'note';
        showToast({
          type: 'success',
          message: 'Card Updated Successfully',
          description: `Content from ${sourceTypeLabel} has been added to the card`,
          duration: 3000,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error pushing to Kanban:', error);
      showToast({
        type: 'error',
        message: pushMode === 'new' ? 'Failed to Create Card' : 'Failed to Update Card',
        description: error instanceof Error ? error.message : 'An error occurred',
        duration: 3000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

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
        className="glass-card rounded-lg shadow-2xl max-w-md w-full border border-orange-500/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
          <div>
            <h2 className="text-xl font-bold gradient-text">Push to Kanban Board</h2>
            <p className="text-sm text-orange-300/70 mt-1">
              {pushMode === 'new'
                ? `Create a card from this ${sourceType === 'task' ? 'task' : sourceType === 'calendar' ? 'calendar event' : sourceType === 'developmentStep' ? 'development step' : 'note'}`
                : `Push this ${sourceType === 'task' ? 'task' : sourceType === 'calendar' ? 'calendar event' : sourceType === 'developmentStep' ? 'development step' : 'note'} to an existing card`}
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
        <div className="p-6 space-y-4">
          {/* Push Mode Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#cccccc] mb-3">Push Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPushMode('new');
                  setSelectedCardId('');
                }}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  pushMode === 'new'
                    ? 'bg-gradient-to-r from-[#ea580c]/20 to-[#c2410c]/20 border-orange-500/50 text-[#cccccc]'
                    : 'bg-[#1e1e1e]/60 border-gray-700/50 text-[#cccccc] hover:border-[#3c3c3c]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Create New Card</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPushMode('existing');
                  setCardTitle('');
                }}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  pushMode === 'existing'
                    ? 'bg-gradient-to-r from-[#ea580c]/20 to-[#c2410c]/20 border-orange-500/50 text-[#cccccc]'
                    : 'bg-[#1e1e1e]/60 border-gray-700/50 text-[#cccccc] hover:border-[#3c3c3c]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Push to Existing Card</span>
                </div>
              </button>
            </div>
          </div>

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

          {/* Card Selector (for existing card mode) */}
          {pushMode === 'existing' && selectedBoardId && selectedColumnId && (
            <div>
              <label className="block text-sm font-semibold text-[#cccccc] mb-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#ea580c]/20 to-[#c2410c]/20 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-orange-400" />
                </div>
                Select Card
              </label>
              {availableCards.length === 0 ? (
                <div className="px-4 py-3 bg-[#1e1e1e]/60 border border-orange-500/30 rounded-lg text-center text-[#858585]">
                  No cards available in this column
                </div>
              ) : (
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] select transition-all hover:border-orange-500/50"
                >
                  <option value="">Choose a card...</option>
                  {availableCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Card Title (only for new card mode) */}
          {pushMode === 'new' && (
            <div>
              <label className="block text-sm font-semibold text-[#cccccc] mb-2">Card Title</label>
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] input-text transition-all hover:border-orange-500/50"
                placeholder="Enter card title..."
              />
            </div>
          )}

          {/* Card Description */}
          <div>
            <label className="block text-sm font-semibold text-[#cccccc] mb-2">
              {pushMode === 'existing' ? 'Content to Add' : 'Card Description'}
            </label>
            <textarea
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-[#1e1e1e]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-[#cccccc] input-text transition-all hover:border-orange-500/50 resize-none"
              placeholder={pushMode === 'existing' ? 'Enter content to add to the card...' : 'Enter card description...'}
            />
            {pushMode === 'existing' && (
              <p className="text-xs text-[#858585] mt-1">
                This content will be appended to the existing card description
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 p-4 bg-[#ea580c]/5 border border-orange-500/20 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                className="w-4 h-4 rounded border-orange-500/50 bg-[#1e1e1e]/60 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
              />
              <span className="text-sm text-[#cccccc] group-hover:text-[#cccccc] transition-colors">
                Include attachments ({sourceAttachments?.length || 0} file{sourceAttachments?.length !== 1 ? 's' : ''})
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={linkToSource}
                onChange={(e) => setLinkToSource(e.target.checked)}
                className="w-4 h-4 rounded border-orange-500/50 bg-[#1e1e1e]/60 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
              />
              <span className="text-sm text-[#cccccc] group-hover:text-[#cccccc] transition-colors">
                Link back to {sourceType === 'task' ? 'task' : 'note'} (bidirectional link)
              </span>
            </label>
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
              !selectedBoardId ||
              !selectedColumnId ||
              (pushMode === 'new' && !cardTitle.trim()) ||
              (pushMode === 'existing' && !selectedCardId)
            }
            className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-orange-700 hover:to-orange-700 text-[#cccccc] rounded-lg transition-all font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {pushMode === 'new' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {pushMode === 'new' ? 'Create Card' : 'Update Card'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PushToKanbanModal;
