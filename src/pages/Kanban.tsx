/**
 * Kanban Page - Enhanced
 * Kanban board interface with drag-and-drop functionality
 * Based on WHN Chat KanbanBoard component with enhanced features
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { kanbanService } from '../services/mockKanbanService';
import { notesService } from '../services/mockNotesService';
import { tasksService } from '../services/mockTasksService';
import { projectsService } from '../services/mockProjectsService';
import { driveService } from '../services/mockDriveService';
import { calendarService } from '../services/mockCalendarService';
import { developmentWorkflowService } from '../services/mockDevelopmentWorkflowService';
import { workflowsService } from '../services/mockWorkflowsService';
import type { DevelopmentWorkflow, DevelopmentPhase } from '../types/developmentWorkflow';
import type { Workflow, WorkflowTrack } from '../types/workflows';
import type { NSRFolder } from '../types/nsrCompliance';
import { NSR_MANDATORY_FOLDERS, NSR_FOLDER_DISPLAY_NAMES } from '../types/nsrCompliance';
import NSRFolderBadge from '../components/development/NSRFolderBadge';
import NSRComplianceBadge from '../components/development/NSRComplianceBadge';
import { useToast } from '../contexts/ToastContext';
import { BOARD_TEMPLATES, getTemplatesByCategory, type TemplateCategory } from '../services/boardTemplates';
import CardView from '../components/kanban/CardView';
import { BoardSettingsModal } from '../components/kanban/BoardSettingsModal';
import { BoardMembers } from '../components/kanban/BoardMembers';
import BoardSelector from '../components/kanban/BoardSelector';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import BoardDocsView from '../components/kanban/BoardDocsView';
import BoardDriveView from '../components/kanban/BoardDriveView';
import type { Board, BoardCard } from '../types/kanban';
import type { DriveFile } from '../types/drive';
import {
  Plus,
  MoreHorizontal,
  Search,
  Trash2,
  Edit,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Copy,
  X,
  List,
  Calendar,
  LayoutGrid,
  FileText,
  Folder,
  Filter,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Star,
  Sparkles,
  ExternalLink,
  FolderKanban,
  GitBranch,
  // Archive, // TODO: Use for archive functionality
} from 'lucide-react';
import type { BoardViewType } from '../types/kanban';

export default function Kanban() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Map<string, BoardCard>>(new Map());
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevelopmentWorkflowId, setSelectedDevelopmentWorkflowId] = useState<string | ''>('');
  const [selectedDevelopmentPhase, setSelectedDevelopmentPhase] = useState<DevelopmentPhase | ''>('');
  const [selectedNSRFolder, setSelectedNSRFolder] = useState<NSRFolder | ''>('');
  const [availableWorkflows, setAvailableWorkflows] = useState<DevelopmentWorkflow[]>([]);
  // Workflow track filtering (Quick Flow, Project Management, Enterprise Method)
  const [selectedWorkflowTrack, setSelectedWorkflowTrack] = useState<WorkflowTrack | ''>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | ''>('');
  const [selectedEnterprisePhase, setSelectedEnterprisePhase] = useState<string | ''>('');
  const [availableWorkflowTracks, setAvailableWorkflowTracks] = useState<Workflow[]>([]);
  const [cardViewOpen, setCardViewOpen] = useState(false);
  const [cardViewCardId, setCardViewCardId] = useState<string | null>(null);
  const [cardViewColumnId, setCardViewColumnId] = useState<string | null>(null);
  const [cardViewCreateMode, setCardViewCreateMode] = useState(false);
  const [viewType, setViewType] = useState<BoardViewType>('kanban');
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);
  const [boardListMenuOpen, setBoardListMenuOpen] = useState<string | null>(null);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showBoardMembers, setShowBoardMembers] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<'day' | 'week' | 'month'>('week');
  const [timelineDate, setTimelineDate] = useState(new Date());
  const [draggingTimelineCard, setDraggingTimelineCard] = useState<string | null>(null);
  const [timelineDragStart, setTimelineDragStart] = useState<{ x: number; startDate: Date; dueDate: Date } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [deleteColumnModalOpen, setDeleteColumnModalOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [deleteCardModalOpen, setDeleteCardModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [deleteBoardModalOpen, setDeleteBoardModalOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [boardListSearchQuery, setBoardListSearchQuery] = useState('');
  const [boardListFilter, setBoardListFilter] = useState<'all' | 'starred' | 'archived'>('all');
  const [boardListViewMode, setBoardListViewMode] = useState<'grid' | 'list'>('grid');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templatesSearchQuery, setTemplatesSearchQuery] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | null>(null);
  const [_driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [_driveSearchQuery, _setDriveSearchQuery] = useState('');
  const [driveCurrentFolder, setDriveCurrentFolder] = useState<string | undefined>(undefined);
  const [_driveFolderPath, setDriveFolderPath] = useState<DriveFile[]>([]);
  const [_showConnectFileModal, _setShowConnectFileModal] = useState(false);
  const [_fileToConnect, _setFileToConnect] = useState<DriveFile | null>(null);
  const { showToast } = useToast();
  const columnMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const boardListMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadAllBoards();
    
    // Check URL parameters for board and card
    const boardParam = searchParams.get('board');
    const cardParam = searchParams.get('card');
    
    if (boardParam) {
      setCurrentBoardId(boardParam);
      // If card is specified, open it after board loads
      if (cardParam) {
        setTimeout(() => {
          setCardViewCardId(cardParam);
          setCardViewOpen(true);
        }, 500);
      }
      // Clear URL parameters after using them
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (currentBoardId) {
      loadBoard();
      loadDriveFiles();
    }
  }, [currentBoardId, driveCurrentFolder]);

  useEffect(() => {
    if (viewType === 'drive' && currentBoardId) {
      loadDriveFiles();
    }
  }, [viewType, currentBoardId, driveCurrentFolder]);

  const loadAllBoards = async () => {
    try {
      const boards = await kanbanService.getAllBoards();
      setAllBoards(boards);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  useEffect(() => {
    // Close menus when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      columnMenuRefs.current.forEach((ref, columnId) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (columnMenuOpen === columnId) {
            setColumnMenuOpen(null);
          }
        }
      });
      cardMenuRefs.current.forEach((ref, cardId) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (cardMenuOpen === cardId) {
            setCardMenuOpen(null);
          }
        }
      });
      boardListMenuRefs.current.forEach((ref, boardId) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (boardListMenuOpen === boardId) {
            setBoardListMenuOpen(null);
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnMenuOpen, cardMenuOpen, boardListMenuOpen]);

  useEffect(() => {
    // Load available development workflows
    const workflows = developmentWorkflowService.getAllWorkflows();
    setAvailableWorkflows(workflows);
    
    // Load available workflow tracks (Quick Flow, Project Management, Enterprise Method)
    (async () => {
      const workflowTracks = await workflowsService.getAllWorkflows();
      setAvailableWorkflowTracks(workflowTracks);
    })();
  }, []);

  const loadBoard = async () => {
    if (!currentBoardId) {
      setBoard(null);
      setCards(new Map());
      return;
    }

    try {
      const loadedBoard = await kanbanService.getBoard(currentBoardId);
      if (loadedBoard) {
        setBoard(loadedBoard);
        const allCards = await kanbanService.getAllCardsForBoard(currentBoardId);
        const cardMap = new Map<string, BoardCard>();
        allCards.forEach((card) => {
          cardMap.set(card.id, card);
        });
        setCards(cardMap);
      } else {
        // Board not found, reset selection
        setCurrentBoardId(null);
        loadAllBoards();
      }
    } catch (error) {
      console.error('Failed to load board:', error);
      showToast({
        type: 'error',
        message: 'Failed to load Kanban board',
        duration: 3000,
      });
    }
  };

  const loadDriveFiles = () => {
    try {
      // Load all files from Storage
      const allFiles = driveService.getAllFiles();
      
      // Filter files connected to current board or cards in the board
      const boardFiles = allFiles.filter(
        (file) =>
          file.kanbanBoardId === currentBoardId ||
          (file.kanbanCardId &&
            Array.from(cards.values()).some((card) => card.id === file.kanbanCardId))
      );

      // If in a folder, show files in that folder
      if (driveCurrentFolder) {
        const folderFiles = driveService.getFiles(driveCurrentFolder);
        // Combine with board files that are in this folder
        const filtered = folderFiles.filter(
          (file) =>
            boardFiles.some((bf) => bf.id === file.id) ||
            (!file.kanbanBoardId && !file.kanbanCardId) // Also show unconnected files
        );
        setDriveFiles(filtered);
      } else {
        // Show all board files and unconnected files
        const unconnectedFiles = allFiles.filter(
          (file) => !file.kanbanBoardId && !file.kanbanCardId
        );
        setDriveFiles([...boardFiles, ...unconnectedFiles]);
      }

      // Build folder path
      if (driveCurrentFolder) {
        const path: DriveFile[] = [];
        let currentId: string | undefined = driveCurrentFolder;
        const visited = new Set<string>();
        
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const folder = driveService.getFile(currentId);
          if (folder && folder.type === 'folder') {
            path.unshift(folder);
            currentId = folder.parentId;
          } else {
            break;
          }
        }
        setDriveFolderPath(path);
      } else {
        setDriveFolderPath([]);
      }
    } catch (error) {
      console.error('Failed to load drive files:', error);
      setDriveFiles([]);
    }
  };

  // File connection handlers - to be implemented when file linking UI is added
  // const handleConnectFileToCard = (file: DriveFile, cardId: string) => { ... }
  // const handleDisconnectFileFromCard = (file: DriveFile) => { ... }
  // const handleConnectFileToBoard = (file: DriveFile) => { ... }
  // const handleNavigateDriveUp = () => { ... }

  const handleNavigateToDriveFolder = (folderId?: string) => {
    setDriveCurrentFolder(folderId);
  };

  // Document linking handlers
  const handleLinkDocument = async (cardId: string, documentId: string) => {
    try {
      if (!currentBoardId) return;
      
      const card = cards.get(cardId);
      if (!card) return;

      const currentDocIds = card.metadata?.documentIds || [];
      if (!currentDocIds.includes(documentId)) {
        await kanbanService.updateCard(currentBoardId, cardId, {
          metadata: {
            ...(card.metadata || {}),
            documentIds: [...currentDocIds, documentId],
          },
        });
        loadBoard();
        showToast({
          type: 'success',
          message: 'Document linked to card successfully',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to link document:', error);
      showToast({
        type: 'error',
        message: 'Failed to link document to card',
        duration: 3000,
      });
    }
  };

  const handleUnlinkDocument = async (cardId: string, documentId: string) => {
    try {
      if (!currentBoardId) return;
      
      const card = cards.get(cardId);
      if (!card) return;

      const currentDocIds = card.metadata?.documentIds || [];
      await kanbanService.updateCard(currentBoardId, cardId, {
        metadata: {
          ...card.metadata,
          documentIds: currentDocIds.filter((id: string) => id !== documentId),
        },
      });
      loadBoard();
      showToast({
        type: 'success',
        message: 'Document unlinked from card successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to unlink document:', error);
      showToast({
        type: 'error',
        message: 'Failed to unlink document from card',
        duration: 3000,
      });
    }
  };

  // File linking handlers (updated to use fileIds array)
  const handleLinkFile = async (cardId: string, fileId: string) => {
    try {
      if (!currentBoardId) return;
      
      const card = cards.get(cardId);
      if (!card) return;

      const currentFileIds = card.metadata?.fileIds || [];
      if (!currentFileIds.includes(fileId)) {
        // Update file to link to card
        driveService.updateFile(fileId, { kanbanCardId: cardId, kanbanBoardId: currentBoardId });
        
        // Update card metadata to link to file
        await kanbanService.updateCard(currentBoardId, cardId, {
          metadata: {
            ...(card.metadata || {}),
            fileIds: [...currentFileIds, fileId],
            // Keep legacy fileId for backward compatibility
            fileId: currentFileIds.length === 0 ? fileId : card.metadata?.fileId,
          },
        });
        loadBoard();
        loadDriveFiles();
        showToast({
          type: 'success',
          message: 'File linked to card successfully',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to link file:', error);
      showToast({
        type: 'error',
        message: 'Failed to link file to card',
        duration: 3000,
      });
    }
  };

  const handleUnlinkFile = async (cardId: string, fileId: string) => {
    try {
      if (!currentBoardId) return;
      
      const card = cards.get(cardId);
      if (!card) return;

      const currentFileIds = card.metadata?.fileIds || [];
      await kanbanService.updateCard(currentBoardId, cardId, {
        metadata: {
          ...card.metadata,
          fileIds: currentFileIds.filter((id: string) => id !== fileId),
          // Clear legacy fileId if it matches
          fileId: card.metadata?.fileId === fileId ? undefined : card.metadata?.fileId,
        },
      });
      
      // Update file to remove links
      driveService.updateFile(fileId, { kanbanCardId: undefined, kanbanBoardId: undefined });
      
      loadBoard();
      loadDriveFiles();
      showToast({
        type: 'success',
        message: 'File unlinked from card successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to unlink file:', error);
      showToast({
        type: 'error',
        message: 'Failed to unlink file from card',
        duration: 3000,
      });
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const allCards = Array.from(cards.values());
    const total = allCards.length;
    const completed = allCards.filter((c) => c.completed).length;
    const inProgress = allCards.filter(
      (c) => !c.completed && board?.columns.find((col) => col.id === c.columnId)?.name !== 'Done'
    ).length;
    const now = new Date();
    const overdue = allCards.filter(
      (c) => !c.completed && c.dueDate && new Date(c.dueDate) < now
    ).length;

    return { total, completed, inProgress, overdue };
  };

  const stats = calculateStats();

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedCard(null);
    setDraggedColumn(null);
    setDraggedOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    e.stopPropagation();
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.5';
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedColumn || !board || !currentBoardId || draggedColumn === targetColumnId) return;

    const columnIds = board.columns.map(c => c.id);
    const fromIndex = columnIds.indexOf(draggedColumn);
    const toIndex = columnIds.indexOf(targetColumnId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newColumns = [...board.columns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn!);

    // Update order values
    const orderedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }));

    try {
      await kanbanService.updateBoard(currentBoardId, { columns: orderedColumns });
      loadBoard();
      showToast({
        type: 'success',
        message: 'Column reordered',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      showToast({
        type: 'error',
        message: 'Failed to reorder columns',
        duration: 3000,
      });
    } finally {
      setDraggedColumn(null);
      setDraggedOverColumn(null);
    }
  };

  // Timeline drag handlers
  const handleTimelineDragStart = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const card = cards.get(cardId);
    if (!card || !currentBoardId) return;

    const startDate = card.startDate ? new Date(card.startDate) : (card.dueDate ? new Date(new Date(card.dueDate).getTime() - 7 * 24 * 60 * 60 * 1000) : new Date());
    const dueDate = card.dueDate ? new Date(card.dueDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    setDraggingTimelineCard(cardId);
    setTimelineDragStart({
      x: e.clientX,
      startDate,
      dueDate,
    });
  };

  const handleTimelineDrag = (e: React.MouseEvent) => {
    if (!draggingTimelineCard || !timelineDragStart || !currentBoardId) return;
    e.preventDefault();
    // Visual feedback only - actual update happens on drag end
  };

  const handleTimelineDragEnd = async (e: React.MouseEvent) => {
    if (!draggingTimelineCard || !timelineDragStart || !currentBoardId) {
      setDraggingTimelineCard(null);
      setTimelineDragStart(null);
      return;
    }

    const timelineContainer = e.currentTarget.closest('.timeline-container');
    if (!timelineContainer) {
      setDraggingTimelineCard(null);
      setTimelineDragStart(null);
      return;
    }

    const rect = timelineContainer.getBoundingClientRect();
    const timelineStart = generateTimelineDates[0];
    const timelineEnd = generateTimelineDates[generateTimelineDates.length - 1];
    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const totalWidth = rect.width - 256 - 96; // Subtract card name and duration column widths

    const deltaX = e.clientX - timelineDragStart.x;
    const deltaDays = (deltaX / totalWidth) * totalDays;

    const newStartDate = new Date(timelineDragStart.startDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
    const duration = (timelineDragStart.dueDate.getTime() - timelineDragStart.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const newDueDate = new Date(newStartDate.getTime() + duration * 24 * 60 * 60 * 1000);

    // Update card dates
    try {
      await kanbanService.updateCard(currentBoardId, draggingTimelineCard, {
        startDate: newStartDate.toISOString(),
        dueDate: newDueDate.toISOString(),
      });
      loadBoard();
      showToast({
        type: 'success',
        message: 'Card dates updated',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to update card dates:', error);
      showToast({
        type: 'error',
        message: 'Failed to update card dates',
        duration: 3000,
      });
    }

    setDraggingTimelineCard(null);
    setTimelineDragStart(null);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCard || !board) return;
    const card = cards.get(draggedCard);
    if (!card || card.columnId === columnId) {
      setDraggedCard(null);
      setDraggedOverColumn(null);
      return;
    }

    try {
      if (!currentBoardId) return;
      const columnCards = Array.from(cards.values()).filter((c) => c.columnId === columnId);
      const newOrder = columnCards.length;
      await kanbanService.moveCard(currentBoardId, draggedCard, columnId, newOrder);
      
      // Check if card moved to "Done" column and sync development workflow progress
      if (board) {
        const targetColumn = board.columns.find((c) => c.id === columnId);
        if (targetColumn && targetColumn.name.toLowerCase() === 'done') {
          const movedCard = cards.get(draggedCard);
          if (movedCard?.metadata?.developmentStepId && movedCard.metadata.developmentWorkflowId) {
            // Sync development workflow progress when card moves to Done
            developmentWorkflowService.syncStepFromItemUpdate('kanban', draggedCard);
          }
        }
      }
      
      loadBoard();
      showToast({
        type: 'success',
        message: 'Card moved successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to move card:', error);
      showToast({
        type: 'error',
        message: 'Failed to move card',
        duration: 3000,
      });
    } finally {
      setDraggedCard(null);
      setDraggedOverColumn(null);
    }
  };

  const handleCreateCard = async (columnId: string) => {
    // Open CardView in create mode
    setCardViewColumnId(columnId);
    setCardViewCardId(null);
    setCardViewCreateMode(true);
    setCardViewOpen(true);
  };

  const handleCreateCardFromEditor = async (cardData: Partial<BoardCard>) => {
    if (!cardData.columnId) {
      showToast({
        type: 'error',
        message: 'Column ID is required',
        duration: 3000,
      });
      return;
    }

    try {
      if (!currentBoardId) return;
      const createdCard = await kanbanService.createCard(currentBoardId, cardData);
      
      // Handle bidirectional linking if metadata exists
      if (cardData.metadata) {
        if (cardData.metadata.noteId) {
          // Link note to kanban card
          notesService.updateNote(cardData.metadata.noteId, { kanbanCardId: createdCard.id });
        }
        if (cardData.metadata.taskId) {
          // Link task to kanban card
          tasksService.updateTask(cardData.metadata.taskId, { kanbanCardId: createdCard.id });
        }
        if (cardData.metadata.calendarEventId) {
          // Link calendar event to kanban card
          calendarService.updateEvent(cardData.metadata.calendarEventId, { kanbanCardId: createdCard.id, boardId: currentBoardId });
        }
        
        // Handle bidirectional development workflow linking
        if (cardData.metadata?.developmentStepId && cardData.metadata?.developmentWorkflowId) {
          const workflow = developmentWorkflowService.getWorkflow(cardData.metadata.developmentWorkflowId);
          if (workflow) {
            const step = workflow.steps.find((s) => s.id === cardData.metadata?.developmentStepId);
            if (step && !step.kanbanCardIds?.includes(createdCard.id)) {
              // Add card ID to step's kanbanCardIds
              developmentWorkflowService.updateStep(
                workflow.id,
                step.id,
                { kanbanCardIds: [...(step.kanbanCardIds || []), createdCard.id] }
              );
            }
          }
        }
      }
      
      loadBoard();
      setCardViewOpen(false);
      showToast({
        type: 'success',
        message: 'Card created successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to create card:', error);
      showToast({
        type: 'error',
        message: 'Failed to create card',
        duration: 3000,
      });
    }
  };

  const handleOpenCardView = (cardId: string) => {
    setCardViewCardId(cardId);
    setCardViewColumnId(null);
    setCardViewCreateMode(false);
    setCardViewOpen(true);
  };

  const handleDuplicateCard = async (cardId: string) => {
    const card = cards.get(cardId);
    if (!card) return;

    try {
        if (!currentBoardId) return;
        await kanbanService.createCard(currentBoardId, {
        columnId: card.columnId,
        title: `${card.title} (Copy)`,
        description: card.description,
        priority: card.priority,
        dueDate: card.dueDate,
        tags: card.tags,
        assignees: card.assignees,
      });
      loadBoard();
      setCardMenuOpen(null);
      showToast({
        type: 'success',
        message: 'Card duplicated successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to duplicate card:', error);
      showToast({
        type: 'error',
        message: 'Failed to duplicate card',
        duration: 3000,
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    // Open confirmation modal instead of using confirm()
    setCardToDelete(cardId);
    setDeleteCardModalOpen(true);
    setCardMenuOpen(null);
  };

  const confirmDeleteBoard = async () => {
    if (!boardToDelete) return;

    try {
      await kanbanService.deleteBoard(boardToDelete.id);
      loadAllBoards();
      if (currentBoardId === boardToDelete.id) {
        setCurrentBoardId(null);
      }
      setDeleteBoardModalOpen(false);
      setBoardToDelete(null);
      showToast({
        type: 'success',
        message: 'Board deleted successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete board:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete board',
        duration: 3000,
      });
    }
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await kanbanService.deleteCard(cardToDelete);
      loadBoard();
      if (cardViewCardId === cardToDelete) {
        setCardViewOpen(false);
      }
      setDeleteCardModalOpen(false);
      setCardToDelete(null);
      showToast({
        type: 'success',
        message: 'Card deleted successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete card:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete card',
        duration: 3000,
      });
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      showToast({
        type: 'error',
        message: 'Column name is required',
        duration: 3000,
      });
      return;
    }

    try {
      if (!currentBoardId) return;
      await kanbanService.createColumn(currentBoardId, { name: newColumnName });
      loadBoard();
      setNewColumnName('');
      setShowCreateColumn(false);
      showToast({
        type: 'success',
        message: 'Column created successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to create column:', error);
      showToast({
        type: 'error',
        message: 'Failed to create column',
        duration: 3000,
      });
    }
  };

  const handleRenameColumn = async (columnId: string) => {
    if (!editingColumnName.trim() || !board) {
      showToast({
        type: 'error',
        message: 'Column name is required',
        duration: 3000,
      });
      return;
    }

    try {
      const column = board.columns.find((c) => c.id === columnId);
      if (!column) return;

      if (!currentBoardId) return;
      const updatedColumns = board.columns.map((c) =>
        c.id === columnId ? { ...c, name: editingColumnName.trim() } : c
      );
      await kanbanService.updateBoard(currentBoardId, { columns: updatedColumns });
      loadBoard();
      setEditingColumnId(null);
      setEditingColumnName('');
      setColumnMenuOpen(null);
      showToast({
        type: 'success',
        message: 'Column renamed successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to rename column:', error);
      showToast({
        type: 'error',
        message: 'Failed to rename column',
        duration: 3000,
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    // Open confirmation modal instead of using confirm()
    setColumnToDelete(columnId);
    setDeleteColumnModalOpen(true);
    setColumnMenuOpen(null);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete || !currentBoardId) return;

    try {
      await kanbanService.deleteColumn(currentBoardId, columnToDelete);
      loadBoard();
      setDeleteColumnModalOpen(false);
      setColumnToDelete(null);
      showToast({
        type: 'success',
        message: 'Column deleted successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete column:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete column',
        duration: 3000,
      });
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600/20 text-red-400';
      case 'high':
        return 'bg-orange-600/20 text-orange-400';
      case 'medium':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'low':
        return 'bg-green-600/20 text-green-400';
      default:
        return 'bg-[#444444]/20 text-[#858585]';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString();
  };

  const isOverdue = (dueDate?: Date | string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Filter cards with dates for Timeline view (must be at top level for hooks)
  const cardsWithDates = useMemo(() => {
    return Array.from(cards.values()).filter((card) => card.dueDate || card.startDate);
  }, [cards]);

  // Generate timeline dates helper
  // Helper function to get ISO week number
  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Helper function to get start of week (Monday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Helper function to get start of month
  const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const generateTimelineDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(timelineDate);
    
    if (timelineZoom === 'day') {
      // Show 30 days starting from the first day of the month
      start.setDate(1);
      for (let i = 0; i < 30; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    } else if (timelineZoom === 'week') {
      // Show 12 weeks starting from the first week of the month
      const monthStart = getMonthStart(start);
      const weekStart = getWeekStart(monthStart);
      
      for (let i = 0; i < 12; i++) {
        const weekDate = new Date(weekStart);
        weekDate.setDate(weekStart.getDate() + (i * 7));
        dates.push(weekDate);
      }
    } else if (timelineZoom === 'month') {
      // Show 12 months starting from the selected month
      const monthStart = getMonthStart(start);
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(monthStart);
        monthDate.setMonth(monthStart.getMonth() + i);
        dates.push(monthDate);
      }
    }

    return dates;
  }, [timelineDate, timelineZoom]);

  // Get card position helper for Timeline view
  const getCardPosition = useCallback((card: BoardCard, timelineDates: Date[]) => {
    const startDate = card.startDate ? new Date(card.startDate) : (card.dueDate ? new Date(new Date(card.dueDate).getTime() - 7 * 24 * 60 * 60 * 1000) : new Date());
    const endDate = card.dueDate ? new Date(card.dueDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const timelineStart = timelineDates[0];
    const timelineEnd = timelineDates[timelineDates.length - 1];

    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      left: `${Math.max(0, (startOffset / totalDays) * 100)}%`,
      width: `${Math.min(100, (duration / totalDays) * 100)}%`,
      duration: duration,
      durationText: duration === 1 ? '1 day' : `${duration} days`,
    };
  }, []);

  // Show board list view when no board is selected
  if (!currentBoardId || !board) {
    let filteredBoards = allBoards;

    // Apply filter
    if (boardListFilter === 'starred') {
      filteredBoards = filteredBoards.filter((b) => b.starred);
    } else if (boardListFilter === 'archived') {
      filteredBoards = filteredBoards.filter((b) => b.archived);
    } else {
      filteredBoards = filteredBoards.filter((b) => !b.archived);
    }

    // Apply search
    if (boardListSearchQuery) {
      filteredBoards = filteredBoards.filter(
        (b) =>
          b.name.toLowerCase().includes(boardListSearchQuery.toLowerCase()) ||
          b.description?.toLowerCase().includes(boardListSearchQuery.toLowerCase())
      );
    }

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
        {/* Header */}
        <div className="bg-[#252526] border-b border-[#333333] pl-4 pr-2 lg:pl-6 py-4 flex-shrink-0 glass-enhanced">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 gradient-text">
                <LayoutGrid className="w-8 h-8 text-orange-600" />
                Boards
              </h1>
              <p className="text-sm text-[#858585] mt-1">
                {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
                <input
                  type="text"
                  placeholder="Q Search boards..."
                  value={boardListSearchQuery}
                  onChange={(e) => setBoardListSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-48 bg-[#1e1e1e] border border-[#333333] rounded-lg text-white placeholder-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-lg p-1 border border-[#333333]">
                <button
                  onClick={() => setBoardListViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    boardListViewMode === 'grid'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-[#858585] hover:text-white'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBoardListViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    boardListViewMode === 'list'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-[#858585] hover:text-white'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Create Board Button */}
              <button
                onClick={() => setShowBoardSelector(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Board</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            {(['all', 'starred', 'archived'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setBoardListFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  boardListFilter === filter
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-md shadow-orange-500/20'
                    : 'text-[#858585] hover:text-white hover:bg-[#333333]'
                }`}
              >
                {filter === 'all' && 'All Boards'}
                {filter === 'starred' && '⭐ Starred'}
                {filter === 'archived' && '📦 Archived'}
              </button>
            ))}
          </div>
        </div>

        {/* Board Grid/List */}
        <div className="flex-1 overflow-y-auto pl-4 pr-2 lg:pl-6 py-6 scrollbar-thin">
          {filteredBoards.length === 0 && !boardListSearchQuery ? (
            <div className="text-center py-12 text-[#6e6e6e]">
              <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2 text-white">No boards yet</h3>
              <p className="mb-4 text-[#858585]">
                Create your first Kanban board to get started
              </p>
              <button
                onClick={() => setShowBoardSelector(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Board
              </button>
            </div>
          ) : filteredBoards.length === 0 && boardListSearchQuery ? (
            <div className="text-center py-12 text-[#6e6e6e]">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2 text-white">No boards found</h3>
              <p className="text-[#858585]">Try adjusting your search</p>
            </div>
          ) : boardListViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Use Template Card */}
              <button
                onClick={() => setShowTemplates(true)}
                className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer group hover:scale-[1.02] glass-card"
              >
                <Sparkles className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2">Use Template</h3>
                <p className="text-sm opacity-90">Start with a pre-built board template</p>
              </button>

              {/* Board Cards */}
              {filteredBoards.map((b) => {
                const totalCards = b.stats?.totalCards || 0;
                const completedCards = b.stats?.completedCards || 0;
                const totalMembers = b.stats?.totalMembers || 0;
                const lastUpdated = b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : 'Never';

                return (
                  <div
                    key={b.id}
                    onClick={() => setCurrentBoardId(b.id)}
                    className="group relative p-6 bg-[#252526] border border-[#333333] rounded-lg hover:border-orange-600/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer glass-card hover-lift"
                    style={{ borderTopColor: b.color || '#8B5CF6', borderTopWidth: '4px' }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {b.icon && <span className="text-3xl flex-shrink-0">{b.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{b.name}</h3>
                          {b.description && (
                            <p className="text-sm text-[#858585] mt-1 line-clamp-2">{b.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions - Show on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await kanbanService.updateBoard(b.id, { starred: !b.starred });
                              // Reload boards list
                              const updatedBoards = await kanbanService.getAllBoards();
                              setAllBoards(updatedBoards);
                              showToast({
                                type: 'success',
                                message: b.starred ? 'Board unstarred' : 'Board starred',
                                duration: 2000,
                              });
                            } catch (error) {
                              console.error('Failed to toggle star:', error);
                              showToast({
                                type: 'error',
                                message: 'Failed to toggle star',
                                duration: 3000,
                              });
                            }
                          }}
                          className="p-1 hover:bg-[#333333] rounded transition-colors"
                          title={b.starred ? 'Unstar board' : 'Star board'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              b.starred ? 'fill-yellow-400 text-yellow-400' : 'text-[#858585]'
                            }`}
                          />
                        </button>
                        <div className="relative" ref={(el) => { if (el) boardListMenuRefs.current.set(b.id, el); }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBoardListMenuOpen(boardListMenuOpen === b.id ? null : b.id);
                            }}
                            className="p-1 hover:bg-[#333333] rounded transition-colors"
                            title="Board menu"
                          >
                            <MoreHorizontal className="w-4 h-4 text-[#858585]" />
                          </button>
                          {boardListMenuOpen === b.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#252526] rounded-lg shadow-lg border border-[#333333] z-50">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentBoardId(b.id);
                                  setShowBoardSettings(true);
                                  setBoardListMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] flex items-center gap-2 text-[#a0a0a0]"
                              >
                                <Settings className="w-4 h-4" />
                                Board Settings
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentBoardId(b.id);
                                  setShowBoardMembers(true);
                                  setBoardListMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] flex items-center gap-2 text-[#a0a0a0]"
                              >
                                <Users className="w-4 h-4" />
                                Members
                              </button>
                              <div className="border-t border-[#333333] my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showToast({ type: 'info', message: 'Duplicate board coming soon' });
                                  setBoardListMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] flex items-center gap-2 text-[#a0a0a0]"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate Board
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showToast({ type: 'info', message: 'Archive board coming soon' });
                                  setBoardListMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] flex items-center gap-2 text-[#a0a0a0]"
                              >
                                <Folder className="w-4 h-4" />
                                Archive Board
                              </button>
                              <div className="border-t border-[#333333] my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBoardToDelete(b);
                                  setDeleteBoardModalOpen(true);
                                  setBoardListMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/20 text-red-400 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Board
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-[#858585]">
                      <span>📋 {totalCards} cards</span>
                      <span>✓ {completedCards} done</span>
                      <span>👥 {totalMembers}</span>
                    </div>

                    {/* Last Activity */}
                    <div className="mt-3 text-xs text-[#6e6e6e]">
                      Updated {lastUpdated}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredBoards.map((b) => {
                const totalCards = b.stats?.totalCards || 0;
                const completedCards = b.stats?.completedCards || 0;
                const totalMembers = b.stats?.totalMembers || 0;

                return (
                  <div
                    key={b.id}
                    onClick={() => setCurrentBoardId(b.id)}
                    className="group flex items-center justify-between p-4 bg-[#252526] border border-[#333333] rounded-lg hover:border-orange-600/50 hover:shadow-md transition-all cursor-pointer glass-card"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {b.icon && <span className="text-2xl flex-shrink-0">{b.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{b.name}</h3>
                        {b.description && (
                          <p className="text-sm text-[#858585] mt-1 truncate">{b.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-[#858585]">
                        <span>📋 {totalCards}</span>
                        <span>✓ {completedCards}</span>
                        <span>👥 {totalMembers}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await kanbanService.updateBoard(b.id, { starred: !b.starred });
                            // Reload boards list
                            const updatedBoards = await kanbanService.getAllBoards();
                            setAllBoards(updatedBoards);
                            showToast({
                              type: 'success',
                              message: b.starred ? 'Board unstarred' : 'Board starred',
                              duration: 2000,
                            });
                          } catch (error) {
                            console.error('Failed to toggle star:', error);
                            showToast({
                              type: 'error',
                              message: 'Failed to toggle star',
                              duration: 3000,
                            });
                          }
                        }}
                        className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
                        title={b.starred ? 'Unstar board' : 'Star board'}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            b.starred ? 'fill-yellow-400 text-yellow-400' : 'text-[#858585]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Board Selector Modal */}
        <BoardSelector
          isOpen={showBoardSelector}
          onClose={() => setShowBoardSelector(false)}
          onSelectBoard={(boardId) => {
            setCurrentBoardId(boardId);
            setShowBoardSelector(false);
          }}
          selectedBoardId={currentBoardId}
          onCreateBoard={(newBoard) => {
            setCurrentBoardId(newBoard.id);
            loadAllBoards();
          }}
        />

        {/* Templates Modal */}
        {showTemplates && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTemplates(false);
              }
            }}
          >
            <div
              className="glass-card rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-orange-500/30 animate-scale-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-orange-500/20 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold gradient-text">Board Templates</h2>
                  <p className="text-sm text-orange-300/70 mt-1">Choose a template to create a new board</p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-2 rounded-lg text-[#858585] hover:text-white transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-600/20 hover:to-orange-600/20 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search and Filters */}
              <div className="p-6 border-b border-orange-500/20 flex-shrink-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#858585]" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templatesSearchQuery}
                      onChange={(e) => setTemplatesSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#252526]/60 backdrop-blur-sm border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500/50 text-white transition-all"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedTemplateCategory(null)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      selectedTemplateCategory === null
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-[#252526]/60 text-[#a0a0a0] hover:bg-[#333333]/80 border border-[#333333]/50'
                    }`}
                  >
                    All
                  </button>
                  {[
                    { value: 'software_development', label: 'Software Development' },
                    { value: 'sales', label: 'Sales' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'project_management', label: 'Project Management' },
                    { value: 'personal', label: 'Personal' },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedTemplateCategory(cat.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                        selectedTemplateCategory === cat.value
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20'
                          : 'bg-[#252526]/60 text-[#a0a0a0] hover:bg-[#333333]/80 border border-[#333333]/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  let filteredTemplates = selectedTemplateCategory
                    ? getTemplatesByCategory(selectedTemplateCategory as TemplateCategory)
                    : BOARD_TEMPLATES;

                  if (templatesSearchQuery) {
                    const query = templatesSearchQuery.toLowerCase();
                    filteredTemplates = filteredTemplates.filter(
                      (t) =>
                        t.name.toLowerCase().includes(query) ||
                        t.description.toLowerCase().includes(query) ||
                        t.tags?.some((tag) => tag.toLowerCase().includes(query))
                    );
                  }

                  if (filteredTemplates.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-[#858585]">
                        <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg mb-2">No templates found</p>
                        <p className="text-sm">Try adjusting your search or filter</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={async () => {
                            try {
                              const board = await kanbanService.createBoardFromTemplate(
                                template.id,
                                template.name
                              );
                              loadAllBoards();
                              setCurrentBoardId(board.id);
                              loadBoard();
                              setShowTemplates(false);
                              showToast({
                                type: 'success',
                                message: 'Board created from template',
                                description: `"${template.name}" board has been created`,
                                duration: 3000,
                              });
                            } catch (error) {
                              console.error('Failed to create board from template:', error);
                              showToast({
                                type: 'error',
                                message: 'Failed to create board',
                                description: error instanceof Error ? error.message : 'An error occurred',
                                duration: 3000,
                              });
                            }
                          }}
                          className="p-4 rounded-lg border-2 border-[#333333]/50 bg-[#252526]/60 backdrop-blur-sm hover:border-orange-500/50 hover:bg-[#333333]/60 transition-all text-left hover:scale-[1.02] group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{template.icon}</span>
                              <h3 className="font-semibold text-white">{template.name}</h3>
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
                                className="px-2 py-0.5 text-xs bg-orange-600/20 text-orange-300 rounded border border-orange-500/30"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#6e6e6e]">
                            <span>{template.columns.length} columns</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredColumns = board.columns.filter((col) => {
    if (!searchQuery) return true;
    const columnCards = Array.from(cards.values()).filter((c) => c.columnId === col.id);
    return columnCards.some((card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#252526] border-b border-[#333333] pl-3 pr-2 sm:pl-4 lg:pl-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 truncate">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 rounded flex items-center justify-center flex-shrink-0">
                <GripVertical className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
              <span className="truncate">{board.name}</span>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
              <p className="text-xs sm:text-sm text-[#858585]">Manage tasks with Kanban board</p>
              {board.projectIds && board.projectIds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#6e6e6e] hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FolderKanban className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 flex-shrink-0" />
                    <span className="text-xs text-[#858585]">Linked to:</span>
                    {board.projectIds.slice(0, 2).map((projectId) => {
                      const project = projectsService.getProject(projectId);
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
                            <span className="text-[#6e6e6e]">+{board.projectIds.length - 2}</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Header Controls - 2 Rows for Better Mobile Experience */}
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Row 1: Navigation and View Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Board Selector Button - Navigate to board overview */}
              <button
                onClick={() => {
                  // Navigate to board overview (deselect current board to show list)
                  setCurrentBoardId(null);
                }}
                className="px-2 sm:px-4 py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors flex items-center gap-2 flex-shrink-0"
                title="Go to Boards Overview"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Boards</span>
              </button>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-[#333333] rounded-lg p-1 border border-[#444444] overflow-x-auto flex-1 min-w-0">
                <button
                  onClick={() => setViewType('kanban')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'kanban'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="Kanban View"
                >
                  <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'list'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="List View"
                >
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewType('calendar')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'calendar'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="Calendar View"
                >
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setViewType('timeline')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'timeline'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="Timeline View"
                >
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </button>
                <button
                  onClick={() => setViewType('docs')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'docs'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="Docs View"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Docs</span>
                </button>
                <button
                  onClick={() => setViewType('drive')}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                    viewType === 'drive'
                      ? 'bg-orange-600 text-white'
                      : 'text-[#858585] hover:text-white hover:bg-[#444444]'
                  }`}
                  title="Drive View"
                >
                  <Folder className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Drive</span>
                </button>
                {/* Add Column Button - Only show in Kanban view, positioned after Drive */}
                {viewType === 'kanban' && (
                  <button
                    onClick={() => setShowCreateColumn(true)}
                    className="px-2 sm:px-3 py-1.5 bg-orange-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
                    title="Add Column"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Add Column</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Search, Filters, and Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#858585]" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#333333] border border-[#444444] rounded-lg pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-white placeholder-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              {/* Development Workflow Filters */}
              {availableWorkflows.length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <select
                    value={selectedDevelopmentWorkflowId}
                    onChange={(e) => setSelectedDevelopmentWorkflowId(e.target.value)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[120px] sm:min-w-0"
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
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[100px] sm:min-w-0"
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
                  {(selectedDevelopmentWorkflowId || selectedDevelopmentPhase) && (
                    <button
                      onClick={() => {
                        setSelectedDevelopmentWorkflowId('');
                        setSelectedDevelopmentPhase('');
                      }}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#858585] hover:text-white transition-colors whitespace-nowrap"
                      title="Clear Development Workflow Filters"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* NSR Folder Filter (for NSR-compliant workflows) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <select
                  value={selectedNSRFolder}
                  onChange={(e) => setSelectedNSRFolder(e.target.value as NSRFolder | '')}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[120px] sm:min-w-0"
                >
                  <option value="">All NSR Folders</option>
                  {NSR_MANDATORY_FOLDERS.map((folder) => (
                    <option key={folder} value={folder}>
                      {NSR_FOLDER_DISPLAY_NAMES[folder]}
                    </option>
                  ))}
                </select>
                {selectedNSRFolder && (
                  <button
                    onClick={() => setSelectedNSRFolder('')}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#858585] hover:text-white transition-colors whitespace-nowrap"
                    title="Clear NSR Folder Filter"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Workflow Track Filters (Quick Flow, Project Management, Enterprise Method) */}
              {availableWorkflowTracks.length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <select
                    value={selectedWorkflowTrack}
                    onChange={(e) => {
                      const track = e.target.value as WorkflowTrack | '';
                      setSelectedWorkflowTrack(track);
                      setSelectedWorkflowId('');
                      setSelectedEnterprisePhase('');
                    }}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[120px] sm:min-w-0"
                  >
                    <option value="">All Tracks</option>
                    <option value="quick-flow">Quick Flow</option>
                    <option value="project-management">Project Management</option>
                    <option value="enterprise-method">Enterprise Method</option>
                  </select>
                  
                  {selectedWorkflowTrack && (
                    <select
                      value={selectedWorkflowId}
                      onChange={(e) => setSelectedWorkflowId(e.target.value)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[120px] sm:min-w-0"
                    >
                      <option value="">All Workflows</option>
                      {availableWorkflowTracks
                        .filter((w) => w.track === selectedWorkflowTrack)
                        .map((workflow) => (
                          <option key={workflow.id} value={workflow.id}>
                            {workflow.name.length > 20 ? `${workflow.name.substring(0, 20)}...` : workflow.name}
                          </option>
                        ))}
                    </select>
                  )}

                  {/* Enterprise Method Phase Filter */}
                  {selectedWorkflowTrack === 'enterprise-method' && selectedWorkflowId && (
                    <select
                      value={selectedEnterprisePhase}
                      onChange={(e) => setSelectedEnterprisePhase(e.target.value)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#333333] border border-[#444444] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[100px] sm:min-w-0"
                    >
                      <option value="">All Phases</option>
                      {(() => {
                        const workflow = availableWorkflowTracks.find((w) => w.id === selectedWorkflowId);
                        if (workflow) {
                          // Extract unique phases from workflow steps or use default phases
                          const phases = ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4'];
                          return phases.map((phase) => (
                            <option key={phase} value={phase}>
                              {phase}
                            </option>
                          ));
                        }
                        return null;
                      })()}
                    </select>
                  )}

                  {(selectedWorkflowTrack || selectedWorkflowId || selectedEnterprisePhase) && (
                    <button
                      onClick={() => {
                        setSelectedWorkflowTrack('');
                        setSelectedWorkflowId('');
                        setSelectedEnterprisePhase('');
                      }}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#858585] hover:text-white transition-colors whitespace-nowrap"
                      title="Clear Workflow Track Filters"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => {}}
                  className="p-2 sm:px-4 sm:py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors flex items-center justify-center gap-2"
                  title="Filter"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button
                  onClick={() => setShowBoardMembers(true)}
                  className="p-2 sm:px-4 sm:py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors flex items-center justify-center gap-2"
                  title="Members"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Members</span>
                </button>
                <button
                  onClick={() => setShowBoardSettings(true)}
                  className="p-2 sm:px-4 sm:py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors flex items-center justify-center gap-2"
                  title="Board Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm border-t border-[#333333] pt-3 sm:pt-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium">{stats.total}</span>
            <span className="text-[#858585] hidden sm:inline">Total</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
            <span className="font-medium">{stats.completed}</span>
            <span className="text-[#858585] hidden sm:inline">Completed</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
            <span className="font-medium">{stats.inProgress}</span>
            <span className="text-[#858585] hidden sm:inline">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
            <span className="font-medium">{stats.overdue}</span>
            <span className="text-[#858585] hidden sm:inline">Overdue</span>
          </div>
        </div>

        {showCreateColumn && (
          <div className="mt-4 p-4 bg-[#333333] rounded-lg flex items-center gap-2">
            <input
              type="text"
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateColumn();
                }
              }}
              className="flex-1 bg-[#252526] border border-[#444444] rounded px-3 py-2 text-white placeholder-[#858585] focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            <button
              onClick={handleCreateColumn}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateColumn(false);
                setNewColumnName('');
              }}
              className="px-4 py-2 bg-[#444444] text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {viewType === 'kanban' && (
        <div className="flex-1 overflow-hidden pl-2 pr-2 sm:pl-4 lg:pl-6">
        <div className="flex gap-3 sm:gap-4 h-full w-full overflow-x-auto overflow-y-hidden">
          {filteredColumns.map((column) => {
            const columnCards = Array.from(cards.values())
              .filter((c) => c.columnId === column.id)
              .sort((a, b) => a.order - b.order)
              .filter((card) => {
                // Search filter
                if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                // Development workflow filter
                if (selectedDevelopmentWorkflowId && card.metadata?.developmentWorkflowId !== selectedDevelopmentWorkflowId) {
                  return false;
                }
                // Development phase filter
                if (selectedDevelopmentPhase && card.metadata?.developmentPhase !== selectedDevelopmentPhase) {
                  return false;
                }
                // NSR folder filter
                if (selectedNSRFolder && card.metadata?.nsrFolder !== selectedNSRFolder) {
                  return false;
                }
                // Workflow track filter
                if (selectedWorkflowTrack && card.metadata?.workflowTrack !== selectedWorkflowTrack) {
                  return false;
                }
                // Workflow ID filter
                if (selectedWorkflowId && card.metadata?.workflowId !== selectedWorkflowId) {
                  return false;
                }
                // Note: BMAD sprint week filter removed - BMAD is only for development workflows, not regular workflows
                // Enterprise Method phase filter
                if (selectedEnterprisePhase && card.metadata?.enterprisePhase !== selectedEnterprisePhase) {
                  return false;
                }
                return true;
              });

            return (
              <div
                key={column.id}
                className={`flex-shrink-0 sm:w-auto sm:flex-1 sm:min-w-0 flex flex-col h-full transition-all ${
                  draggedOverColumn === column.id ? 'ring-2 ring-orange-500 bg-orange-500/5' : ''
                } ${draggedColumn === column.id ? 'opacity-50 grayscale' : ''}`}
                style={{ width: board?.columnWidth ? `${board.columnWidth}px` : '190px' }}
                draggable={!draggedCard}
                onDragStart={(e) => handleColumnDragStart(e, column.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => {
                  if (draggedColumn) {
                    handleColumnDrop(e, column.id);
                  } else {
                    handleDrop(e, column.id);
                  }
                }}
              >
                {/* Column Header */}
                <div className="bg-[#252526] rounded-t-lg p-3 border-b border-[#333333] cursor-move">
                  {editingColumnId === column.id ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameColumn(column.id);
                          } else if (e.key === 'Escape') {
                            setEditingColumnId(null);
                            setEditingColumnName('');
                          }
                        }}
                        className="flex-1 min-w-0 bg-[#333333] border border-orange-500 rounded px-2 py-1 text-white text-sm font-semibold focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameColumn(column.id)}
                        className="flex-shrink-0 p-1 text-green-400 hover:text-green-300"
                        title="Save"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingColumnId(null);
                          setEditingColumnName('');
                        }}
                        className="flex-shrink-0 p-1 text-red-400 hover:text-red-300"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className="font-semibold text-white cursor-pointer hover:text-orange-400 transition-colors"
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditingColumnName(column.name);
                            }}
                          >
                            {column.name} {columnCards.length}
                          </h3>
                        </div>
                        {column.wip !== undefined && column.wip > 0 && (
                          <div className="text-xs text-[#858585]">
                            WIP Limit: {columnCards.length}/{column.wip}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative" ref={(el) => { if (el) columnMenuRefs.current.set(column.id, el); }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id);
                            }}
                            className="p-1 text-[#858585] hover:text-white transition-colors"
                            title="Column menu"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {columnMenuOpen === column.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-[#252526] rounded-lg shadow-lg border border-[#333333] z-20">
                              <button
                                onClick={() => {
                                  setEditingColumnId(column.id);
                                  setEditingColumnName(column.name);
                                  setColumnMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] flex items-center gap-2"
                              >
                                <Edit className="w-3 h-3" />
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteColumn(column.id)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/20 text-red-400 flex items-center gap-2"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex-1 bg-[#252526]/50 rounded-b-lg p-2 sm:p-3 space-y-2 overflow-y-auto min-h-0">

                  {columnCards.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenCardView(card.id)}
                      className={`group relative bg-[#333333] rounded-lg overflow-hidden cursor-move hover:bg-[#444444] transition-colors border border-[#444444] ${
                        draggedCard === card.id ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Card Cover Image */}
                      {card.cover && (
                        <div
                          className="w-full h-24 flex-shrink-0"
                          style={{
                            ...(card.cover.type === 'color' && {
                              backgroundColor: card.cover.value,
                            }),
                            ...(card.cover.type === 'gradient' && {
                              background: card.cover.value,
                            }),
                            ...(card.cover.type === 'image' && {
                              backgroundImage: `url(${card.cover.value})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }),
                            ...(card.cover.type === 'emoji' && {
                              backgroundColor: 'transparent',
                            }),
                          }}
                        >
                          {card.cover.type === 'emoji' && (
                            <div className="flex items-center justify-center h-full text-3xl">
                              {card.cover.value}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-2 sm:p-3">
                        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base text-white font-medium mb-1 break-words line-clamp-2">{card.title}</h4>
                            {card.description && (
                              <p className="text-xs text-[#858585] line-clamp-2">{card.description}</p>
                            )}
                          </div>
                        </div>

                      {/* Card Metadata */}
                      <div className="flex flex-col gap-2 mt-2">
                        {card.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded w-fit ${getPriorityColor(card.priority)}`}>
                            {card.priority}
                          </span>
                        )}

                        {card.dueDate && (
                          <div
                            className={`flex items-center gap-1 text-xs ${
                              isOverdue(card.dueDate) ? 'text-red-400' : 'text-[#858585]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(card.dueDate)}</span>
                            {isOverdue(card.dueDate) && (
                              <span className="ml-1 px-1.5 py-0.5 bg-red-600/20 rounded text-xs">Overdue</span>
                            )}
                          </div>
                        )}

                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {card.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  tag === 'From Note' || tag === 'From Task'
                                    ? tag === 'From Note'
                                      ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50'
                                      : 'bg-green-600/30 text-green-300 border border-green-500/50'
                                    : 'bg-[#444444] text-[#a0a0a0]'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {card.tags.length > 3 && (
                              <span className="text-xs px-2 py-0.5 bg-[#444444] text-[#a0a0a0] rounded">
                                +{card.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Workflow Links */}
                        {(card.metadata?.workflowId || card.metadata?.developmentWorkflowId) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* Regular Workflow Link (Quick Flow, Enterprise Method, etc.) */}
                            {card.metadata?.workflowId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/workflows/${card.metadata!.workflowId}`);
                                }}
                                className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-600/20 text-orange-300 border border-orange-500/30 rounded hover:bg-orange-600/30 transition-colors"
                                title={`View workflow${card.metadata.workflowTrack ? ` (${card.metadata.workflowTrack})` : ''}`}
                              >
                                <FolderKanban className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  {card.metadata.workflowTrack === 'quick-flow' ? 'QF' : card.metadata.workflowTrack === 'enterprise-method' ? 'EM' : 'WF'}
                                </span>
                              </button>
                            )}
                            {/* Development Workflow Link */}
                            {card.metadata?.developmentWorkflowId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/development-workflows/${card.metadata!.developmentWorkflowId}`);
                                }}
                                className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-600/20 text-orange-300 border border-orange-500/30 rounded hover:bg-orange-600/30 transition-colors"
                                title="View development workflow"
                              >
                                <GitBranch className="w-3 h-3" />
                                <span className="hidden sm:inline">Dev WF</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* NSR Compliance Indicators */}
                        {(card.metadata?.nsrFolder || card.tags?.some(tag => tag.includes('nsr-compliant'))) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {card.metadata?.nsrFolder && (
                              <NSRFolderBadge
                                folder={card.metadata.nsrFolder}
                                size="sm"
                                onClick={() => {
                                  setSelectedNSRFolder(card.metadata!.nsrFolder!);
                                }}
                              />
                            )}
                            {card.tags?.some(tag => tag.includes('nsr-compliant')) && (
                              <NSRComplianceBadge compliant={true} size="sm" />
                            )}
                          </div>
                        )}

                        {/* Development Workflow Indicator */}
                        {card.metadata?.developmentWorkflowId && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/app/development-workflows/${card.metadata?.developmentWorkflowId}`);
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-600/20 text-orange-300 rounded border border-orange-500/30 hover:bg-orange-600/30 hover:border-orange-500/50 transition-colors cursor-pointer"
                              title="View development workflow"
                            >
                              <GitBranch className="w-3 h-3" />
                              <span className="hidden sm:inline">
                                {availableWorkflows.find((w) => w.id === card.metadata?.developmentWorkflowId)?.name || 'Workflow'}
                              </span>
                              <span className="sm:hidden">WF</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                            {card.metadata.developmentPhase && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded border ${
                                  card.metadata.developmentPhase === 'analysis'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : card.metadata.developmentPhase === 'planning'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'solutioning'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'developing'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'implementation'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                }`}
                                title={`Development Phase: ${card.metadata.developmentPhase}`}
                              >
                                {card.metadata.developmentPhase === 'analysis' ? 'Analysis' :
                                 card.metadata.developmentPhase === 'planning' ? 'Planning' :
                                 card.metadata.developmentPhase === 'solutioning' ? 'Solutioning' :
                                 card.metadata.developmentPhase === 'developing' ? 'Developing' :
                                 card.metadata.developmentPhase === 'implementation' ? 'Implementation' :
                                 'Deploying'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Linked Source Indicator (Note/Task/Calendar) */}
                        {card.metadata && (card.metadata.noteId || card.metadata.taskId || card.metadata.calendarEventId) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {card.metadata.noteId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/app/notes');
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-600/20 text-orange-300 rounded border border-orange-500/30 hover:bg-orange-600/30 hover:border-orange-500/50 transition-colors cursor-pointer"
                                title="View linked note"
                              >
                                <FileText className="w-3 h-3" />
                                <span className="hidden sm:inline">Note</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {card.metadata.taskId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/app/tasks');
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-600/20 text-green-300 rounded border border-green-500/30 hover:bg-green-600/30 hover:border-green-500/50 transition-colors cursor-pointer"
                                title="View linked task"
                              >
                                <CheckSquare className="w-3 h-3" />
                                <span className="hidden sm:inline">Task</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {card.metadata.calendarEventId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/app/calendar');
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                                title="View linked calendar event"
                              >
                                <Calendar className="w-3 h-3" />
                                <span className="hidden sm:inline">Event</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {card.completed && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </div>
                        )}

                        {/* Attachment Count */}
                        {card.attachments && card.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-[#858585] mt-2">
                            <FileText className="w-3 h-3" />
                            <span>{card.attachments.length} attachment{card.attachments.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Card Menu - Hidden */}
                      <div
                        className="hidden"
                        ref={(el) => { if (el) cardMenuRefs.current.set(card.id, el); }}
                      >
                        {false && (
                          <div className="absolute right-0 top-full mt-1 w-48 glass-card rounded-lg shadow-2xl border border-orange-500/20 z-20 overflow-hidden">
                            <div className="p-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCardView(card.id);
                                  setCardMenuOpen(null);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm text-[#a0a0a0] hover:bg-gradient-to-r hover:from-orange-600/20 hover:to-orange-600/20 hover:text-white rounded-lg transition-all flex items-center gap-2 group"
                              >
                                <Edit className="w-4 h-4 text-[#858585] group-hover:text-orange-400 transition-colors" />
                                Edit Card
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateCard(card.id);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm text-[#a0a0a0] hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-orange-600/20 hover:text-white rounded-lg transition-all flex items-center gap-2 group"
                              >
                                <Copy className="w-4 h-4 text-[#858585] group-hover:text-blue-400 transition-colors" />
                                Duplicate
                              </button>
                              <div className="border-t border-[#333333]/50 my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-gradient-to-r hover:from-red-600/20 hover:to-orange-600/20 hover:text-red-300 rounded-lg transition-all flex items-center gap-2 group"
                              >
                                <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnCards.length === 0 && (
                    <div className="text-center text-[#6e6e6e] text-sm py-8">
                      Drop cards here or click + to add
                    </div>
                  )}
                </div>

                {/* Add Card Button - At Bottom */}
                <button
                  onClick={() => handleCreateCard(column.id)}
                  className="mt-2 p-3 bg-[#333333]/50 hover:bg-[#333333] rounded-b-lg text-sm font-medium text-[#858585] hover:text-white flex items-center justify-center gap-2 transition-colors border-t border-[#333333]"
                >
                  <Plus className="w-4 h-4" />
                  Add Card
                </button>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {viewType === 'list' && (
        <div className="flex-1 overflow-y-auto pl-4 pr-2 lg:pl-6 py-4">
          <div className="bg-[#252526] rounded-lg border border-[#333333] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-[#252526] border-b border-[#333333] font-semibold text-sm text-[#a0a0a0] sticky top-0 z-10">
              <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-[#444444] bg-[#333333] text-orange-600 focus:ring-orange-500"
                          onChange={() => {
                            // TODO: Select all cards
                          }}
                        />
              </div>
              <div className="col-span-1">Cover</div>
              <div className="col-span-2">Task</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-2">Assigned</div>
              <div className="col-span-1">Due Date</div>
              <div className="col-span-1">Progress</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-700">
              {Array.from(cards.values())
                .filter((card) => {
                  // Search filter
                  if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return false;
                  }
                  // Development workflow filter
                  if (selectedDevelopmentWorkflowId && card.metadata?.developmentWorkflowId !== selectedDevelopmentWorkflowId) {
                    return false;
                  }
                  // Development phase filter
                  if (selectedDevelopmentPhase && card.metadata?.developmentPhase !== selectedDevelopmentPhase) {
                    return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  // Sort by column order, then by card order
                  const colA = board.columns.find((c) => c.id === a.columnId);
                  const colB = board.columns.find((c) => c.id === b.columnId);
                  if (colA && colB) {
                    if (colA.order !== colB.order) {
                      return colA.order - colB.order;
                    }
                  }
                  return a.order - b.order;
                })
                .map((card) => {
                  const column = board.columns.find((c) => c.id === card.columnId);
                  const checklistProgress = card.checklists?.length
                    ? card.checklists.reduce(
                        (acc, checklist) =>
                          acc + checklist.items.filter((item) => item.completed).length / checklist.items.length,
                        0
                      ) / card.checklists.length
                    : 0;

                  return (
                    <div
                      key={card.id}
                      className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-750 transition-colors cursor-pointer"
                      onClick={() => handleOpenCardView(card.id)}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={card.completed || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            // TODO: Toggle completion
                          }}
                          className="w-4 h-4 rounded border-[#444444] bg-[#333333] text-orange-600 focus:ring-orange-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Cover Image */}
                      <div className="col-span-1 flex items-center">
                        {card.cover ? (
                          <div
                            className="w-12 h-12 rounded flex-shrink-0 overflow-hidden"
                            style={{
                              ...(card.cover.type === 'color' && {
                                backgroundColor: card.cover.value,
                              }),
                              ...(card.cover.type === 'gradient' && {
                                background: card.cover.value,
                              }),
                              ...(card.cover.type === 'image' && {
                                backgroundImage: `url(${card.cover.value})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }),
                              ...(card.cover.type === 'emoji' && {
                                backgroundColor: 'transparent',
                              }),
                            }}
                          >
                            {card.cover.type === 'emoji' && (
                              <div className="flex items-center justify-center h-full text-xl">
                                {card.cover.value}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded flex-shrink-0 bg-[#333333] flex items-center justify-center">
                            <span className="text-[#6e6e6e] text-xs">No cover</span>
                          </div>
                        )}
                      </div>

                      {/* Task Title */}
                      <div className="col-span-2 flex items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-white truncate ${card.completed ? 'line-through text-[#6e6e6e]' : ''}`}>
                              {card.title || 'Untitled'}
                            </span>
                            {/* Development Workflow Indicator */}
                            {card.metadata?.developmentWorkflowId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/development-workflows/${card.metadata?.developmentWorkflowId}`);
                                }}
                                className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-600/20 text-orange-300 rounded border border-orange-500/30 hover:bg-orange-600/30 transition-colors"
                                title="View development workflow"
                              >
                                <GitBranch className="w-3 h-3" />
                                <span className="hidden sm:inline">WF</span>
                              </button>
                            )}
                            {card.metadata?.developmentPhase && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded border ${
                                  card.metadata.developmentPhase === 'analysis'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : card.metadata.developmentPhase === 'planning'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'solutioning'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'developing'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : card.metadata.developmentPhase === 'implementation'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                }`}
                              >
                                {card.metadata.developmentPhase === 'analysis' ? 'A' :
                                 card.metadata.developmentPhase === 'planning' ? 'P' :
                                 card.metadata.developmentPhase === 'solutioning' ? 'S' :
                                 card.metadata.developmentPhase === 'developing' ? 'D' :
                                 card.metadata.developmentPhase === 'implementation' ? 'I' :
                                 'Deploy'}
                              </span>
                            )}
                          </div>
                          {card.description && (
                            <p className="text-xs text-[#858585] truncate mt-1">{card.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Status (Column) */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-[#a0a0a0]">{column?.name || 'Unknown'}</span>
                      </div>

                      {/* Priority */}
                      <div className="col-span-1 flex items-center">
                        {card.priority && (
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(card.priority)}`}>
                            {card.priority}
                          </span>
                        )}
                      </div>

                      {/* Assigned */}
                      <div className="col-span-2 flex items-center">
                        {card.assignees && card.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {card.assignees.slice(0, 3).map((assignee, idx) => (
                              <div
                                key={idx}
                                className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-medium"
                                title={assignee.displayName || assignee.email}
                              >
                                {assignee.avatar ? (
                                  <img src={assignee.avatar} alt={assignee.displayName} className="w-full h-full rounded-full" />
                                ) : (
                                  (assignee.displayName || '?').charAt(0).toUpperCase()
                                )}
                              </div>
                            ))}
                            {card.assignees.length > 3 && (
                              <span className="text-xs text-[#858585]">+{card.assignees.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6e6e6e]">Unassigned</span>
                        )}
                      </div>

                      {/* Due Date */}
                      <div className="col-span-1 flex items-center">
                        {card.dueDate ? (
                          <span className={`text-xs ${isOverdue(card.dueDate) ? 'text-red-400' : 'text-[#858585]'}`}>
                            {formatDate(card.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6e6e6e]">—</span>
                        )}
                      </div>

                      {/* Progress (Checklist) */}
                      <div className="col-span-1 flex items-center">
                        {card.checklists && card.checklists.length > 0 ? (
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 h-2 bg-[#333333] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-600 transition-all"
                                style={{ width: `${checklistProgress * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#858585] w-10 text-right">
                              {Math.round(checklistProgress * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#6e6e6e]">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardMenuOpen(cardMenuOpen === card.id ? null : card.id);
                          }}
                          className="p-1 hover:bg-[#333333] rounded transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#858585]" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {Array.from(cards.values()).filter((card) => {
                // Search filter
                if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                // Development workflow filter
                if (selectedDevelopmentWorkflowId && card.metadata?.developmentWorkflowId !== selectedDevelopmentWorkflowId) {
                  return false;
                }
                // Development phase filter
                if (selectedDevelopmentPhase && card.metadata?.developmentPhase !== selectedDevelopmentPhase) {
                  return false;
                }
                // NSR folder filter
                if (selectedNSRFolder && card.metadata?.nsrFolder !== selectedNSRFolder) {
                  return false;
                }
                // Workflow track filter
                if (selectedWorkflowTrack && card.metadata?.workflowTrack !== selectedWorkflowTrack) {
                  return false;
                }
                // Workflow ID filter
                if (selectedWorkflowId && card.metadata?.workflowId !== selectedWorkflowId) {
                  return false;
                }
                // Note: BMAD sprint week filter removed - BMAD is only for development workflows, not regular workflows
                // Enterprise Method phase filter
                if (selectedEnterprisePhase && card.metadata?.enterprisePhase !== selectedEnterprisePhase) {
                  return false;
                }
                return true;
              }).length === 0 && (
                <div className="p-8 text-center text-[#858585]">
                  <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No cards found. Create a card to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewType === 'calendar' && (() => {
        const calendarCardsWithDates = Array.from(cards.values()).filter((card) => card.dueDate || card.startDate);

        const getDaysInMonth = (date: Date) => {
          const year = date.getFullYear();
          const month = date.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const daysInMonth = lastDay.getDate();
          const startingDayOfWeek = firstDay.getDay();

          return { daysInMonth, startingDayOfWeek, year, month };
        };

        const getCardsForDate = (date: Date) => {
          return calendarCardsWithDates.filter((card) => {
            const cardDate = card.dueDate ? new Date(card.dueDate) : card.startDate ? new Date(card.startDate) : null;
            if (!cardDate) return false;
            return (
              cardDate.getDate() === date.getDate() &&
              cardDate.getMonth() === date.getMonth() &&
              cardDate.getFullYear() === date.getFullYear()
            );
          });
        };

        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedMonth);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
          <div className="flex-1 flex flex-col overflow-hidden pl-4 pr-2 lg:pl-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333333] flex-shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-100">Calendar View</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedMonth(newDate);
                  }}
                  className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#858585]" />
                </button>
                <span className="text-sm font-medium min-w-[180px] text-center text-[#a0a0a0]">
                  {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedMonth(newDate);
                  }}
                  className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#858585]" />
                </button>
                <button
                  onClick={() => setSelectedMonth(new Date())}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
              <div className="bg-[#252526] rounded-lg border border-[#333333] overflow-hidden">
                {/* Week Day Headers */}
                <div className="grid grid-cols-7 gap-px bg-[#333333]">
                  {weekDays.map((day) => (
                    <div key={day} className="bg-[#252526] p-2 text-center text-sm font-semibold text-[#a0a0a0]">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px bg-[#333333]">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-[#252526] min-h-[100px]" />
                  ))}

                  {/* Days of the month */}
                  {days.map((day) => {
                    const date = new Date(year, month, day);
                    const dayCards = getCardsForDate(date);
                    const isToday =
                      date.getDate() === new Date().getDate() &&
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear();

                    return (
                      <div
                        key={day}
                        className={`bg-[#252526] min-h-[100px] p-2 border-l border-t border-[#333333] ${
                          isToday ? 'bg-orange-900/20 border-orange-600/50' : ''
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-orange-400' : 'text-[#a0a0a0]'}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayCards.slice(0, 3).map((card) => {
                            return (
                              <div
                                key={card.id}
                                onClick={() => handleOpenCardView(card.id)}
                                className="rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                                title={card.title}
                              >
                                {/* Card Cover */}
                                {card.cover && (
                                  <div
                                    className="w-full h-8 flex-shrink-0"
                                    style={{
                                      ...(card.cover.type === 'color' && {
                                        backgroundColor: card.cover.value,
                                      }),
                                      ...(card.cover.type === 'gradient' && {
                                        background: card.cover.value,
                                      }),
                                      ...(card.cover.type === 'image' && {
                                        backgroundImage: `url(${card.cover.value})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                      }),
                                      ...(card.cover.type === 'emoji' && {
                                        backgroundColor: 'transparent',
                                      }),
                                    }}
                                  >
                                    {card.cover.type === 'emoji' && (
                                      <div className="flex items-center justify-center h-full text-lg">
                                        {card.cover.value}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className={`text-xs p-1.5 ${card.cover ? 'bg-[#333333]' : getPriorityColor(card.priority)}`}>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="truncate flex-1 min-w-0 text-white font-medium">{card.title}</span>
                                    {card.metadata?.developmentPhase && (
                                      <span
                                        className={`text-[10px] px-1 py-0.5 rounded border flex-shrink-0 ${
                                          card.metadata.developmentPhase === 'analysis'
                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            : card.metadata.developmentPhase === 'planning'
                                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                            : card.metadata.developmentPhase === 'solutioning'
                                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                                        }`}
                                      >
                                        {card.metadata.developmentPhase === 'analysis' ? 'A' :
                                         card.metadata.developmentPhase === 'planning' ? 'P' :
                                         card.metadata.developmentPhase === 'solutioning' ? 'S' :
                                         'I'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {dayCards.length > 3 && (
                            <div className="text-xs text-[#6e6e6e] px-1.5">
                              +{dayCards.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {viewType === 'timeline' && (
          <div className="flex-1 flex flex-col overflow-hidden pl-4 pr-2 lg:pl-6">
            {/* Timeline Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333333] flex-shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-100">Timeline View</h3>
              </div>

              <div className="flex items-center gap-4">
                {/* Zoom Controls */}
                <div className="flex items-center gap-2 bg-[#252526] rounded-lg p-1">
                  {(['day', 'week', 'month'] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setTimelineZoom(z)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        timelineZoom === z
                          ? 'bg-[#333333] text-orange-400 shadow-sm'
                          : 'text-[#858585] hover:text-[#a0a0a0]'
                      }`}
                    >
                      {z.charAt(0).toUpperCase() + z.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(timelineDate);
                      if (timelineZoom === 'month') {
                        newDate.setMonth(newDate.getMonth() - 1);
                      } else if (timelineZoom === 'week') {
                        newDate.setDate(newDate.getDate() - 7);
                      } else {
                        newDate.setDate(newDate.getDate() - 1);
                      }
                      setTimelineDate(newDate);
                    }}
                    className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#858585]" />
                  </button>
                  <span className="text-sm font-medium min-w-[180px] text-center text-[#a0a0a0]">
                    {timelineZoom === 'month'
                      ? timelineDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : timelineZoom === 'week'
                      ? `Week ${getISOWeekNumber(timelineDate)}, ${timelineDate.getFullYear()}`
                      : timelineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(timelineDate);
                      if (timelineZoom === 'month') {
                        newDate.setMonth(newDate.getMonth() + 1);
                      } else if (timelineZoom === 'week') {
                        newDate.setDate(newDate.getDate() + 7);
                      } else {
                        newDate.setDate(newDate.getDate() + 1);
                      }
                      setTimelineDate(newDate);
                    }}
                    className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-[#858585]" />
                  </button>
                  <button
                    onClick={() => setTimelineDate(new Date())}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline Grid */}
            <div 
              className="flex-1 overflow-auto timeline-container"
              onMouseMove={handleTimelineDrag}
              onMouseUp={handleTimelineDragEnd}
              onMouseLeave={handleTimelineDragEnd}
            >
              <div className="min-w-[1200px]">
                {/* Date Headers */}
                <div className="sticky top-0 z-10 bg-[#252526] border-b border-[#333333]">
                  <div className="flex">
                    <div className="w-64 flex-shrink-0 px-4 py-2 font-semibold text-sm text-[#a0a0a0]">Card</div>
                    <div className="w-24 flex-shrink-0 px-4 py-2 font-semibold text-sm text-center text-[#a0a0a0]">Duration</div>
                    <div className="flex-1 flex">
                      {generateTimelineDates.map((date, i) => {
                        let displayText = '';
                        let subText = '';
                        
                        if (timelineZoom === 'day') {
                          displayText = date.getDate().toString();
                          subText = date.toLocaleDateString('en-US', { weekday: 'short' });
                        } else if (timelineZoom === 'week') {
                          const weekNumber = getISOWeekNumber(date);
                          const weekStart = getWeekStart(date);
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekStart.getDate() + 6);
                          displayText = `Week ${weekNumber}`;
                          subText = `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;
                        } else if (timelineZoom === 'month') {
                          displayText = date.toLocaleDateString('en-US', { month: 'long' });
                          subText = date.getFullYear().toString();
                        }
                        
                        return (
                          <div
                            key={i}
                            className="flex-1 text-center py-2 border-l border-[#333333]"
                          >
                            <div className="text-xs font-semibold text-[#a0a0a0]">{displayText}</div>
                            {subText && (
                              <div className="text-[10px] text-[#6e6e6e] mt-0.5">{subText}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Timeline Rows */}
                <div className="divide-y divide-gray-700">
                  {cardsWithDates.map((card) => {
                    const position = getCardPosition(card, generateTimelineDates);

                    return (
                      <div
                        key={card.id}
                        className="flex items-center hover:bg-[#252526]/50 group cursor-pointer"
                        onClick={() => {
                          setCardViewCardId(card.id);
                          setCardViewColumnId(card.columnId);
                          setCardViewCreateMode(false);
                          setCardViewOpen(true);
                        }}
                      >
                        {/* Card Name */}
                        <div className="w-64 flex-shrink-0 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getPriorityColor(card.priority)}`} />
                            <span className="text-sm font-medium text-gray-100 truncate">
                              {card.title}
                            </span>
                          </div>
                          {card.assignees && card.assignees.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3 text-[#6e6e6e]" />
                              <span className="text-xs text-[#6e6e6e]">
                                {card.assignees.map((u) => u.displayName).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Duration Column */}
                        <div className="w-24 flex-shrink-0 px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-gray-100">
                              {position.duration}
                            </span>
                            <span className="text-xs text-[#6e6e6e]">
                              {position.duration === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative py-2">
                          <div
                            className={`absolute h-10 rounded-lg overflow-hidden ${!card.cover ? getPriorityColor(card.priority) : ''} opacity-80 hover:opacity-100 transition-all shadow-md hover:shadow-lg cursor-move ${draggingTimelineCard === card.id ? 'ring-2 ring-orange-500' : ''}`}
                            onMouseDown={(e) => handleTimelineDragStart(e, card.id)}
                            draggable={false}
                            style={{ 
                              left: position.left, 
                              width: position.width,
                              ...(card.cover?.type === 'color' && {
                                backgroundColor: card.cover.value,
                              }),
                              ...(card.cover?.type === 'gradient' && {
                                background: card.cover.value,
                              }),
                              ...(card.cover?.type === 'image' && {
                                backgroundImage: `url(${card.cover.value})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }),
                              ...(card.cover?.type === 'emoji' && {
                                backgroundColor: 'transparent',
                              }),
                            }}
                            title={`${card.title}\n${position.durationText}\n${card.startDate ? new Date(card.startDate).toLocaleDateString() : 'No start'} → ${card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No end'}`}
                          >
                            {card.cover && card.cover.type === 'emoji' && (
                              <div className="absolute inset-0 flex items-center justify-center text-xl bg-black/30">
                                {card.cover.value}
                              </div>
                            )}
                            <div className="px-2 py-1 h-full flex items-center justify-between gap-2 relative z-10 bg-black/40 backdrop-blur-[2px]">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="text-xs text-white font-medium truncate drop-shadow-md">
                                  {card.title}
                                </span>
                                {card.metadata?.developmentPhase && (
                                  <span
                                    className={`text-[10px] px-1 py-0.5 rounded border flex-shrink-0 ${
                                      card.metadata.developmentPhase === 'analysis'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : card.metadata.developmentPhase === 'planning'
                                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                        : card.metadata.developmentPhase === 'solutioning'
                                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                                    }`}
                                  >
                                    {card.metadata.developmentPhase === 'analysis' ? 'A' :
                                     card.metadata.developmentPhase === 'planning' ? 'P' :
                                     card.metadata.developmentPhase === 'solutioning' ? 'S' :
                                     'I'}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-white/90 font-bold bg-black/40 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 drop-shadow-md">
                                {position.durationText}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cardsWithDates.length === 0 && (
                  <div className="text-center py-12 text-[#6e6e6e]">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No cards with dates</h3>
                    <p>Add start dates or due dates to cards to see them on the timeline.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
      )}

      {viewType === 'docs' && board && (
        <BoardDocsView
          board={board}
          cards={cards}
          onLinkDocument={handleLinkDocument}
          onUnlinkDocument={handleUnlinkDocument}
        />
      )}

      {/* Legacy Docs View removed - using BoardDocsView component instead */}

      {viewType === 'drive' && board && (
        <BoardDriveView
          board={board}
          cards={cards}
          currentFolder={driveCurrentFolder}
          onNavigateFolder={handleNavigateToDriveFolder}
          onLinkFile={handleLinkFile}
          onUnlinkFile={handleUnlinkFile}
        />
      )}

      {/* CardView Component */}
      <CardView
        boardId={currentBoardId}
        cardId={cardViewCardId}
        columnId={cardViewColumnId || undefined}
        isOpen={cardViewOpen}
        onClose={() => {
          setCardViewOpen(false);
          setCardViewCardId(null);
          setCardViewColumnId(null);
          setCardViewCreateMode(false);
        }}
        onSave={handleCreateCardFromEditor}
        onUpdated={loadBoard}
        isCreateMode={cardViewCreateMode}
      />

      {/* Board Settings Modal */}
      {board && (
        <BoardSettingsModal
          board={board}
          isOpen={showBoardSettings}
          onClose={() => setShowBoardSettings(false)}
          onUpdated={loadBoard}
        />
      )}

      {/* Board Members Modal */}
      {board && (
        <BoardMembers
          board={board}
          isOpen={showBoardMembers}
          onClose={() => setShowBoardMembers(false)}
          onUpdated={() => {
            loadBoard();
            loadAllBoards();
          }}
        />
      )}

      {/* Delete Column Confirmation Modal */}
      {board && columnToDelete && (
        <ConfirmationModal
          isOpen={deleteColumnModalOpen}
          onClose={() => {
            setDeleteColumnModalOpen(false);
            setColumnToDelete(null);
          }}
          onConfirm={confirmDeleteColumn}
          title="Delete Column"
          message={`Are you sure you want to delete "${board.columns.find(c => c.id === columnToDelete)?.name || 'this column'}"? All cards in this column will be deleted. This action cannot be undone.`}
          type="danger"
          confirmText="Delete Column"
          cancelText="Cancel"
        />
      )}

      {/* Board Selector Modal */}
      <BoardSelector
        isOpen={showBoardSelector}
        onClose={() => setShowBoardSelector(false)}
        onSelectBoard={(boardId) => {
          setCurrentBoardId(boardId);
          setShowBoardSelector(false);
        }}
        selectedBoardId={currentBoardId}
        onCreateBoard={(newBoard) => {
          setCurrentBoardId(newBoard.id);
          loadBoard();
        }}
      />

      {/* Delete Card Confirmation Modal */}
      {cardToDelete && (
        <ConfirmationModal
          isOpen={deleteCardModalOpen}
          onClose={() => {
            setDeleteCardModalOpen(false);
            setCardToDelete(null);
          }}
          onConfirm={confirmDeleteCard}
          title="Delete Card"
          message={`Are you sure you want to delete "${cards.get(cardToDelete)?.title || 'this card'}"? This action cannot be undone.`}
          type="danger"
          confirmText="Delete Card"
          cancelText="Cancel"
        />
      )}

      {/* Delete Board Confirmation Modal */}
      {boardToDelete && (
        <ConfirmationModal
          isOpen={deleteBoardModalOpen}
          onClose={() => {
            setDeleteBoardModalOpen(false);
            setBoardToDelete(null);
          }}
          onConfirm={confirmDeleteBoard}
          title="Delete Board"
          message={`Are you sure you want to delete "${boardToDelete.name}"? This action cannot be undone.`}
          type="danger"
          confirmText="Delete Board"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
