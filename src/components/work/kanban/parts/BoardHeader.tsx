import React from 'react';
import { LayoutGrid, List, Calendar, Clock, FileText, Folder, Plus, GripVertical, FolderKanban } from 'lucide-react';
import { Project } from '../../../../services/projectsService';
import { Board, BoardViewType } from '../../../../types/kanban';

interface BoardHeaderProps {
    board: Board;
    allProjects: Project[];
    viewType: BoardViewType;
    setViewType: (type: BoardViewType) => void;
    setCurrentBoardId: (id: string | null) => void;
    setShowCreateColumn: (show: boolean) => void;
    navigate: (path: string) => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
    board,
    allProjects,
    viewType,
    setViewType,
    setCurrentBoardId,
    setShowCreateColumn,
    navigate
}) => {
    return (
        <div className="bg-[#1e1e1e] border-b border-gray-700 pl-3 pr-2 sm:pl-4 lg:pl-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#cccccc] flex items-center gap-2 truncate">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 rounded flex items-center justify-center flex-shrink-0">
                            <GripVertical className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <span className="truncate">{board.name}</span>
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
                        <p className="text-xs sm:text-sm text-[#858585]">Manage tasks with Kanban board</p>
                        {board.projectIds && board.projectIds.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-[#585858] hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <FolderKanban className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 flex-shrink-0" />
                                    <span className="text-xs text-[#858585]">Linked to:</span>
                                    {board.projectIds.slice(0, 2).map((projectId) => {
                                        const project = allProjects.find((p) => p.id === projectId);
                                        if (!project) return null;
                                        return (
                                            <a
                                                key={projectId}
                                                href={`/company-projects`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate('/app/company-projects');
                                                }}
                                                className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                                            >
                                                {project.name}
                                                {board.projectIds && board.projectIds.length > 2 && board.projectIds.indexOf(projectId) === 1 && (
                                                    <span className="text-[#585858]">+{board.projectIds.length - 2}</span>
                                                )}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-1 bg-[#252526] rounded-lg p-1 border border-[#3c3c3c] overflow-x-auto flex-1 min-w-0">
                    <button onClick={() => setViewType('kanban')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'kanban' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Board</span>
                    </button>
                    <button onClick={() => setViewType('list')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'list' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <List className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">List</span>
                    </button>
                    <button onClick={() => setViewType('calendar')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'calendar' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Calendar</span>
                    </button>
                    <button onClick={() => setViewType('timeline')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'timeline' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Timeline</span>
                    </button>
                    <button onClick={() => setViewType('docs')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'docs' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Docs</span>
                    </button>
                    <button onClick={() => setViewType('drive')} className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${viewType === 'drive' ? 'bg-orange-600 text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc] hover:bg-gray-600'}`}>
                        <Folder className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Drive</span>
                    </button>
                    {viewType === 'kanban' && (
                        <button onClick={() => setShowCreateColumn(true)} className="px-2 sm:px-3 py-1.5 bg-orange-600 text-[#cccccc] rounded text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Add Column</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
