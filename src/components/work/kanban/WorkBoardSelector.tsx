/**
 * Board Selector Component
 * Component for selecting boards and creating boards from templates
 * Following WHN Chat design specifications
 */

import { useState, useEffect } from 'react';
import { kanbanService } from '../../../services/mockKanbanService';
import { BOARD_TEMPLATES, getTemplatesByCategory, type BoardTemplate } from '../../../services/boardTemplates';
import type { Board } from '../../../types/kanban';
import { Search, Plus, LayoutGrid, X, Star } from 'lucide-react';

interface BoardSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBoard: (boardId: string) => void;
  selectedBoardId?: string | null;
  onCreateBoard?: (board: Board) => void;
}

export default function WorkBoardSelector({
  isOpen,
  onClose,
  onSelectBoard,
  selectedBoardId,
  onCreateBoard,
}: BoardSelectorProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'boards' | 'templates'>('boards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [_selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBoards();
      loadTemplates();
    }
  }, [isOpen]);

  const loadBoards = async () => {
    try {
      const allBoards = await kanbanService.getAllBoards();
      setBoards(allBoards);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  const loadTemplates = () => {
    setTemplates(BOARD_TEMPLATES);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = BOARD_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    try {
      const board = await kanbanService.createBoardFromTemplate(templateId, `${template.name} - Copy`);
      await loadBoards();
      setShowCreateModal(false);
      setSelectedTemplate(null);
      if (onCreateBoard) {
        onCreateBoard(board);
      }
      onSelectBoard(board.id);
      onClose();
    } catch (error) {
      console.error('Failed to create board from template:', error);
    }
  };

  const handleCreateEmptyBoard = async () => {
    if (!newBoardName.trim()) return;

    try {
      const board = await kanbanService.createBoard({ name: newBoardName.trim() });
      await loadBoards();
      setShowCreateModal(false);
      setNewBoardName('');
      if (onCreateBoard) {
        onCreateBoard(board);
      }
      onSelectBoard(board.id);
      onClose();
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = selectedCategory
    ? getTemplatesByCategory(selectedCategory as any)
    : templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const categories: Array<{ value: string; label: string }> = [
    { value: '', label: 'All' },
    { value: 'software_development', label: 'Software Development' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'project_management', label: 'Project Management' },
    { value: 'personal', label: 'Personal' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#1e1e1e] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-[#cccccc]">Select Board</h2>
            <button
              onClick={onClose}
              className="p-2 text-[#858585] hover:text-[#cccccc] hover:bg-[#252526] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 px-6 pt-4 border-b border-gray-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab('boards')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'boards'
                  ? 'bg-[#ea580c] text-[#cccccc]'
                  : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
              }`}
            >
              My Boards ({boards.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'templates'
                  ? 'bg-[#ea580c] text-[#cccccc]'
                  : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
              }`}
            >
              Templates ({templates.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#858585]" />
              <input
                type="text"
                placeholder={activeTab === 'boards' ? 'Search boards...' : 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-gray-700 rounded-lg text-[#cccccc] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'boards' ? (
              <div className="space-y-4">
                {/* Create Empty Board Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-orange-600 hover:bg-[#ea580c]/10 transition-colors flex items-center justify-center gap-2 text-[#858585] hover:text-orange-400"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Board</span>
                </button>

                {/* Boards Grid */}
                {filteredBoards.length === 0 ? (
                  <div className="text-center py-12 text-[#585858]">
                    <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No boards found</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-orange-400 hover:text-orange-300"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBoards.map((board) => (
                      <button
                        key={board.id}
                        onClick={() => {
                          onSelectBoard(board.id);
                          onClose();
                        }}
                        className={`p-4 rounded-lg border-2 transition-all text-left hover:scale-105 ${
                          selectedBoardId === board.id
                            ? 'border-orange-600 bg-[#ea580c]/20'
                            : 'border-gray-700 bg-[#1e1e1e] hover:border-orange-600/50 hover:bg-[#252526]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {board.icon && <span className="text-2xl">{board.icon}</span>}
                            <h3 className="font-semibold text-[#cccccc] truncate">{board.name}</h3>
                          </div>
                          {board.starred && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                        </div>
                        {board.description && (
                          <p className="text-sm text-[#858585] mb-2 line-clamp-2">{board.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[#585858]">
                          <span>{board.columns.length} columns</span>
                          {board.stats && <span>{board.stats.totalCards} cards</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value || null)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        (selectedCategory || '') === cat.value
                          ? 'bg-[#ea580c] text-[#cccccc]'
                          : 'bg-[#252526] text-[#cccccc] hover:bg-gray-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Templates Grid */}
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-[#585858]">
                    <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No templates found</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-orange-400 hover:text-orange-300"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleCreateFromTemplate(template.id)}
                        className="p-4 rounded-lg border-2 border-gray-700 bg-[#1e1e1e] hover:border-orange-600 hover:bg-[#252526]/50 transition-all text-left hover:scale-105 group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.icon}</span>
                            <h3 className="font-semibold text-[#cccccc]">{template.name}</h3>
                          </div>
                          {template.featured && (
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          )}
                        </div>
                        <p className="text-sm text-[#858585] mb-3 line-clamp-2">{template.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {template.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-[#252526] text-[#cccccc] rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-[#585858]">
                          {template.columns.length} columns
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Empty Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[#1e1e1e] rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Create New Board</h3>
            <input
              type="text"
              placeholder="Board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateEmptyBoard();
                }
              }}
              className="w-full px-4 py-2 bg-[#1e1e1e] border border-gray-700 rounded-lg text-[#cccccc] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-[#252526] hover:bg-gray-600 text-[#cccccc] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEmptyBoard}
                disabled={!newBoardName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-orange-700 hover:to-orange-700 text-[#cccccc] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
