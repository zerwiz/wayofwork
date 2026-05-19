/**
 * Dashboard / Command Center Page
 * Main landing page with overview cards and quick access
 * WHN Chat design system
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MessageSquare,
  BookOpen,
  KanbanSquare,
  FolderOpen,
  Mail,
  Clock,
  Settings,
  LayoutGrid,
} from 'lucide-react';
import DashboardSettingsModal, { 
  ALL_DASHBOARD_CARDS, 
  DEFAULT_VISIBLE_CARDS,
  ALL_QUICK_ACTIONS,
  DEFAULT_QUICK_ACTIONS,
} from '../components/dashboard/DashboardSettingsModal';
import { useToast } from '../contexts/ToastContext';

const STORAGE_KEY = 'dashboard_visible_cards';
const QUICK_ACTIONS_STORAGE_KEY = 'dashboard_quick_actions';

export default function Dashboard() {
  const [visibleCards, setVisibleCards] = useState<string[]>(DEFAULT_VISIBLE_CARDS);
  const [visibleQuickActions, setVisibleQuickActions] = useState<string[]>(DEFAULT_QUICK_ACTIONS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { showToast } = useToast();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVisibleCards(parsed);
      } catch (error) {
        console.error('Failed to load dashboard preferences:', error);
      }
    }

    const savedQuickActions = localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY);
    if (savedQuickActions) {
      try {
        const parsed = JSON.parse(savedQuickActions);
        setVisibleQuickActions(parsed);
      } catch (error) {
        console.error('Failed to load quick actions preferences:', error);
      }
    }
  }, []);

  // Mock data - will be replaced with real data from services
  const upcomingEvents = [
    { id: '1', title: 'Team Meeting', time: '10:00 AM', date: 'Today' },
    { id: '2', title: 'Project Review', time: '2:00 PM', date: 'Today' },
  ];

  const recentChats = [
    { id: '1', title: 'Project Planning', preview: 'Let me help you plan...', time: '2m ago' },
    { id: '2', title: 'Code Review', preview: 'I found an issue...', time: '1h ago' },
  ];

  const handleSaveSettings = (cards: string[]) => {
    setVisibleCards(cards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    showToast({
      type: 'success',
      message: 'Dashboard updated',
      description: 'Your dashboard preferences have been saved',
      duration: 2000,
    });
  };

  const handleSaveQuickActions = (quickActions: string[]) => {
    setVisibleQuickActions(quickActions);
    localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(quickActions));
    showToast({
      type: 'success',
      message: 'Quick Actions updated',
      description: 'Your quick actions preferences have been saved',
      duration: 2000,
    });
  };

  // Drag and drop handlers (similar to Kanban board)
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setIsDragging(true);
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    // Small delay to prevent click event after drag
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
    setDraggedCard(null);
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedCard) return;

    const draggedIndex = visibleCards.indexOf(draggedCard);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedCard(null);
      setDraggedOverIndex(null);
      return;
    }

    // Reorder cards
    const newCards = [...visibleCards];
    const [removed] = newCards.splice(draggedIndex, 1);
    newCards.splice(dropIndex, 0, removed);

    setVisibleCards(newCards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    
    showToast({
      type: 'success',
      message: 'Card position updated',
      duration: 2000,
    });

    setDraggedCard(null);
    setDraggedOverIndex(null);
  };

  // Prevent navigation if dragging
  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging || draggedCard) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Render card component based on card ID
  const renderCard = (cardId: string) => {
    const cardConfig = ALL_DASHBOARD_CARDS.find((c) => c.id === cardId);
    if (!cardConfig) return null;

    const Icon = cardConfig.icon;

    // Schedule Card
    if (cardId === 'schedule') {
      return (
        <Link
          to="/app/calendar"
          onClick={handleCardClick}
          className="card bg-blue-600/5 border-blue-600/20 hover:border-blue-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Schedule</h3>
            </div>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded flex-shrink-0 ml-2">
              {upcomingEvents.length} events
            </span>
          </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-blue-300/80">Upcoming events</p>
            {upcomingEvents.length > 0 ? (
              <>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{upcomingEvents[0].title}</p>
                    <p className="text-blue-300/70 text-xs">{upcomingEvents[0].date} at {upcomingEvents[0].time}</p>
                  </div>
                </div>
                {upcomingEvents.length > 1 && (
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{upcomingEvents[1].title}</p>
                      <p className="text-blue-300/70 text-xs">{upcomingEvents[1].date} at {upcomingEvents[1].time}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-blue-300/70">No upcoming events</p>
                <p className="text-xs sm:text-sm text-blue-300/50">Schedule is clear</p>
              </>
            )}
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            View Calendar
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      );
    }

    // AI Chat Card
    if (cardId === 'ai_chat') {
      return (
        <Link
          to="/app/chat"
          onClick={handleCardClick}
          className="card bg-purple-600/5 border-purple-600/20 hover:border-purple-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">AI Chat</h3>
            </div>
            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded flex-shrink-0 ml-2">
              {recentChats.length} recent
            </span>
          </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-purple-300/80">Recent conversations</p>
            {recentChats.length > 0 ? (
              <>
                <div className="text-xs sm:text-sm">
                  <p className="text-white truncate">{recentChats[0].title}</p>
                  <p className="text-purple-300/70 text-xs truncate">{recentChats[0].preview}</p>
                  <p className="text-purple-300/50 text-xs mt-1">{recentChats[0].time}</p>
                </div>
                {recentChats.length > 1 && (
                  <div className="text-xs sm:text-sm">
                    <p className="text-white truncate">{recentChats[1].title}</p>
                    <p className="text-purple-300/70 text-xs truncate">{recentChats[1].preview}</p>
                    <p className="text-purple-300/50 text-xs mt-1">{recentChats[1].time}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-purple-300/70">No recent chats</p>
                <p className="text-xs sm:text-sm text-purple-300/50">Start a new conversation</p>
              </>
            )}
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            New Chat
          </button>
        </Link>
      );
    }

    // Knowledge Base Card
    if (cardId === 'knowledge_base') {
      return (
        <Link
          to="/app/knowledge-base"
          onClick={handleCardClick}
          className="card bg-green-600/5 border-green-600/20 hover:border-green-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white truncate">Knowledge Base</h3>
          </div>
          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded flex-shrink-0 ml-2">
            12 docs
          </span>
        </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-green-300/80">Recent documents</p>
            <p className="text-xs sm:text-sm text-green-300/70">Company Handbook</p>
            <p className="text-xs sm:text-sm text-green-300/70">Project Guidelines</p>
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            Browse Knowledge Base
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      );
    }

    // Kanban / Tasks Card
    if (cardId === 'kanban') {
      return (
        <Link
          to="/app/kanban"
          onClick={handleCardClick}
          className="card bg-orange-600/5 border-orange-600/20 hover:border-orange-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-600/20 flex items-center justify-center flex-shrink-0">
                <KanbanSquare className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Kanban / Tasks</h3>
            </div>
            <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-1 rounded flex-shrink-0 ml-2">
              5 active
            </span>
          </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-orange-300/80">Recent tasks</p>
            <p className="text-xs sm:text-sm text-orange-300/70">Fix login bug</p>
            <p className="text-xs sm:text-sm text-orange-300/70">Update documentation</p>
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            View Kanban Board
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      );
    }

    // Storage Card
    if (cardId === 'storage') {
      return (
        <Link
          to="/app/workspace/drive"
          onClick={handleCardClick}
          className="card bg-purple-600/5 border-purple-600/20 hover:border-purple-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">File Storage</h3>
            </div>
            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded flex-shrink-0 ml-2">
              24 files
            </span>
          </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-purple-300/80">Storage locations</p>
            <p className="text-xs sm:text-sm text-purple-300/70">WorkFlowSpace Drive</p>
            <p className="text-xs sm:text-sm text-purple-300/70">Google Drive</p>
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            View Files
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      );
    }

    // Google Workspace Card (combined)
    if (cardId === 'google_workspace') {
      return (
        <Link
          to="/app/workspace/gmail"
          onClick={handleCardClick}
          className="card bg-blue-600/5 border-blue-600/20 hover:border-blue-500/50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Google Workspace</h3>
            </div>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded flex-shrink-0 ml-2">
              Synced
            </span>
          </div>
          <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
            <p className="text-xs sm:text-sm text-blue-300/80">Recent activity</p>
            <p className="text-xs sm:text-sm text-blue-300/70">3 new emails</p>
            <p className="text-xs sm:text-sm text-blue-300/70">2 calendar events</p>
          </div>
          <button className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]">
            Open Workspace
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      );
    }

    // Generic card for other options
    const colorMap: Record<string, { bg: string; border: string; iconBg: string; iconColor: string; button: string }> = {
      notes: { bg: 'bg-green-600/5', border: 'border-green-600/20', iconBg: 'bg-green-600/20', iconColor: 'text-green-400', button: 'from-green-600 to-emerald-500' },
      tasks: { bg: 'bg-orange-600/5', border: 'border-orange-600/20', iconBg: 'bg-orange-600/20', iconColor: 'text-orange-400', button: 'from-orange-600 to-amber-500' },
      workflows: { bg: 'bg-purple-600/5', border: 'border-purple-600/20', iconBg: 'bg-purple-600/20', iconColor: 'text-purple-400', button: 'from-purple-600 to-pink-600' },
      company_schedule: { bg: 'bg-blue-600/5', border: 'border-blue-600/20', iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400', button: 'from-blue-600 to-blue-500' },
      company_projects: { bg: 'bg-indigo-600/5', border: 'border-indigo-600/20', iconBg: 'bg-indigo-600/20', iconColor: 'text-indigo-400', button: 'from-indigo-600 to-indigo-500' },
      profile: { bg: 'bg-pink-600/5', border: 'border-pink-600/20', iconBg: 'bg-pink-600/20', iconColor: 'text-pink-400', button: 'from-pink-600 to-pink-500' },
      google_calendar: { bg: 'bg-blue-600/5', border: 'border-blue-600/20', iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400', button: 'from-blue-600 to-blue-500' },
      gmail: { bg: 'bg-red-600/5', border: 'border-red-600/20', iconBg: 'bg-red-600/20', iconColor: 'text-red-400', button: 'from-red-600 to-red-500' },
      google_chat: { bg: 'bg-green-600/5', border: 'border-green-600/20', iconBg: 'bg-green-600/20', iconColor: 'text-green-400', button: 'from-green-600 to-emerald-500' },
      google_drive: { bg: 'bg-yellow-600/5', border: 'border-yellow-600/20', iconBg: 'bg-yellow-600/20', iconColor: 'text-yellow-400', button: 'from-yellow-600 to-yellow-500' },
      google_docs: { bg: 'bg-blue-600/5', border: 'border-blue-600/20', iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400', button: 'from-blue-600 to-blue-500' },
    };

    const colors = colorMap[cardId] || { bg: 'bg-gray-600/5', border: 'border-gray-600/20', iconBg: 'bg-gray-600/20', iconColor: 'text-gray-400', button: 'from-gray-600 to-gray-500' };

    return (
      <Link
        to={cardConfig.path || '#'}
        onClick={handleCardClick}
        className={`card ${colors.bg} ${colors.border} hover:border-opacity-50 transition-colors cursor-pointer group flex flex-col h-full min-h-[280px]`}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.iconColor}`} />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white truncate">{cardConfig.name}</h3>
          </div>
        </div>
        <div className="space-y-2 flex-1 mb-3 sm:mb-4 min-h-[72px]">
          <p className="text-xs sm:text-sm text-gray-400/80">Quick access</p>
          <p className="text-xs sm:text-sm text-gray-400/70">Open {cardConfig.name.toLowerCase()}</p>
          <p className="text-xs sm:text-sm text-gray-400/50">View all features</p>
        </div>
        <button className={`w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r ${colors.button} hover:opacity-90 text-white rounded-lg transition-all font-medium shadow-lg hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px]`}>
          Open {cardConfig.name}
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </Link>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:pl-4 sm:pr-2 py-4 lg:pl-6 lg:pr-2 lg:py-8">
      {/* Page Header */}
      <div className="mb-4 sm:mb-8 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Dashboard / Command Center</h1>
          <p className="text-xs sm:text-sm text-dark-300">Overview of all your activities and quick access to features</p>
        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Customize Dashboard"
          aria-label="Customize Dashboard"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {visibleCards.length > 0 ? (
          visibleCards.map((cardId, index) => (
            <div
              key={cardId}
              draggable
              onDragStart={(e) => handleDragStart(e, cardId)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`transition-all cursor-move ${
                draggedCard === cardId ? 'opacity-40' : ''
              } ${
                draggedOverIndex === index && draggedCard !== cardId ? 'scale-105' : ''
              }`}
            >
              {renderCard(cardId)}
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
            <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg mb-2">No cards selected</p>
            <p className="text-sm mb-4">Customize your dashboard to see your cards</p>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-95"
            >
              Customize Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      {visibleQuickActions.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {visibleQuickActions.map((actionId) => {
              const action = ALL_QUICK_ACTIONS.find((a) => a.id === actionId);
              if (!action) return null;

              const Icon = action.icon;
              const colorGradients = {
                purple: 'from-purple-500 to-pink-500',
                blue: 'from-blue-500 to-purple-500',
                orange: 'from-orange-500 to-pink-500',
                green: 'from-green-500 to-blue-500',
                indigo: 'from-indigo-500 to-purple-500',
              };
              const shadowColors = {
                purple: 'shadow-purple-500/20 group-hover:shadow-purple-500/50',
                blue: 'shadow-blue-500/20 group-hover:shadow-blue-500/50',
                orange: 'shadow-orange-500/20 group-hover:shadow-orange-500/50',
                green: 'shadow-green-500/20 group-hover:shadow-green-500/50',
                indigo: 'shadow-indigo-500/20 group-hover:shadow-indigo-500/50',
              };

              return (
                <Link
                  key={actionId}
                  to={action.path}
                  className={`card text-center hover:bg-dark-700 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-lg ${shadowColors[action.color as keyof typeof shadowColors]} min-h-[44px] flex flex-col items-center justify-center p-3 sm:p-4`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg bg-gradient-to-br ${colorGradients[action.color as keyof typeof colorGradients]} flex items-center justify-center shadow-lg transition-shadow`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm text-white font-medium">{action.name}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Settings Modal */}
      <DashboardSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        visibleCards={visibleCards}
        onSave={handleSaveSettings}
        visibleQuickActions={visibleQuickActions}
        onSaveQuickActions={handleSaveQuickActions}
      />
    </div>
  );
}
