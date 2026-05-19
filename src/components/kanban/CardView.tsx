/**
 * Card View Component
 * Full-featured card viewing and editing modal with all WHN Chat features
 * Supports create and edit modes
 */

import React, { useState, useEffect, useRef } from 'react';
// Note: useRef removed as unused
import { kanbanService } from '../../services/mockKanbanService';
import { notesService } from '../../services/mockNotesService';
import { tasksService } from '../../services/mockTasksService';
import { driveService } from '../../services/mockDriveService';
import { calendarService } from '../../services/mockCalendarService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import DevelopmentWorkflowSelector from '../development/DevelopmentWorkflowSelector';
import { boardColorOptions, boardIconOptions } from '../../utils/boardConstants';
import type { BoardCard, CardAssignee, CardComment, CardChecklist, CardCover, CardAttachment } from '../../types/kanban';
// Note: CardAttachment removed as unused (functions that use it are commented out)
import type { Note } from '../../types/notes';
import type { Task } from '../../types/tasks';
import type { DriveFile } from '../../types/drive';
import type { CalendarEvent } from '../../types/calendar';
import type { DevelopmentPhase } from '../../types/developmentWorkflow';
import {
  X,
  Calendar,
  Flag,
  Users,
  Clock,
  MessageSquare,
  Save,
  UserPlus,
  Plus,
  ArrowLeft,
  FileText,
  CheckSquare,
  Search,
  Link as LinkIcon,
  ExternalLink,
  Folder,
  List,
  Upload,
  Paperclip,
  Image as ImageIcon,
  Download,
  Trash2,
  Palette,
} from 'lucide-react';
import { WorkLogActivityModal } from '../work/WorkLogActivityModal';

interface CardViewProps {
  boardId: string;
  cardId: string | null; // null when creating new card
  columnId?: string; // Required when creating new card
  isOpen: boolean;
  onClose: () => void;
  onSave?: (cardData: Partial<BoardCard>) => void; // Called when creating new card
  onUpdated?: () => void;
  isCreateMode?: boolean; // True when creating new card
}

export const CardView: React.FC<CardViewProps> = ({
  boardId,
  cardId,
  columnId,
  isOpen,
  onClose,
  onSave,
  onUpdated,
  isCreateMode = false,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [card, setCard] = useState<BoardCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCard, setEditedCard] = useState<Partial<BoardCard>>({});
  const [newComment, setNewComment] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkNote, setShowLinkNote] = useState(false);
  const [showLinkTask, setShowLinkTask] = useState(false);
  const [showLinkFile, setShowLinkFile] = useState(false);
  const [showLinkCalendar, setShowLinkCalendar] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [availableFiles, setAvailableFiles] = useState<DriveFile[]>([]);
  const [availableCalendarEvents, setAvailableCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDevelopmentWorkflowId, setSelectedDevelopmentWorkflowId] = useState<string | undefined>(undefined);
  const [selectedDevelopmentStepId, setSelectedDevelopmentStepId] = useState<string | undefined>(undefined);
  const [selectedDevelopmentPhase, setSelectedDevelopmentPhase] = useState<DevelopmentPhase | undefined>(undefined);
  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [allCards, setAllCards] = useState<BoardCard[]>([]);

  useEffect(() => {
    if (logTimeModalOpen) {
      kanbanService.getAllCardsForBoard(boardId).then(setAllCards);
    }
  }, [logTimeModalOpen, boardId]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      if (!isCreateMode && cardId) {
        // Edit mode - load existing card
        loadCard();
      } else if (isCreateMode) {
        // Create mode - start with empty form
        setCard(null);
        setEditedCard({
          title: '',
          description: '',
          priority: 'medium',
          startDate: undefined,
          dueDate: undefined,
          estimatedTime: undefined,
          estimatedTimeUnit: 'hours',
          assignees: [],
          labels: [],
          checklists: [],
          comments: [],
          attachments: [],
          metadata: {},
        });
        setSelectedDevelopmentWorkflowId(undefined);
        setSelectedDevelopmentStepId(undefined);
        setSelectedDevelopmentPhase(undefined);
        setIsEditing(true); // Auto-enable editing for new cards
      }
    } catch (error) {
      console.error('Error loading card view data:', error);
      showToast({
        type: 'error',
        message: 'Failed to load card data',
        duration: 3000,
      });
    }
  }, [isOpen, cardId, isCreateMode]);

  // Load available notes, tasks, files, and calendar events for linking
  useEffect(() => {
    if (showLinkNote) {
      const notes = notesService.getAllNotes();
      setAvailableNotes(notes);
    }
    if (showLinkTask) {
      const tasks = tasksService.getAllTasks();
      setAvailableTasks(tasks);
    }
    if (showLinkFile) {
      const files = driveService.getAllFiles();
      setAvailableFiles(files);
    }
    if (showLinkCalendar) {
      const events = calendarService.getEvents();
      setAvailableCalendarEvents(events);
    }
  }, [showLinkNote, showLinkTask, showLinkFile, showLinkCalendar]);

  const loadCard = async () => {
    if (!cardId || !boardId) return;

    try {
      const loadedCard = await kanbanService.getCard(boardId, cardId);
      if (loadedCard) {
        setCard(loadedCard);
        setEditedCard({
          title: loadedCard.title,
          description: loadedCard.description,
          priority: loadedCard.priority,
          startDate: loadedCard.startDate,
          dueDate: loadedCard.dueDate,
          estimatedTime: loadedCard.estimatedTime,
          estimatedTimeUnit: loadedCard.estimatedTimeUnit,
          assignees: loadedCard.assignees || [],
          labels: loadedCard.labels || [],
          checklists: loadedCard.checklists || [],
          cover: loadedCard.cover,
          attachments: loadedCard.attachments || [],
          metadata: loadedCard.metadata || {},
        });
        // Load development workflow fields from metadata
        setSelectedDevelopmentWorkflowId(loadedCard.metadata?.developmentWorkflowId);
        setSelectedDevelopmentStepId(loadedCard.metadata?.developmentStepId);
        setSelectedDevelopmentPhase(loadedCard.metadata?.developmentPhase);
      }
    } catch (error) {
      console.error('Error loading card:', error);
      showToast({
        type: 'error',
        message: 'Failed to load card',
        duration: 3000,
      });
    }
  };

  const handleLinkNote = (noteId: string) => {
    const note = notesService.getNote(noteId);
    if (!note) return;

    const updatedMetadata = {
      ...(editedCard.metadata || {}),
      noteId,
    };

    if (isCreateMode) {
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId) {
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Update note with kanbanCardId
        notesService.updateNote(noteId, { kanbanCardId: cardId });
        loadCard();
      });
    }

    setShowLinkNote(false);
    setNoteSearchQuery('');
    showToast({
      type: 'success',
      message: 'Note linked to card',
      duration: 2000,
    });
  };

  const handleLinkTask = (taskId: string) => {
    const task = tasksService.getTask(taskId);
    if (!task) return;

    // Support both legacy single taskId and new taskIds array
    const currentTaskIds = editedCard.metadata?.taskIds || (editedCard.metadata?.taskId ? [editedCard.metadata.taskId] : []);
    
    // Don't add if already attached
    if (currentTaskIds.includes(taskId)) {
      showToast({
        type: 'info',
        message: 'Task already attached',
        duration: 2000,
      });
      return;
    }

    const updatedMetadata = {
      ...(editedCard.metadata || {}),
      taskIds: [...currentTaskIds, taskId],
      // Keep taskId for backwards compatibility (use first task if exists)
      taskId: currentTaskIds.length === 0 ? taskId : editedCard.metadata?.taskId,
    };

    if (isCreateMode) {
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId) {
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Update task with kanbanCardId (bidirectional link)
        tasksService.updateTask(taskId, { kanbanCardId: cardId });
        loadCard();
      });
    }

    setShowLinkTask(false);
    setTaskSearchQuery('');
    showToast({
      type: 'success',
      message: 'Task attached to card',
      duration: 2000,
    });
  };

  const handleUnlinkNote = () => {
    if (isCreateMode) {
      const updatedMetadata = { ...(editedCard.metadata || {}) };
      delete updatedMetadata.noteId;
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId && card.metadata?.noteId) {
      const noteId = card.metadata.noteId;
      const updatedMetadata = { ...(card.metadata || {}) };
      delete updatedMetadata.noteId;
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Remove kanbanCardId from note
        notesService.updateNote(noteId, { kanbanCardId: undefined });
        loadCard();
      });
    }
    showToast({
      type: 'success',
      message: 'Note unlinked from card',
      duration: 2000,
    });
  };

  const handleUnlinkTask = (taskId?: string) => {
    // Support both legacy single taskId and new taskIds array
    const currentTaskIds = editedCard.metadata?.taskIds || (editedCard.metadata?.taskId ? [editedCard.metadata.taskId] : []);
    const taskToRemove = taskId || (editedCard.metadata?.taskId || (currentTaskIds.length > 0 ? currentTaskIds[0] : undefined));
    
    if (!taskToRemove) return;

    const updatedTaskIds = (currentTaskIds as string[]).filter(id => id !== taskToRemove);
    
    const updatedMetadata = {
      ...(editedCard.metadata || {}),
      taskIds: updatedTaskIds.length > 0 ? updatedTaskIds : undefined,
      taskId: updatedTaskIds.length > 0 ? updatedTaskIds[0] : undefined,
    };

    // Clean up undefined values
    if (!updatedMetadata.taskIds) delete updatedMetadata.taskIds;
    if (!updatedMetadata.taskId) delete updatedMetadata.taskId;

    if (isCreateMode) {
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId) {
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Remove kanbanCardId from task (bidirectional unlink)
        tasksService.updateTask(taskToRemove, { kanbanCardId: undefined });
        loadCard();
      });
    }
    
    showToast({
      type: 'success',
      message: 'Task detached from card',
      duration: 2000,
    });
  };

  const handleLinkCalendar = (eventId: string) => {
    const event = calendarService.getEvent(eventId);
    if (!event) return;

    const updatedMetadata = {
      ...(editedCard.metadata || {}),
      calendarEventId: eventId,
    };

    if (isCreateMode) {
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId) {
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Update calendar event with kanbanCardId
        calendarService.updateEvent(eventId, { kanbanCardId: cardId });
        loadCard();
      });
    }

    setShowLinkCalendar(false);
    setCalendarSearchQuery('');
    showToast({
      type: 'success',
      message: 'Calendar event linked to card',
      duration: 2000,
    });
  };

  const handleUnlinkCalendar = () => {
    if (isCreateMode) {
      const updatedMetadata = { ...(editedCard.metadata || {}) };
      delete updatedMetadata.calendarEventId;
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId && card.metadata?.calendarEventId) {
      const eventId = card.metadata.calendarEventId;
      const updatedMetadata = { ...(card.metadata || {}) };
      delete updatedMetadata.calendarEventId;
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        // Remove kanbanCardId from calendar event
        calendarService.updateEvent(eventId, { kanbanCardId: undefined });
        loadCard();
      });
    }
    showToast({
      type: 'success',
      message: 'Calendar event unlinked from card',
      duration: 2000,
    });
  };

  const filteredNotes = availableNotes.filter(note =>
    note.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(noteSearchQuery.toLowerCase())
  );

  // Filter out tasks that are already attached to this card
  const filteredTasks = availableTasks.filter(task => {
    const taskIds = !isCreateMode && card?.metadata?.taskIds 
      ? card.metadata.taskIds 
      : isCreateMode && editedCard.metadata?.taskIds 
      ? editedCard.metadata.taskIds 
      : (!isCreateMode && card?.metadata?.taskId) || (isCreateMode && editedCard.metadata?.taskId)
      ? [card?.metadata?.taskId || editedCard.metadata?.taskId].filter(Boolean) as string[]
      : [];
    
    // Filter out already attached tasks
    if (taskIds.includes(task.id)) return false;
    
    // Filter by search query
    return task.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(taskSearchQuery.toLowerCase());
  });

  const filteredCalendarEvents = availableCalendarEvents.filter(event =>
    event.title.toLowerCase().includes(calendarSearchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(calendarSearchQuery.toLowerCase())
  );

  const filteredFiles = availableFiles.filter(file =>
    file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  const handleLinkFile = (fileId: string) => {
    const file = driveService.getFile(fileId);
    if (!file) return;

    const updatedMetadata = {
      ...(editedCard.metadata || {}),
      fileId,
    };

    if (isCreateMode) {
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId) {
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        loadCard();
      });
    }

    setShowLinkFile(false);
    setFileSearchQuery('');
    showToast({
      type: 'success',
      message: 'File linked to card',
      duration: 2000,
    });
  };

  const handleUnlinkFile = () => {
    if (isCreateMode) {
      const updatedMetadata = { ...(editedCard.metadata || {}) };
      delete updatedMetadata.fileId;
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId && card.metadata?.fileId) {
      const updatedMetadata = { ...(card.metadata || {}) };
      delete updatedMetadata.fileId;
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        loadCard();
      });
    }
    showToast({
      type: 'success',
      message: 'File unlinked from card',
      duration: 2000,
    });
  };

  const handleUnlinkTaskList = () => {
    if (isCreateMode) {
      const updatedMetadata = { ...(editedCard.metadata || {}) };
      delete updatedMetadata.taskListId;
      setEditedCard({
        ...editedCard,
        metadata: updatedMetadata,
      });
    } else if (card && cardId && card.metadata?.taskListId) {
      const updatedMetadata = { ...(card.metadata || {}) };
      delete updatedMetadata.taskListId;
      kanbanService.updateCard(boardId, cardId, { metadata: updatedMetadata }).then(() => {
        loadCard();
      });
    }
    showToast({
      type: 'success',
      message: 'Task list unlinked from card',
      duration: 2000,
    });
  };

  const isImageFile = (type: string): boolean => {
    return type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(type.toLowerCase());
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setUploadingFiles(true);
    const currentAttachments = editedCard.attachments || card?.attachments || [];
    const newAttachments: CardAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `attachment-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate upload progress
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      
      // Simulate upload (in production, this would upload to a server)
      await new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
          if (progress >= 100) {
            clearInterval(interval);
            resolve(undefined);
          }
        }, 100);
      });

      const attachment: CardAttachment = {
        id: fileId,
        name: file.name,
        url: objectUrl, // In production, this would be a server URL
        type: file.type,
        size: file.size,
        uploadedBy: user?.id || 'unknown',
        uploadedAt: Date.now(),
      };

      newAttachments.push(attachment);
      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    }

    setEditedCard({
      ...editedCard,
      attachments: [...currentAttachments, ...newAttachments],
    });

    setUploadingFiles(false);
    showToast({
      type: 'success',
      message: `${newAttachments.length} file${newAttachments.length !== 1 ? 's' : ''} uploaded successfully`,
      duration: 2000,
    });
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const currentAttachments = editedCard.attachments || card?.attachments || [];
    const attachment = currentAttachments.find((a) => a.id === attachmentId);
    
    if (attachment && attachment.url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.url);
    }

    const updatedAttachments = currentAttachments.filter((a) => a.id !== attachmentId);
    setEditedCard({
      ...editedCard,
      attachments: updatedAttachments,
    });

    // If this attachment was used as cover, remove cover
    if (card?.cover?.type === 'image' && card.cover.value === attachment?.url) {
      setEditedCard({
        ...editedCard,
        attachments: updatedAttachments,
        cover: undefined,
      });
    }

    showToast({
      type: 'success',
      message: 'Attachment deleted',
      duration: 2000,
    });
  };

  const handleSetCoverFromAttachment = (attachmentId: string) => {
    const currentAttachments = editedCard.attachments || card?.attachments || [];
    const attachment = currentAttachments.find((a) => a.id === attachmentId);
    
    if (!attachment || !isImageFile(attachment.type)) {
      showToast({
        type: 'error',
        message: 'Only image files can be used as cover',
        duration: 2000,
      });
      return;
    }

    const coverData: CardCover = {
      type: 'image',
      value: attachment.url,
      size: 'medium',
    };

    setEditedCard({
      ...editedCard,
      cover: coverData,
    });

    setShowCoverPicker(false);
    showToast({
      type: 'success',
      message: 'Cover image set',
      duration: 2000,
    });
  };

  const handleDownloadAttachment = (attachment: CardAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    try {
      if (isCreateMode) {
        // Create mode - validate and call onSave callback
        if (!editedCard.title || editedCard.title.trim() === '') {
          showToast({
            type: 'error',
            message: 'Please enter a title for the card',
            duration: 3000,
          });
          return;
        }

        if (!columnId) {
          showToast({
            type: 'error',
            message: 'Column ID is required',
            duration: 3000,
          });
          return;
        }

        if (onSave) {
          const cardData = {
            ...editedCard,
            columnId,
            metadata: {
              ...editedCard.metadata,
              developmentWorkflowId: selectedDevelopmentWorkflowId,
              developmentStepId: selectedDevelopmentStepId,
              developmentPhase: selectedDevelopmentPhase,
            },
          };
          onSave(cardData);
          
          // Update bidirectional development workflow links after card is created
          // This will be handled in the parent component after card creation
          if (selectedDevelopmentStepId && selectedDevelopmentWorkflowId) {
            // The parent component will handle the bidirectional linking after card creation
          }
        }
        
        showToast({
          type: 'success',
          message: 'Card created successfully',
          duration: 2000,
        });
        onClose();
      } else {
        // Edit mode - update existing card
        if (!card || !cardId) return;

        // Update metadata with development workflow fields
        const updatedCard: Partial<BoardCard> & { metadata: Record<string, any> } = {
          ...editedCard,
          metadata: {
            ...editedCard.metadata,
            developmentWorkflowId: selectedDevelopmentWorkflowId,
            developmentStepId: selectedDevelopmentStepId,
            developmentPhase: selectedDevelopmentPhase,
          } as Record<string, any>,
        };

        await kanbanService.updateCard(boardId, cardId, updatedCard);
        
        // Update bidirectional links if metadata changed
        if (updatedCard.metadata) {
          if (updatedCard.metadata.noteId && updatedCard.metadata.noteId !== card.metadata?.noteId) {
            notesService.updateNote(updatedCard.metadata.noteId, { kanbanCardId: cardId });
            // Unlink old note if it was changed
            if (card.metadata?.noteId && card.metadata.noteId !== updatedCard.metadata.noteId) {
              notesService.updateNote(card.metadata.noteId, { kanbanCardId: undefined });
            }
          }
          if (updatedCard.metadata.taskId && updatedCard.metadata.taskId !== card.metadata?.taskId) {
            tasksService.updateTask(updatedCard.metadata.taskId, { kanbanCardId: cardId });
            // Unlink old task if it was changed
            if (card.metadata?.taskId && card.metadata.taskId !== updatedCard.metadata.taskId) {
              tasksService.updateTask(card.metadata.taskId, { kanbanCardId: undefined });
            }
          }
          if (updatedCard.metadata.calendarEventId && updatedCard.metadata.calendarEventId !== card.metadata?.calendarEventId) {
            calendarService.updateEvent(updatedCard.metadata.calendarEventId, { kanbanCardId: cardId, boardId: boardId });
            // Unlink old calendar event if it was changed
            if (card.metadata?.calendarEventId && card.metadata.calendarEventId !== updatedCard.metadata.calendarEventId) {
              calendarService.updateEvent(card.metadata.calendarEventId, { kanbanCardId: undefined, boardId: undefined });
            }
          }
          
          // Update bidirectional development workflow links
          if (updatedCard.metadata.developmentStepId) {
            const { developmentWorkflowService } = require('../../services/mockDevelopmentWorkflowService');
            const workflow = developmentWorkflowService.getWorkflow(updatedCard.metadata.developmentWorkflowId || '');
            if (workflow) {
              const step = workflow.steps.find((s: any) => s.id === updatedCard.metadata.developmentStepId);
              if (step && !step.kanbanCardIds?.includes(cardId)) {
                // Add card ID to step's kanbanCardIds
                developmentWorkflowService.updateStep(
                  workflow.id,
                  step.id,
                  { kanbanCardIds: [...(step.kanbanCardIds || []), cardId] }
                );
              }
            }
          }
          
          // Unlink old development step if changed
          if (card.metadata?.developmentStepId && 
              card.metadata.developmentStepId !== updatedCard.metadata?.developmentStepId) {
            const { developmentWorkflowService } = require('../../services/mockDevelopmentWorkflowService');
            const oldStepId = card.metadata.developmentStepId;
            const oldWorkflowId = card.metadata.developmentWorkflowId;
            if (oldStepId && oldWorkflowId) {
              const oldWorkflow = developmentWorkflowService.getWorkflow(oldWorkflowId);
              if (oldWorkflow) {
                const oldStep = oldWorkflow.steps.find((s: any) => s.id === oldStepId);
                if (oldStep && oldStep.kanbanCardIds?.includes(cardId)) {
                  // Remove card ID from old step's kanbanCardIds
                  developmentWorkflowService.updateStep(
                    oldWorkflow.id,
                    oldStep.id,
                    { kanbanCardIds: oldStep.kanbanCardIds.filter((id: string) => id !== cardId) }
                  );
                }
              }
            }
          }
        }
        
        loadCard();
        setIsEditing(false);

        if (onUpdated) onUpdated();
        
        showToast({
          type: 'success',
          message: 'Card updated successfully',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      showToast({
        type: 'error',
        message: 'Failed to save changes',
        duration: 3000,
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !card || !cardId) return;

    try {
      const comment: CardComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.id || 'user-1',
        userName: user?.name || 'User',
        content: newComment,
        createdAt: Date.now(),
      };

      const updatedComments = [...(card.comments || []), comment];
      await kanbanService.updateCard(boardId, cardId, { comments: updatedComments });

      setNewComment('');
      loadCard();
      
      showToast({
        type: 'success',
        message: 'Comment added',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      showToast({
        type: 'error',
        message: 'Failed to add comment',
        duration: 3000,
      });
    }
  };

  const handleAssignUser = (assignee: CardAssignee) => {
    if (isCreateMode) {
      const currentAssignees = editedCard.assignees || [];
      if (!currentAssignees.some(a => a.userId === assignee.userId)) {
        setEditedCard({
          ...editedCard,
          assignees: [...currentAssignees, assignee],
        });
      }
    } else if (card && cardId) {
      const currentAssignees = card.assignees || [];
      if (!currentAssignees.some(a => a.userId === assignee.userId)) {
        kanbanService.updateCard(boardId, cardId, {
          assignees: [...currentAssignees, assignee],
        }).then(() => loadCard());
      }
    }

    setShowUserSearch(false);
    setUserSearchQuery('');
  };

  const handleUnassignUser = (userId: string) => {
    if (isCreateMode) {
      const updatedAssignees = (editedCard.assignees || []).filter(a => a.userId !== userId);
      setEditedCard({ ...editedCard, assignees: updatedAssignees });
    } else if (card && cardId) {
      const updatedAssignees = (card.assignees || []).filter(a => a.userId !== userId);
      kanbanService.updateCard(boardId, cardId, { assignees: updatedAssignees }).then(() => loadCard());
    }
  };

  // Mock user search - replace with real user service
  const mockUsers: CardAssignee[] = [
    { userId: '1', email: 'user1@example.com', displayName: 'User One', avatar: undefined },
    { userId: '2', email: 'user2@example.com', displayName: 'User Two', avatar: undefined },
    { userId: '3', email: 'user3@example.com', displayName: 'User Three', avatar: undefined },
  ];

  const filteredUsers = mockUsers.filter(u =>
    u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Helper function to get ISO week number (same as in Kanban.tsx)
  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const handleAddChecklist = () => {
    if (!newChecklistTitle.trim()) return;

    const checklist: CardChecklist = {
      id: `checklist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newChecklistTitle,
      items: [],
      createdAt: new Date().toISOString(),
    };

    if (isCreateMode) {
      const currentChecklists = editedCard.checklists || [];
      setEditedCard({
        ...editedCard,
        checklists: [...currentChecklists, checklist],
      });
    } else if (card && cardId) {
      const currentChecklists = card.checklists || [];
      kanbanService.updateCard(boardId, cardId, {
        checklists: [...currentChecklists, checklist],
      }).then(() => loadCard());
    }

    setNewChecklistTitle('');
    setShowChecklistForm(false);
  };

  if (!isOpen) return null;

  // In create mode, card will be null until the card is created
  // In edit mode, we need card
  if (!isCreateMode && !card) return null;

  // const _displayCard = isCreateMode ? null : card;
  const displayData = isCreateMode || isEditing ? editedCard : card;

  return (
    <>
      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-[#1e1e1e] hover:bg-[#252526] rounded-lg text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 z-[150]" onClick={onClose} />
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className="bg-[#252526]/80 backdrop-blur-sm rounded-lg !max-w-[560px] w-[90vw] sm:!w-[560px] max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto border border-orange-500/30 shadow-2xl shadow-orange-500/10 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#252526]/80 backdrop-blur-sm border-b border-orange-500/20 p-4 md:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#333333]/50 rounded-lg transition-colors group flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5 text-[#858585] group-hover:text-orange-400" />
              </button>
              <div className="flex-1 min-w-0">
                {(isCreateMode || isEditing) ? (
                  <input
                    type="text"
                    value={editedCard.title || ''}
                    onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
                    className="text-xl sm:text-2xl font-bold bg-transparent border-0 border-b-2 border-orange-500 focus:outline-none w-full text-white min-h-[44px]"
                    placeholder={isCreateMode ? "Enter card title..." : "Edit card title"}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-xl sm:text-2xl font-bold gradient-text truncate">{card?.title || 'Untitled'}</h2>
                )}
                <p className="text-xs sm:text-sm text-[#858585] mt-1">
                  {isCreateMode
                    ? `Creating new card${columnId ? ` in column` : ''}`
                    : `Card in column`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {isCreateMode ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 text-sm sm:text-base min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden xs:inline">Create Card</span>
                    <span className="xs:hidden">Create</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg transition-colors text-sm sm:text-base min-h-[44px]"
                  >
                    Cancel
                  </button>
                </>
              ) : isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 text-sm sm:text-base min-h-[44px]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      loadCard();
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg transition-colors text-sm sm:text-base min-h-[44px]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-700 text-white rounded-lg transition-all shadow-lg shadow-orange-500/20 text-sm sm:text-base min-h-[44px]"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#333333]/50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Card Cover */}
          {displayData?.cover && (
            <div
              className="h-32 w-full"
              style={{
                ...(displayData.cover.type === 'color' && {
                  backgroundColor: displayData.cover.value,
                }),
                ...(displayData.cover.type === 'gradient' && {
                  background: displayData.cover.value,
                }),
                ...(displayData.cover.type === 'image' && {
                  backgroundImage: `url(${displayData.cover.value})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }),
                ...(displayData.cover.type === 'emoji' && {
                  backgroundColor: 'transparent',
                }),
              }}
            >
              {displayData.cover.type === 'emoji' && (
                <div className="flex items-center justify-center h-full text-4xl">
                  {displayData.cover.value}
                </div>
              )}
            </div>
          )}

          <div className="p-3 sm:p-4 md:p-6 space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </label>
              {(isCreateMode || isEditing) ? (
                <textarea
                  value={editedCard.description || ''}
                  onChange={(e) => setEditedCard({ ...editedCard, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#858585] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter card description"
                />
              ) : (
                <p className="text-sm text-[#a0a0a0] whitespace-pre-wrap">{card?.description || 'No description'}</p>
              )}
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Priority
                </label>
                {(isCreateMode || isEditing) ? (
                  <select
                    value={editedCard.priority || 'medium'}
                    onChange={(e) => setEditedCard({ ...editedCard, priority: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                ) : (
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-sm flex items-center ${
                      card?.priority === 'urgent'
                        ? 'bg-red-900/30 text-red-400 border border-red-700'
                        : card?.priority === 'high'
                        ? 'bg-red-900/30 text-red-400 border border-red-700'
                        : card?.priority === 'medium'
                        ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                        : 'bg-green-900/30 text-green-400 border border-green-700'
                    }`}
                  >
                    {card?.priority === 'urgent' ? '🔥' : card?.priority === 'high' ? '🔴' : card?.priority === 'medium' ? '🟡' : '🟢'}{' '}
                    {card?.priority || 'medium'}
                  </span>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                {(isCreateMode || isEditing) ? (
                  <div>
                    <input
                      type="date"
                      value={
                        editedCard.startDate
                          ? new Date(editedCard.startDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                        setEditedCard({
                          ...editedCard,
                          startDate: date,
                        });
                      }}
                      className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {editedCard.startDate && (() => {
                      const date = new Date(editedCard.startDate!);
                      const weekNumber = getISOWeekNumber(date);
                      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                      const year = date.getFullYear();
                      return (
                        <p className="text-xs text-[#858585] mt-1">
                          Week {weekNumber}, {monthName} {year}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-[#a0a0a0]">
                    {card?.startDate ? (() => {
                      const date = new Date(card.startDate);
                      const weekNumber = getISOWeekNumber(date);
                      return `${date.toLocaleDateString()} (Week ${weekNumber})`;
                    })() : 'No start date'}
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </label>
                {(isCreateMode || isEditing) ? (
                  <div>
                    <input
                      type="date"
                      value={
                        editedCard.dueDate
                          ? new Date(editedCard.dueDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                        setEditedCard({
                          ...editedCard,
                          dueDate: date,
                        });
                      }}
                      className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {editedCard.dueDate && (() => {
                      const date = new Date(editedCard.dueDate!);
                      const weekNumber = getISOWeekNumber(date);
                      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                      const year = date.getFullYear();
                      return (
                        <p className="text-xs text-[#858585] mt-1">
                          Week {weekNumber}, {monthName} {year}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-[#a0a0a0]">
                    {card?.dueDate ? (() => {
                      const date = new Date(card.dueDate);
                      const weekNumber = getISOWeekNumber(date);
                      return `${date.toLocaleDateString()} (Week ${weekNumber})`;
                    })() : 'No due date'}
                  </p>
                )}
              </div>

              {/* Estimated Time */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  Estimated Time
                </label>
                {(isCreateMode || isEditing) ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={editedCard.estimatedTime || ''}
                      onChange={(e) =>
                        setEditedCard({
                          ...editedCard,
                          estimatedTime: parseFloat(e.target.value) || undefined,
                        })
                      }
                      placeholder="8"
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <select
                      value={editedCard.estimatedTimeUnit || 'hours'}
                      onChange={(e) =>
                        setEditedCard({
                          ...editedCard,
                          estimatedTimeUnit: e.target.value as 'hours' | 'days',
                        })
                      }
                      className="w-full px-4 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-[#a0a0a0]">
                    {card?.estimatedTime
                      ? `${card.estimatedTime} ${card.estimatedTimeUnit === 'days' ? 'days' : 'hours'}`
                      : 'Not set'}
                  </p>
                )}
              </div>
            </div>

            {/* Card Cover Picker */}
            {(isCreateMode || isEditing) && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Card Cover
                </label>
                <button
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#333333] hover:bg-[#444444] border border-[#444444] rounded-lg text-sm transition-colors text-white"
                >
                  {displayData?.cover ? 'Change Cover' : 'Add Cover'}
                </button>

                {showCoverPicker && (
                  <div className="mt-3 p-4 bg-[#333333]/40 border border-[#444444]/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-3 text-white">Choose Cover Type</h4>
                    
                    {/* Solid Colors */}
                    <div className="mb-4">
                      <p className="text-xs text-[#858585] mb-2">Solid Colors</p>
                      <div className="flex flex-wrap gap-1.5">
                        {boardColorOptions.filter(c => c.type === 'solid').map(colorOption => (
                          <button
                            key={colorOption.value}
                            onClick={() => {
                              const coverData: CardCover = { type: 'color', value: colorOption.value, size: 'medium' };
                              setEditedCard({ ...editedCard, cover: coverData });
                              setShowCoverPicker(false);
                            }}
                            className={`w-10 h-10 rounded-lg border-2 transition-all flex-shrink-0 ${
                              editedCard.cover?.value === colorOption.value
                                ? 'border-white ring-2 ring-offset-1 ring-offset-gray-800 ring-orange-500'
                                : 'border-[#444444] hover:border-gray-500'
                            }`}
                            style={{ backgroundColor: colorOption.value }}
                            title={colorOption.label || colorOption.value}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Gradients */}
                    <div className="mb-4">
                      <p className="text-xs text-[#858585] mb-2">Gradients</p>
                      <div className="flex flex-wrap gap-1.5">
                        {boardColorOptions.filter(c => c.type === 'gradient').map(colorOption => (
                          <button
                            key={colorOption.value}
                            onClick={() => {
                              const coverData: CardCover = { type: 'gradient', value: colorOption.gradient || colorOption.value, size: 'medium' };
                              setEditedCard({ ...editedCard, cover: coverData });
                              setShowCoverPicker(false);
                            }}
                            className={`w-10 h-10 rounded-lg border-2 transition-all flex-shrink-0 ${
                              editedCard.cover?.value === colorOption.value || editedCard.cover?.value === colorOption.gradient
                                ? 'border-white ring-2 ring-offset-1 ring-offset-gray-800 ring-orange-500'
                                : 'border-[#444444] hover:border-gray-500'
                            }`}
                            style={colorOption.gradient ? { background: colorOption.gradient } : {}}
                            title={colorOption.label || colorOption.value}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Uploaded Images */}
                    {((editedCard.attachments?.length || 0) > 0 || (card?.attachments?.length || 0) > 0) && (
                      <div className="mb-4">
                        <p className="text-xs text-[#858585] mb-2">Uploaded Images</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {(editedCard.attachments || card?.attachments || [])
                            .filter((att) => isImageFile(att.type))
                            .map((attachment) => (
                              <button
                                key={attachment.id}
                                onClick={() => handleSetCoverFromAttachment(attachment.id)}
                                className="w-full h-16 sm:h-20 rounded-lg overflow-hidden border-2 border-[#444444] hover:border-orange-500/50 transition-colors relative group"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Image Upload */}
                    <div className="mb-4">
                      <p className="text-xs text-[#858585] mb-2">Upload Image</p>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && isImageFile(file.type)) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imageUrl = event.target?.result as string;
                              const coverData: CardCover = { type: 'image', value: imageUrl, size: 'medium' };
                              setEditedCard({ ...editedCard, cover: coverData });
                              setShowCoverPicker(false);
                              showToast({
                                type: 'success',
                                message: 'Cover image uploaded',
                                duration: 2000,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2 bg-[#333333] hover:bg-[#444444] border border-[#444444] rounded-lg text-sm transition-colors text-white flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Image
                      </button>
                    </div>

                    {/* Emoji Covers */}
                    <div>
                      <p className="text-xs text-[#858585] mb-2">Emoji Covers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {boardIconOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const coverData: CardCover = { type: 'emoji', value: option.value, size: 'large' };
                              setEditedCard({ ...editedCard, cover: coverData });
                              setShowCoverPicker(false);
                            }}
                            className={`w-10 h-10 rounded-lg border-2 transition-all text-xl flex items-center justify-center flex-shrink-0 ${
                              editedCard.cover?.value === option.value
                                ? 'border-orange-500 bg-orange-500/20'
                                : 'border-[#444444] hover:border-gray-500 bg-[#333333]'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* Attachments & Pictures */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
                {((editedCard.attachments?.length || 0) > 0 || (card?.attachments?.length || 0) > 0) && (
                  <span className="text-xs text-[#858585]">
                    ({editedCard.attachments?.length || card?.attachments?.length || 0})
                  </span>
                )}
              </label>

              {/* Attachment List */}
              {((editedCard.attachments?.length || 0) > 0 || (card?.attachments?.length || 0) > 0) && (
                <div className="space-y-2 mb-3">
                  {(editedCard.attachments || card?.attachments || []).map((attachment) => {
                    const isImage = isImageFile(attachment.type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 sm:p-3 bg-[#252526] rounded-lg border border-[#444444] hover:border-[#555555] transition-colors"
                      >
                        {isImage ? (
                          <div
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-[#1e1e1e]"
                            onClick={() => setPreviewImage(attachment.url)}
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-[#1e1e1e] flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#858585]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-white truncate font-medium">{attachment.name}</p>
                          <p className="text-xs text-[#858585]">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          {isImage && (
                            <button
                              onClick={() => handleSetCoverFromAttachment(attachment.id)}
                              className="p-1.5 sm:p-2 text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                              title="Set as cover"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="p-1.5 sm:p-2 text-green-400 hover:bg-green-900/20 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {(isCreateMode || isEditing) && (
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="p-1.5 sm:p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* File Upload Section */}
              {(isCreateMode || isEditing) && (
                <div
                  className="border-2 border-dashed border-[#444444] rounded-lg p-6 text-center hover:border-orange-500/50 transition-colors cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files);
                      }
                    }}
                  />
                  {uploadingFiles ? (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-blue-400 animate-pulse" />
                      <p className="text-sm text-[#858585]">Uploading files...</p>
                      {Object.keys(uploadProgress).length > 0 && (
                        <div className="space-y-1">
                          {Object.entries(uploadProgress).map(([fileId, progress]) => (
                            <div key={fileId} className="w-full bg-[#1e1e1e] rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-[#858585]" />
                      <p className="text-sm text-white">Click or drag files to upload</p>
                      <p className="text-xs text-[#858585]">Images, PDFs, Documents (Max 10MB per file)</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assigned Users */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned To
              </label>

              <div className="space-y-2">
                {(displayData?.assignees || []).map((assignee) => (
                  <div
                    key={assignee.userId}
                    className="flex items-center justify-between p-2 bg-[#333333]/40 border border-[#444444]/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                        {assignee.avatar ? (
                          <img
                            src={assignee.avatar}
                            alt={assignee.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          assignee.displayName?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-sm text-white truncate">
                        {assignee.displayName || 'Unknown User'}
                      </span>
                    </div>
                    {(isCreateMode || isEditing) && (
                      <button
                        onClick={() => handleUnassignUser(assignee.userId)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add User Button */}
                {(isCreateMode || isEditing) && (
                  <>
                    <button
                      onClick={() => setShowUserSearch(!showUserSearch)}
                      className="w-full px-4 py-2 border-2 border-dashed border-[#444444] hover:border-orange-500/50 rounded-lg text-[#858585] hover:text-orange-400 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign User
                    </button>

                    {showUserSearch && (
                      <div className="p-3 bg-[#333333]/40 border border-[#444444]/30 rounded-lg space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="flex-1 px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-[#6e6e6e]"
                          />
                        </div>

                        {filteredUsers.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {filteredUsers.map((user) => (
                              <button
                                key={user.userId}
                                onClick={() => handleAssignUser(user)}
                                className="w-full flex items-center gap-2 p-2 bg-[#252526] hover:bg-[#333333] rounded text-left transition-colors"
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-xs text-white">
                                  {user.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {user.displayName}
                                  </p>
                                  <p className="text-xs text-[#858585] truncate">{user.email}</p>
                                </div>
                                <Plus className="w-4 h-4 text-orange-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Checklists */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Checklists ({(displayData?.checklists || []).length})
              </label>

              <div className="space-y-3">
                {(displayData?.checklists || []).map((checklist) => (
                  <div key={checklist.id} className="p-3 bg-[#333333]/40 border border-[#444444]/30 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">{checklist.title}</h4>
                    <div className="space-y-1">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={!isEditing && !isCreateMode}
                            className="w-4 h-4 rounded border-[#444444] text-orange-500 focus:ring-2 focus:ring-orange-500"
                          />
                          <span
                            className={`text-sm ${
                              item.completed ? 'line-through text-[#6e6e6e]' : 'text-[#a0a0a0]'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {(isCreateMode || isEditing) && (
                  <>
                    {showChecklistForm ? (
                      <div className="p-3 bg-[#333333]/40 border border-[#444444]/30 rounded-lg space-y-2">
                        <input
                          type="text"
                          value={newChecklistTitle}
                          onChange={(e) => setNewChecklistTitle(e.target.value)}
                          placeholder="Checklist title..."
                          className="w-full px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-[#6e6e6e]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddChecklist}
                            className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-700 text-white rounded text-sm transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowChecklistForm(false);
                              setNewChecklistTitle('');
                            }}
                            className="px-3 py-1 bg-[#333333] hover:bg-[#444444] text-white rounded text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowChecklistForm(true)}
                        className="w-full px-4 py-2 border-2 border-dashed border-[#444444] hover:border-orange-500/50 rounded-lg text-[#858585] hover:text-orange-400 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Checklist
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Time Logs Section */}
            {!isCreateMode && (
              <div className="pt-4 border-t border-[#3c3c3c]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Logs ({(card?.timeLogs || []).length})
                  </label>
                  <button 
                    onClick={() => setLogTimeModalOpen(true)}
                    className="text-[10px] font-bold text-[#ea580c] hover:underline"
                  >
                    + Log Time
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(card?.timeLogs || []).map((log) => (
                    <div key={log.id} className="p-3 bg-[#1e1e1e]/50 border border-[#3c3c3c] rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-[#cccccc]">{log.userName}</p>
                          <p className="text-[11px] text-[#858585] mt-0.5">{log.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-[#ea580c]">{log.hours}h</span>
                          <p className="text-[9px] text-[#585858] mt-0.5">{log.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(card?.timeLogs || []).length === 0 && (
                    <p className="text-xs text-[#585858] italic text-center py-2">No time logged for this task.</p>
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp Integration Section */}
            {!isCreateMode && (
              <div className="pt-4 border-t border-[#3c3c3c] mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    WhatsApp Workbot
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[#858585]">
                      {card?.enableWhatsApp ? "Connected" : "Disconnected"}
                    </span>
                    <button
                      onClick={() => {
                        if (card) {
                          kanbanService.toggleCardWhatsApp(boardId, card.id, !card.enableWhatsApp).then(() => loadCard());
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        card?.enableWhatsApp ? "bg-green-600" : "bg-[#3c3c3c]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          card?.enableWhatsApp ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-green-900/10 border border-green-500/20 p-2.5 mb-3">
                  <p className="text-[10px] text-green-400 font-medium leading-snug">
                    When enabled, the system automatically sends status updates and due-date reminders to assignees via WhatsApp.
                  </p>
                </div>

                {/* Admin Message Action */}
                {user?.role === "ADMIN" && (
                  <button
                    onClick={() => {
                      const msg = prompt("Message to send via WhatsApp:");
                      if (msg && card) {
                        // Send to the first assignee for this demo
                        const targetId = card.assignees[0]?.userId;
                        if (targetId) {
                          kanbanService.sendWhatsAppMessage(boardId, card.id, targetId, msg).then(() => loadCard());
                        } else {
                          alert("No assignee found to receive the message.");
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600/20 py-2 text-xs font-bold text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-all mb-4"
                  >
                    <MessageSquare size={14} />
                    Send Admin Alert via WhatsApp
                  </button>
                )}

                {/* Notification Feed */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {(card?.notifications || []).slice().reverse().map((note: any) => (
                    <div key={note.id} className="p-2.5 bg-[#161616]/40 border border-[#3c3c3c] rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[9px] font-bold uppercase ${
                          note.type === 'admin_manual' ? 'text-blue-400' : 'text-green-500'
                        }`}>
                          {note.type.replace('_', ' ')}
                        </span>
                        <span className="text-[8px] font-mono text-[#585858]">
                          {new Date(note.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#cccccc] leading-relaxed">"{note.message}"</p>
                      <p className="text-[8px] text-[#585858] mt-1">To: {note.recipientPhone}</p>
                    </div>
                  ))}
                  {(card?.notifications || []).length === 0 && (
                    <p className="text-xs text-[#585858] italic text-center py-2">No WhatsApp logs yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Linked Source (Note/Task) */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Linked Source
              </label>
              
              {/* Display existing links */}
              {((!isCreateMode && card && card.metadata && (card.metadata.noteId || card.metadata.taskIds || card.metadata.taskId || card.metadata.taskListId || card.metadata.fileId || card.metadata.calendarEventId)) ||
                (isCreateMode && editedCard.metadata && (editedCard.metadata.noteId || editedCard.metadata.taskIds || editedCard.metadata.taskId || editedCard.metadata.taskListId || editedCard.metadata.fileId || editedCard.metadata.calendarEventId))) && (
                <div className="p-3 bg-[#333333]/40 border border-[#444444]/30 rounded-lg space-y-2 mb-2">
                  {((!isCreateMode && card?.metadata?.noteId) || (isCreateMode && editedCard.metadata?.noteId)) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white">
                          {!isCreateMode && card?.metadata?.noteId
                            ? notesService.getNote(card.metadata.noteId)?.title || 'Linked Note'
                            : isCreateMode && editedCard.metadata?.noteId
                            ? notesService.getNote(editedCard.metadata.noteId)?.title || 'Linked Note'
                            : 'Linked Note'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="/notes"
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {(isCreateMode || isEditing) && (
                          <button
                            onClick={handleUnlinkNote}
                            className="text-sm text-red-400 hover:text-red-300"
                            title="Unlink note"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {((!isCreateMode && card?.metadata?.taskListId) || (isCreateMode && editedCard.metadata?.taskListId)) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-white">
                          {!isCreateMode && card?.metadata?.taskListId
                            ? tasksService.getTaskList(card.metadata.taskListId)?.title || 'Linked Task List'
                            : isCreateMode && editedCard.metadata?.taskListId
                            ? tasksService.getTaskList(editedCard.metadata.taskListId)?.title || 'Linked Task List'
                            : 'Linked Task List'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="/tasks"
                          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {(isCreateMode || isEditing) && (
                          <button
                            onClick={handleUnlinkTaskList}
                            className="text-sm text-red-400 hover:text-red-300"
                            title="Unlink task list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {((!isCreateMode && card?.metadata?.fileId) || (isCreateMode && editedCard.metadata?.fileId)) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-white">
                          {!isCreateMode && card?.metadata?.fileId
                            ? driveService.getFile(card.metadata.fileId)?.name || 'Linked File'
                            : isCreateMode && editedCard.metadata?.fileId
                            ? driveService.getFile(editedCard.metadata.fileId)?.name || 'Linked File'
                            : 'Linked File'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="/storage"
                          className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {(isCreateMode || isEditing) && (
                          <button
                            onClick={handleUnlinkFile}
                            className="text-sm text-red-400 hover:text-red-300"
                            title="Unlink file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {((!isCreateMode && card?.metadata?.calendarEventId) || (isCreateMode && editedCard.metadata?.calendarEventId)) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-white">
                          {!isCreateMode && card?.metadata?.calendarEventId
                            ? calendarService.getEvent(card.metadata.calendarEventId)?.title || 'Linked Calendar Event'
                            : isCreateMode && editedCard.metadata?.calendarEventId
                            ? calendarService.getEvent(editedCard.metadata.calendarEventId)?.title || 'Linked Calendar Event'
                            : 'Linked Calendar Event'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="/calendar"
                          className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {(isCreateMode || isEditing) && (
                          <button
                            onClick={handleUnlinkCalendar}
                            className="text-sm text-red-400 hover:text-red-300"
                            title="Unlink calendar event"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Display attached tasks */}
                  {(() => {
                    const taskIds = !isCreateMode && card?.metadata?.taskIds 
                      ? card.metadata.taskIds 
                      : isCreateMode && editedCard.metadata?.taskIds 
                      ? editedCard.metadata.taskIds 
                      : (!isCreateMode && card?.metadata?.taskId) || (isCreateMode && editedCard.metadata?.taskId)
                      ? [card?.metadata?.taskId || editedCard.metadata?.taskId].filter(Boolean) as string[]
                      : [];
                    
                    return (taskIds as string[]).length > 0 && (taskIds as string[]).map((taskId) => {
                      const task = tasksService.getTask(taskId);
                      if (!task) return null;
                      
                      return (
                        <div key={taskId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-white">
                              {task.title || 'Linked Task'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href="/tasks"
                              className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {(isCreateMode || isEditing) && (
                              <button
                                onClick={() => handleUnlinkTask(taskId)}
                                className="text-sm text-red-400 hover:text-red-300"
                                title="Unlink task"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Development Workflow Link */}
              {(isCreateMode || isEditing) && (
                <div>
                  <DevelopmentWorkflowSelector
                    selectedPhase={selectedDevelopmentPhase}
                    onPhaseChange={setSelectedDevelopmentPhase}
                  />
                </div>
              )}

              {/* Link Note/Task/File buttons (only in create/edit mode) */}
              {(isCreateMode || isEditing) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setShowLinkNote(!showLinkNote);
                      setShowLinkTask(false);
                      setShowLinkFile(false);
                    }}
                    disabled={!!((!isCreateMode && card?.metadata?.noteId) || (isCreateMode && editedCard.metadata?.noteId))}
                    className="flex-1 px-4 py-2 border-2 border-dashed border-[#444444] hover:border-blue-500/50 rounded-lg text-[#858585] hover:text-blue-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {(!isCreateMode && card?.metadata?.noteId) || (isCreateMode && editedCard.metadata?.noteId)
                        ? 'Note Linked'
                        : 'Link Note'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkTask(!showLinkTask);
                      setShowLinkNote(false);
                      setShowLinkFile(false);
                    }}
                    className="flex-1 px-4 py-2 border-2 border-dashed border-[#444444] hover:border-green-500/50 rounded-lg text-[#858585] hover:text-green-400 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {(() => {
                        const taskIds = !isCreateMode && card?.metadata?.taskIds 
                          ? card.metadata.taskIds 
                          : isCreateMode && editedCard.metadata?.taskIds 
                          ? editedCard.metadata.taskIds 
                          : (!isCreateMode && card?.metadata?.taskId) || (isCreateMode && editedCard.metadata?.taskId)
                          ? [card?.metadata?.taskId || editedCard.metadata?.taskId].filter(Boolean) as string[]
                          : [];
                        return taskIds.length > 0 ? `Attach Task (${taskIds.length})` : 'Attach Task';
                      })()}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkFile(!showLinkFile);
                      setShowLinkNote(false);
                      setShowLinkTask(false);
                      setShowLinkCalendar(false);
                    }}
                    disabled={!!((!isCreateMode && card?.metadata?.fileId) || (isCreateMode && editedCard.metadata?.fileId))}
                    className="flex-1 px-4 py-2 border-2 border-dashed border-[#444444] hover:border-orange-500/50 rounded-lg text-[#858585] hover:text-orange-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Folder className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {(!isCreateMode && card?.metadata?.fileId) || (isCreateMode && editedCard.metadata?.fileId)
                        ? 'File Linked'
                        : 'Link File'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkCalendar(!showLinkCalendar);
                      setShowLinkNote(false);
                      setShowLinkTask(false);
                      setShowLinkFile(false);
                    }}
                    disabled={!!((!isCreateMode && card?.metadata?.calendarEventId) || (isCreateMode && editedCard.metadata?.calendarEventId))}
                    className="flex-1 px-4 py-2 border-2 border-dashed border-[#444444] hover:border-orange-500/50 rounded-lg text-[#858585] hover:text-orange-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {(!isCreateMode && card?.metadata?.calendarEventId) || (isCreateMode && editedCard.metadata?.calendarEventId)
                        ? 'Event Linked'
                        : 'Link Event'}
                    </span>
                  </button>
                </div>
              )}

              {/* Note Search/Select */}
              {showLinkNote && (isCreateMode || isEditing) && (
                <div className="mt-3 p-4 bg-[#252526] border border-[#444444] rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
                      <input
                        type="text"
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-10 pr-3 py-2 bg-[#1e1e1e] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-[#6e6e6e]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowLinkNote(false);
                        setNoteSearchQuery('');
                      }}
                      className="px-3 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {filteredNotes.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredNotes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => handleLinkNote(note.id)}
                          className="w-full flex items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#333333] rounded text-left"
                        >
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{note.title}</p>
                            <p className="text-xs text-[#858585] truncate">
                              {note.content.substring(0, 50)}...
                            </p>
                          </div>
                          <LinkIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#858585] text-center py-2">No notes found</p>
                  )}
                </div>
              )}

              {/* Task Search/Select */}
              {showLinkTask && (isCreateMode || isEditing) && (
                <div className="mt-3 p-4 bg-[#333333]/40 border border-[#444444]/30 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="w-full pl-10 pr-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-[#6e6e6e]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowLinkTask(false);
                        setTaskSearchQuery('');
                      }}
                      className="px-3 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {filteredTasks.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => handleLinkTask(task.id)}
                          className="w-full flex items-center gap-2 p-2 bg-[#252526] hover:bg-[#333333] rounded text-left transition-colors"
                        >
                          <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{task.title}</p>
                            <p className="text-xs text-[#858585] truncate">
                              {task.description?.substring(0, 50) || 'No description'}...
                            </p>
                          </div>
                          <LinkIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#858585] text-center py-2">No tasks found</p>
                  )}
                </div>
              )}

              {/* File Search/Select */}
              {showLinkFile && (isCreateMode || isEditing) && (
                <div className="mt-3 p-4 bg-[#252526] border border-[#444444] rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
                      <input
                        type="text"
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        placeholder="Search files..."
                        className="w-full pl-10 pr-3 py-2 bg-[#1e1e1e] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-[#6e6e6e]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowLinkFile(false);
                        setFileSearchQuery('');
                      }}
                      className="px-3 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {filteredFiles.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleLinkFile(file.id)}
                          className="w-full flex items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#333333] rounded text-left"
                        >
                          <Folder className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{file.name}</p>
                            <p className="text-xs text-[#858585] truncate">
                              {file.path} {file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : ''}
                            </p>
                          </div>
                          <LinkIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#858585] text-center py-2">No files found</p>
                  )}
                </div>
              )}

              {/* Calendar Event Search/Select */}
              {showLinkCalendar && (isCreateMode || isEditing) && (
                <div className="mt-3 p-4 bg-[#252526] border border-[#444444] rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
                      <input
                        type="text"
                        value={calendarSearchQuery}
                        onChange={(e) => setCalendarSearchQuery(e.target.value)}
                        placeholder="Search calendar events..."
                        className="w-full pl-10 pr-3 py-2 bg-[#1e1e1e] border border-[#444444] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-[#6e6e6e]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowLinkCalendar(false);
                        setCalendarSearchQuery('');
                      }}
                      className="px-3 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {filteredCalendarEvents.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredCalendarEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleLinkCalendar(event.id)}
                          className="w-full flex items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#333333] rounded text-left"
                        >
                          <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{event.title}</p>
                            <p className="text-xs text-[#858585] truncate">
                              {event.startTime ? new Date(event.startTime).toLocaleString() : ''} - {event.endTime ? new Date(event.endTime).toLocaleString() : ''}
                            </p>
                          </div>
                          <LinkIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#858585] text-center py-2">No calendar events found</p>
                  )}
                </div>
              )}
            </div>

            {/* Comments - Only show in edit mode */}
            {!isCreateMode && card && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({(card.comments || []).length})
                </label>

                <div className="space-y-3 mb-3">
                  {(card.comments || []).map((comment) => (
                    <div key={comment.id} className="p-3 bg-[#252526] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{comment.userName || 'Unknown User'}</span>
                        <span className="text-xs text-[#858585]">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[#a0a0a0]">{comment.content || ''}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 bg-[#252526] border border-[#444444] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-[#6e6e6e]"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        {/* Log Activity Modal */}
      <WorkLogActivityModal
        isOpen={logTimeModalOpen}
        onClose={() => setLogTimeModalOpen(false)}
        cards={allCards}
        initialCardId={cardId}
        appearanceDark={true}
        onLog={async (targetCardId, hours, description, date) => {
          if (!boardId) return;
          await kanbanService.addCardTimeLog(boardId, targetCardId, {
            userId: user?.id || 'demo-user',
            userName: user?.name || 'User',
            hours,
            description,
            date,
          });
          loadCard();
          if (onUpdated) onUpdated();
        }}
      />
    </>
  );
};

export default CardView;
