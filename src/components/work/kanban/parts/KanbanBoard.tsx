import React from 'react';
import { GripVertical, FolderKanban, MoreHorizontal, Edit, Trash2, Clock, CheckCircle2, X } from 'lucide-react';
import { Board, BoardCard, BoardColumn } from '../../../../types/kanban';
import { DevelopmentPhase } from '../../../../types/developmentWorkflow';
import { NSRFolder } from '../../../../types/nsrCompliance';
import { WorkflowTrack } from '../../../../types/workflows';

interface KanbanBoardProps {
  board: Board;
  columns: BoardColumn[];
  cards: Map<string, BoardCard>;
  searchQuery: string;
  onlyMyTasks: boolean;
  selectedDevelopmentWorkflowId: string;
  selectedDevelopmentPhase: DevelopmentPhase | '';
  selectedNSRFolder: NSRFolder | '';
  selectedWorkflowTrack: WorkflowTrack | '';
  selectedWorkflowId: string;
  selectedEnterprisePhase: string;
  draggedCard: string | null;
  draggedOverColumn: string | null;
  handleDragStart: (e: React.DragEvent, cardId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent, columnId: string) => void;
  handleDrop: (e: React.DragEvent, columnId: string) => void;
  handleOpenWorkTaskCard: (cardId: string) => void;
  editingColumnId: string | null;
  editingColumnName: string;
  setEditingColumnId: (id: string | null) => void;
  setEditingColumnName: (name: string) => void;
  handleRenameColumn: (columnId: string) => void;
  handleDeleteColumn: (columnId: string) => void;
  columnMenuOpen: string | null;
  setColumnMenuOpen: (id: string | null) => void;
  columnMenuRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  getPriorityColor: (priority: string) => string;
  isOverdue: (date: string) => boolean;
  formatDate: (date: string) => string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  columns,
  cards,
  searchQuery,
  onlyMyTasks,
  selectedDevelopmentWorkflowId,
  selectedDevelopmentPhase,
  selectedNSRFolder,
  selectedWorkflowTrack,
  selectedWorkflowId,
  selectedEnterprisePhase,
  draggedCard,
  draggedOverColumn,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop,
  handleOpenWorkTaskCard,
  editingColumnId,
  editingColumnName,
  setEditingColumnId,
  setEditingColumnName,
  handleRenameColumn,
  handleDeleteColumn,
  columnMenuOpen,
  setColumnMenuOpen,
  columnMenuRefs,
  getPriorityColor,
  isOverdue,
  formatDate,
}) => {
  return (
    <div className="flex gap-3 sm:gap-4 h-full w-full overflow-x-auto overflow-y-hidden">
      {columns.map((column) => {
        const columnCards = Array.from(cards.values())
          .filter((c) => c.columnId === column.id)
          .sort((a, b) => a.order - b.order)
          .filter((card) => {
            if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (selectedDevelopmentWorkflowId && card.metadata?.developmentWorkflowId !== selectedDevelopmentWorkflowId) return false;
            if (selectedDevelopmentPhase && card.metadata?.developmentPhase !== selectedDevelopmentPhase) return false;
            if (selectedNSRFolder && card.metadata?.nsrFolder !== selectedNSRFolder) return false;
            if (selectedWorkflowTrack && card.metadata?.workflowTrack !== selectedWorkflowTrack) return false;
            if (selectedWorkflowId && card.metadata?.workflowId !== selectedWorkflowId) return false;
            if (selectedEnterprisePhase && card.metadata?.enterprisePhase !== selectedEnterprisePhase) return false;
            // if (onlyMyTasks) ... filtering logic needs user context
            return true;
          });

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 sm:w-auto sm:flex-1 sm:min-w-0 flex flex-col h-full ${
              draggedOverColumn === column.id ? 'ring-2 ring-orange-500' : ''
            }`}
            style={{ width: board?.columnWidth ? `${board.columnWidth}px` : '190px' }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="bg-[#1e1e1e] rounded-t-lg p-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#cccccc] cursor-pointer hover:text-orange-400 transition-colors"
                        onClick={() => { setEditingColumnId(column.id); setEditingColumnName(column.name); }}>
                        {column.name} {columnCards.length}
                      </h3>
                    </div>
                  </div>
                  <div className="relative" ref={(el) => { if (el) columnMenuRefs.current.set(column.id, el); }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id); }}
                      className="p-1 text-[#858585] hover:text-[#cccccc] transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {columnMenuOpen === column.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-700 z-20">
                        <button onClick={() => { setEditingColumnId(column.id); setEditingColumnName(column.name); setColumnMenuOpen(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-[#252526] flex items-center gap-2">
                          <Edit className="w-3 h-3" /> Rename
                        </button>
                        <button onClick={() => handleDeleteColumn(column.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/20 text-red-400 flex items-center gap-2">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 bg-[#1e1e1e]/50 rounded-b-lg p-2 sm:p-3 space-y-2 overflow-y-auto min-h-0">
              {columnCards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleOpenWorkTaskCard(card.id)}
                  className={`group relative bg-[#252526] rounded-lg overflow-hidden cursor-move hover:bg-gray-600 transition-colors border border-[#3c3c3c] ${
                    draggedCard === card.id ? 'opacity-40' : ''
                  }`}
                >
                  {card.cover && (
                    <div className="w-full h-24 flex-shrink-0"
                      style={{
                        ...(card.cover.type === 'color' && { backgroundColor: card.cover.value }),
                        ...(card.cover.type === 'gradient' && { background: card.cover.value }),
                        ...(card.cover.type === 'image' && { backgroundImage: `url(${card.cover.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }),
                      }}
                    />
                  )}
                  <div className="p-2 sm:p-3">
                    <h4 className="text-sm text-[#cccccc] font-medium break-words line-clamp-2">{card.title}</h4>
                    {card.description && <p className="text-xs text-[#858585] line-clamp-2">{card.description}</p>}
                    <div className="flex flex-col gap-2 mt-2">
                      {card.priority && <span className={`text-xs px-2 py-0.5 rounded w-fit ${getPriorityColor(card.priority)}`}>{card.priority}</span>}
                      {card.dueDate && (
                        <div className={`flex items-center gap-1 text-xs ${isOverdue(card.dueDate) ? 'text-red-400' : 'text-[#858585]'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(card.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
