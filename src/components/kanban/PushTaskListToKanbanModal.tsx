/**
 * PushTaskListToKanbanModal Component
 * Modal for pushing task lists to Kanban boards
 * Creates one card per task in the list
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { kanbanService } from '../../services/mockKanbanService';
import { tasksService } from '../../services/mockTasksService';
import { useToast } from '../../contexts/ToastContext';
import type { Board, BoardColumn, BoardCard } from '../../types/kanban';
import type { TaskList, Task } from '../../types/tasks';
import { X, LayoutGrid, Folder, Check, List } from 'lucide-react';

interface PushTaskListToKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskList: TaskList;
  onSuccess?: () => void;
}

export function PushTaskListToKanbanModal({
  isOpen,
  onClose,
  taskList,
  onSuccess,
}: PushTaskListToKanbanModalProps) {
  const { showToast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pushMode, setPushMode] = useState<'all' | 'selected'>('all');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [tasksInList, setTasksInList] = useState<Task[]>([]);

  // Load boards and tasks when modal opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        const allBoards = await kanbanService.getAllBoards();
        setBoards(allBoards);

        // Auto-select first board if available
        if (allBoards.length > 0) {
          setSelectedBoardId(allBoards[0].id);
        }

        // Load tasks in the list
        const tasks = tasksService.getTasksByTaskList(taskList.id);
        setTasksInList(tasks);
        setSelectedTasks(tasks.map((t) => t.id));

        // Reset push mode
        setPushMode('all');
      })();
    } else {
      // Reset all state when modal closes
      setSelectedBoardId('');
      setSelectedColumnId('');
      setPushMode('all');
      setSelectedTasks([]);
      setTasksInList([]);
    }
  }, [isOpen, taskList.id]);

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
    }
  }, [selectedBoardId]);

  const handleToggleTask = (taskId: string) => {
    if (pushMode === 'all') {
      // Switch to selected mode
      setPushMode('selected');
      setSelectedTasks([taskId]);
    } else {
      // Toggle task selection
      if (selectedTasks.includes(taskId)) {
        setSelectedTasks(selectedTasks.filter((id) => id !== taskId));
      } else {
        setSelectedTasks([...selectedTasks, taskId]);
      }
    }
  };

  const handleSelectAll = () => {
    setPushMode('all');
    setSelectedTasks(tasksInList.map((t) => t.id));
  };

  const handleDeselectAll = () => {
    setPushMode('selected');
    setSelectedTasks([]);
  };

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

    const tasksToPush = pushMode === 'all' ? tasksInList : tasksInList.filter((t) => selectedTasks.includes(t.id));

    if (tasksToPush.length === 0) {
      showToast({
        type: 'error',
        message: 'No Tasks Selected',
        description: 'Please select at least one task to push',
        duration: 3000,
      });
      return;
    }

    setIsCreating(true);

    try {
      const createdCards: BoardCard[] = [];

      for (const task of tasksToPush) {
        // Convert task to card format
        const cardData: Partial<any> = {
          title: task.title,
          description: task.description || undefined,
          priority: task.priority || 'medium',
          dueDate: task.dueDate || undefined,
          tags: task.tags ? [...task.tags, 'From Task List'] : ['From Task List'],
          assignees: task.assignees || undefined,
          metadata: {
            taskId: task.id,
            taskListId: taskList.id,
          },
          columnId: selectedColumnId,
        };

        const card = await kanbanService.createCard(selectedBoardId, cardData);
        createdCards.push(card);

        // Link task to card (bidirectional link)
        if (task.kanbanCardId !== card.id) {
          tasksService.updateTask(task.id, {
            kanbanCardId: card.id,
          });
        }
      }

      showToast({
        type: 'success',
        message: 'Tasks Pushed Successfully',
        description: `Created ${createdCards.length} card${createdCards.length !== 1 ? 's' : ''} from task list "${taskList.title}"`,
        duration: 3000,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Error pushing task list to Kanban:', error);
      showToast({
        type: 'error',
        message: 'Failed to Push Tasks',
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
        className="glass-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] border border-orange-500/30 animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/20 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold gradient-text">Push Task List to Kanban Board</h2>
            <p className="text-sm text-orange-300/70 mt-1">
              Create cards from tasks in "{taskList.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#858585] hover:text-white transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-600/20 hover:to-orange-600/20 hover:shadow-lg hover:shadow-orange-500/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Board Selector */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center">
                <LayoutGrid className="w-3 h-3 text-orange-400" />
              </div>
              Select Board
            </label>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full px-4 py-2 bg-[#252526]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-white select transition-all hover:border-orange-500/50"
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
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center">
                  <Folder className="w-3 h-3 text-orange-400" />
                </div>
                Select Column
              </label>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full px-4 py-2 bg-[#252526]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-white select transition-all hover:border-orange-500/50"
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

          {/* Task Selection */}
          {tasksInList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-white flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Select Tasks ({selectedTasks.length}/{tasksInList.length})
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-xs bg-[#252526]/60 hover:bg-[#333333]/80 text-[#a0a0a0] hover:text-white rounded-lg transition-all border border-[#333333]/50 hover:border-[#444444]"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1 text-xs bg-[#252526]/60 hover:bg-[#333333]/80 text-[#a0a0a0] hover:text-white rounded-lg transition-all border border-[#333333]/50 hover:border-[#444444]"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 border border-orange-500/30 rounded-lg p-3 bg-[#252526]/30">
                {tasksInList.map((task) => {
                  const isSelected = selectedTasks.includes(task.id);
                  return (
                    <label
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-500/50'
                          : 'bg-[#252526]/60 border border-[#333333]/50 hover:border-[#444444]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTask(task.id)}
                        className="w-4 h-4 rounded border-orange-500/50 bg-[#252526]/60 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-[#858585] mt-1 line-clamp-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {task.priority && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded border ${
                                task.priority === 'urgent'
                                  ? 'bg-red-600/20 text-red-400 border-red-500/50'
                                  : task.priority === 'high'
                                  ? 'bg-orange-600/20 text-orange-400 border-orange-500/50'
                                  : task.priority === 'medium'
                                  ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/50'
                                  : 'bg-green-600/20 text-green-400 border-green-500/50'
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-[#858585]">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {tasksInList.length === 0 && (
            <div className="text-center py-8 text-[#858585] border border-[#333333]/50 rounded-lg bg-[#252526]/30">
              <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks in this list</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-orange-500/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#252526]/60 hover:bg-[#333333]/80 text-white rounded-lg transition-all duration-200 border border-[#333333]/50 hover:border-[#444444]"
          >
            Cancel
          </button>
          <button
            onClick={handlePushToKanban}
            disabled={
              isCreating ||
              !selectedBoardId ||
              !selectedColumnId ||
              selectedTasks.length === 0
            }
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Cards...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create {selectedTasks.length} Card{selectedTasks.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PushTaskListToKanbanModal;
