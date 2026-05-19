/**
 * Board Settings Modal Component
 * Edit board name, description, icon, color, visibility, and default view
 */

import React, { useState, useEffect } from 'react';
import Modal from '../modals/Modal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Save, Palette, Eye, EyeOff, LayoutGrid, Trash2, Archive, FolderKanban, Check, Columns } from 'lucide-react';
import type { Board, BoardViewType } from '../../types/kanban';
import type { Project } from '../../types/projects';
import { kanbanService } from '../../services/mockKanbanService';
import { projectsService } from '../../services/mockProjectsService';
import { useToast } from '../../contexts/ToastContext';
import { boardColorOptions, boardIconOptions } from '../../utils/boardConstants';

interface BoardSettingsModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  board,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [boardName, setBoardName] = useState(board.name);
  const [boardDescription, setBoardDescription] = useState(board.description || '');
  const [boardIcon, setBoardIcon] = useState(board.icon || '📋');
  const [boardColor, setBoardColor] = useState(board.color || '#6366f1');
  const [defaultView, setDefaultView] = useState<BoardViewType>(board.defaultView || 'kanban');
  const [visibility, setVisibility] = useState<'private' | 'company' | 'public'>(board.visibility || 'private');
  const [columnWidth, setColumnWidth] = useState<number>(board.columnWidth || 190);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBoardName(board.name);
      setBoardDescription(board.description || '');
      setBoardIcon(board.icon || '📋');
      setBoardColor(board.color || '#6366f1');
      setDefaultView(board.defaultView || 'kanban');
      setVisibility(board.visibility || 'private');
      setColumnWidth(board.columnWidth || 190);
      setSelectedProjectIds(board.projectIds || []);

      // Load all available projects
      try {
        const projects = projectsService.getAllProjects();
        setAvailableProjects(projects);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setAvailableProjects([]);
      }
    }
  }, [isOpen, board]);

  const handleSave = async () => {
    try {
      // Update board with project links
      await kanbanService.updateBoard(board.id, {
        name: boardName,
        description: boardDescription,
        icon: boardIcon,
        color: boardColor,
        defaultView,
        visibility,
        columnWidth,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      } as any);

      // Update bidirectional linking - ensure projects also reference this board
      const currentProjectIds = board.projectIds || [];
      
      // Add board to projects that are newly linked
      selectedProjectIds.forEach((projectId) => {
        if (!currentProjectIds.includes(projectId)) {
          const project = projectsService.getProject(projectId);
          if (project) {
            const updatedBoardIds = project.kanbanBoardIds || [];
            if (!updatedBoardIds.includes(board.id)) {
              projectsService.updateProject(projectId, {
                kanbanBoardIds: [...updatedBoardIds, board.id],
              });
            }
          }
        }
      });

      // Remove board from projects that are unlinked
      currentProjectIds.forEach((projectId) => {
        if (!selectedProjectIds.includes(projectId)) {
          const project = projectsService.getProject(projectId);
          if (project) {
            const updatedBoardIds = (project.kanbanBoardIds || []).filter((id) => id !== board.id);
            projectsService.updateProject(projectId, {
              kanbanBoardIds: updatedBoardIds.length > 0 ? updatedBoardIds : undefined,
            });
          }
        }
      });

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update board settings:', error);
    }
  };

  const handleArchiveClick = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchive = async () => {
    try {
      await kanbanService.updateBoard(board.id, { archived: true });
      onUpdated();
      onClose();
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error('Failed to archive board:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await kanbanService.deleteBoard(board.id);
      onUpdated();
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  // Use shared color and icon options
  const colorOptions = boardColorOptions;
  const iconOptions = boardIconOptions;

  const viewOptions: { value: BoardViewType; label: string }[] = [
    { value: 'kanban', label: 'Board' },
    { value: 'list', label: 'List' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'docs', label: 'Docs' },
    { value: 'drive', label: 'Drive' },
  ];

  const futureViewOptions: { value: string; label: string }[] = [
    { value: 'table', label: 'Table View' },
    { value: 'gantt', label: 'Gantt Chart' },
    { value: 'roadmap', label: 'Roadmap' },
    { value: 'activity', label: 'Activity Feed' },
    { value: 'portfolio', label: 'Portfolio View' },
  ];

  const handleViewSelect = (viewValue: string) => {
    // Check if it's a future view (coming soon)
    const isFutureView = futureViewOptions.some(v => v.value === viewValue);
    if (isFutureView) {
      const viewName = futureViewOptions.find(v => v.value === viewValue)?.label || viewValue;
      showToast({
        type: 'info',
        message: `${viewName} - Coming Soon!`,
        duration: 3000,
      });
      return;
    }
    // Allow selection of implemented views
    setDefaultView(viewValue as BoardViewType);
  };

  const columnWidthOptions = [
    { value: 150, label: 'Narrow (150px)' },
    { value: 190, label: 'Medium (190px)' },
    { value: 250, label: 'Wide (250px)' },
    { value: 300, label: 'Extra Wide (300px)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board Settings"
      maxWidth="sm"
      className="!max-w-[560px] w-[90vw] sm:w-auto"
    >
      <div className="space-y-3">
          {/* Board Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Board Name</label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#858585] focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter board name"
            />
          </div>

          {/* Board Description */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Description</label>
            <textarea
              value={boardDescription}
              onChange={(e) => setBoardDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#858585] focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter board description"
            />
          </div>

          {/* Board Icon */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {iconOptions.map((icon) => (
                <button
                  key={icon.value}
                  onClick={() => setBoardIcon(icon.value)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors flex-shrink-0 ${
                    boardIcon === icon.value
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-[#444444] hover:border-gray-500 bg-[#333333]'
                  }`}
                >
                  {icon.label}
                </button>
              ))}
            </div>
          </div>

          {/* Board Color */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {colorOptions.map((colorOption) => {
                const isSelected = boardColor === colorOption.value;
                return (
                  <button
                    key={colorOption.value}
                    onClick={() => setBoardColor(colorOption.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all flex-shrink-0 ${
                      isSelected ? 'border-white ring-2 ring-offset-1 ring-offset-gray-800 ring-orange-500' : 'border-[#444444] hover:border-gray-500'
                    }`}
                    style={
                      colorOption.type === 'gradient' && colorOption.gradient
                        ? { background: colorOption.gradient }
                        : { backgroundColor: colorOption.value }
                    }
                    title={colorOption.label || colorOption.value}
                  />
                );
              })}
            </div>
          </div>

          {/* Default View */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Default View
            </label>
            <select
              value={defaultView}
              onChange={(e) => setDefaultView(e.target.value as BoardViewType)}
              className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {viewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              {visibility === 'private' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Visibility
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  visibility === 'private'
                    ? 'bg-orange-600 text-white'
                    : 'bg-[#333333] text-[#a0a0a0] hover:bg-[#444444]'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                Private
              </button>
              <button
                onClick={() => setVisibility('public')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  visibility === 'public'
                    ? 'bg-orange-600 text-white'
                    : 'bg-[#333333] text-[#a0a0a0] hover:bg-[#444444]'
                }`}
              >
                <Eye className="w-4 h-4" />
                Public
              </button>
            </div>
          </div>

          {/* Column Width */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Columns className="w-4 h-4" />
              Column Width
            </label>
            <select
              value={columnWidth}
              onChange={(e) => setColumnWidth(Number(e.target.value))}
              className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {columnWidthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Future Views */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Additional Views (Coming Soon)
            </label>
            <div className="space-y-2">
              {futureViewOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleViewSelect(option.value)}
                  className="w-full px-4 py-2 bg-[#333333]/50 border border-[#444444]/50 rounded-lg text-white hover:bg-[#444444]/50 transition-colors text-left flex items-center justify-between opacity-75"
                  title="Coming Soon"
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-[#858585]">Coming Soon</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Projects */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Company Projects
            </label>
            <div className="px-4 py-3 bg-[#333333]/40 border border-[#444444]/30 rounded-lg">
              {availableProjects.length === 0 ? (
                <div className="text-center py-4">
                  <FolderKanban className="w-8 h-8 text-[#858585] mx-auto mb-2" />
                  <p className="text-sm text-[#858585]">No projects available</p>
                  <p className="text-xs text-[#6e6e6e] mt-1">Create a project in Company Projects first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {availableProjects.map((project) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProjectIds(selectedProjectIds.filter((id) => id !== project.id));
                          } else {
                            setSelectedProjectIds([...selectedProjectIds, project.id]);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-500/50'
                            : 'bg-[#444444]/40 border border-[#444444]/30 hover:border-orange-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FolderKanban className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{project.name}</span>
                          {project.description && (
                            <span className="text-xs text-[#858585] truncate hidden sm:inline">
                              - {project.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedProjectIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#444444]/30">
                  <p className="text-xs text-[#858585] mb-2">
                    {selectedProjectIds.length} project{selectedProjectIds.length !== 1 ? 's' : ''} linked
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectIds.map((projectId) => {
                      const project = availableProjects.find((p) => p.id === projectId);
                      if (!project) return null;
                      return (
                        <div
                          key={projectId}
                          className="flex items-center gap-1.5 px-2 py-1 bg-orange-600/20 border border-orange-500/30 rounded text-xs"
                        >
                          <FolderKanban className="w-3 h-3 text-orange-400 flex-shrink-0" />
                          <span className="text-orange-300">{project.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-[#333333] space-y-3">
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            
            <button
              onClick={handleArchiveClick}
              className="w-full px-4 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive Board
            </button>

            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Board Permanently
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#333333]">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Board"
        message="Archive this board? It will be hidden but can be restored later."
        type="warning"
        confirmText="Archive"
        cancelText="Cancel"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Board"
        message="Delete this board permanently? This action cannot be undone. All cards will be deleted."
        type="danger"
        confirmText="Delete Permanently"
        cancelText="Cancel"
      />
    </Modal>
  );
};
