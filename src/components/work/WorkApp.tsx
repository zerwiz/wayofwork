import { useState, useEffect, useMemo, useCallback } from "react";
import { Briefcase, Calendar, CheckCircle2, Clock, Users, User, Layout, MessageSquare, AlertCircle, X, List, CalendarDays } from "lucide-react";
import { kanbanService } from "../../services/mockKanbanService";
import type { BoardCard } from "../../types/kanban";
import { CardView } from "../kanban/CardView";
import { WorkLogActivityModal } from "./WorkLogActivityModal";
import { WorkTimeCalendar } from "./WorkTimeCalendar";

interface WorkContact {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export function WorkApp({ uiMode, setUiMode }: { uiMode: string; setUiMode: (m: string) => void }) {
  const [activeTab, setActiveTab] = useState<"time" | "tasks" | "contacts">("tasks");
  const [isLeader, setIsLeader] = useState(false);
  const [timeView, setTimeView] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Card View Modal State
  const [selectedCard, setSelectedCard] = useState<{ boardId: string; cardId: string } | null>(null);
  const [cardViewOpen, setCardViewOpen] = useState(false);
  
  // Log Activity Modal State
  const [logActivityOpen, setCardLogActivityOpen] = useState(false);
  const [preselectedCardId, setPreselectedCardId] = useState<string | null>(null);

  // Real data from APIs
  const [contacts, setContacts] = useState<WorkContact[]>([]);
  const [allCards, setAllCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    const token = localStorage.getItem("wop_token");
    if (!token) return null;
    try {
      const payload = token.includes(".") ? atob(token.split(".")[1]!) : atob(token);
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("wop_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [contactsRes, boards] = await Promise.all([
        fetch("/api/admin/users", { headers }), // For contacts, we use admin users endpoint
        kanbanService.getAllBoards(),
      ]);
      
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.map((u: any) => ({
          id: u.id,
          name: u.username,
          phone: u.phone || "N/A",
          role: u.role,
        })));
      }

      // Fetch all cards from all boards
      const allCardsNested = await Promise.all(boards.map(b => kanbanService.getAllCardsForBoard(b.id)));
      setAllCards(allCardsNested.flat());
      
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogActivity = async (cardId: string, hours: number, description: string, date: string) => {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;
    
    await kanbanService.addCardTimeLog(card.boardId, card.id, {
      userId: user?.id || 'demo-user',
      userName: user?.name || 'User',
      hours,
      description,
      date,
    });
    await loadData();
  };

  const openLogModal = (cardId?: string) => {
    setPreselectedCardId(cardId || null);
    setCardLogActivityOpen(true);
  };

  // Derive Time Entries from Cards
  const timeLogs = useMemo(() => {
    const logs: Array<{ 
      id: string; 
      workerName: string; 
      date: string; 
      hours: number; 
      project: string; 
      description: string;
      cardTitle: string;
      userId: string;
    }> = [];

    allCards.forEach(card => {
      if (card.timeLogs) {
        card.timeLogs.forEach(log => {
          // If not leader, only show your own logs
          if (!isLeader && log.userId !== user?.id) return;

          logs.push({
            id: log.id,
            workerName: log.userName,
            date: log.date,
            hours: log.hours,
            project: card.boardId, // Board is used as project proxy
            description: log.description,
            cardTitle: card.title,
            userId: log.userId,
          });
        });
      }
    });

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allCards, isLeader, user?.id]);

  const filteredCards = useMemo(() => {
    if (!user) return [];
    const userId = user.id;
    const userRole = user.role;

    // Show cards assigned to this user, OR if admin, show all 'admin' tagged cards
    return allCards.filter(card => {
      const isAssigned = (card.assignees || []).some(a => a.userId === userId);
      const isAdminTask = userRole === "ADMIN" && (card.tags || []).includes("admin");
      return isAssigned || isAdminTask;
    });
  }, [allCards, user]);

  const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "text-red-400 bg-red-900/20 border-red-500/30";
      case "high": return "text-orange-400 bg-orange-900/20 border-orange-500/30";
      case "medium": return "text-blue-400 bg-blue-900/20 border-blue-500/30";
      default: return "text-zinc-400 bg-zinc-900/20 border-zinc-500/30";
    }
  };

  const appearanceDark = true;
  const border = "border-[#3c3c3c]";
  const panelBg = "bg-[#252526]";

  return (
    <div className="work-mode flex h-full flex-col bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-[#fb923c]" />
            <span className="text-sm font-semibold tracking-tighter text-[#cccccc]">WORK MODE</span>
            {isLeader && (
              <span className="rounded bg-blue-900/30 px-2 py-0.5 text-xs text-blue-400">
                Leader Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLeader(!isLeader)}
            className="rounded px-3 py-1.5 text-xs text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] transition-colors"
          >
            {isLeader ? "Switch to Worker Mode" : "Switch to Leader Mode"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#3c3c3c] bg-[#252526] px-4">
        {(["time", "tasks", "contacts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            {tab === "time" && (
              <>
                <Clock size={14} />
                <span>TIME LOGS ({timeLogs.length})</span>
              </>
            )}
            {tab === "tasks" && (
              <>
                <CheckCircle2 size={14} />
                <span>MY TASKS ({filteredCards.length})</span>
              </>
            )}
            {tab === "contacts" && (
              <>
                <Users size={14} />
                <span>TEAM</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[#858585] animate-pulse">Loading...</div>
        ) : (
          <>
            {/* Time Entries Tab */}
            {activeTab === "time" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-[#cccccc]">Detailed Activity Logs</h2>
                    <p className="text-xs text-[#858585]">Track time spent on project planning tasks.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 rounded-lg border ${border} bg-[#1e1e1e] p-1`}>
                      <button 
                        onClick={() => setTimeView("list")}
                        className={`rounded px-2 py-1 text-[10px] font-bold transition-all ${timeView === "list" ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"}`}
                      >
                        <List size={14} className="inline mr-1" />
                        List
                      </button>
                      <button 
                        onClick={() => setTimeView("calendar")}
                        className={`rounded px-2 py-1 text-[10px] font-bold transition-all ${timeView === "calendar" ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"}`}
                      >
                        <CalendarDays size={14} className="inline mr-1" />
                        Calendar
                      </button>
                    </div>
                    {!isLeader && (
                      <button 
                        onClick={() => openLogModal()}
                        className="rounded bg-[#ea580c] px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#ea580c]/20 hover:bg-[#c2410c] transition-colors"
                      >
                        + Log Activity
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`rounded-xl border ${border} ${panelBg} p-4 text-center shadow-sm`}>
                    <p className="text-2xl font-black text-orange-400">{timeLogs.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#585858]">Total Logs</p>
                  </div>
                  <div className={`rounded-xl border ${border} ${panelBg} p-4 text-center shadow-sm`}>
                    <p className="text-2xl font-black text-green-400">{totalHours}h</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#585858]">Logged Hours</p>
                  </div>
                  <div className={`rounded-xl border ${border} ${panelBg} p-4 text-center shadow-sm`}>
                    <p className="text-2xl font-black text-blue-400">{new Set(timeLogs.map(l => l.project)).size}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#585858]">Active Projects</p>
                  </div>
                </div>

                {timeView === "list" ? (
                  <div className="space-y-2">
                    {timeLogs.map((log) => (
                      <div key={log.id} className={`rounded-xl border ${border} ${panelBg} p-4 hover:border-[#ea580c]/30 transition-all`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-[#cccccc]">{log.workerName}</h3>
                              <span className="text-[10px] text-[#585858]">•</span>
                              <span className="text-xs text-[#858585]">{log.date}</span>
                            </div>
                            <p className="mt-1 text-xs text-[#858585]">
                              Task: <span className="text-[#cccccc] font-medium">{log.cardTitle}</span>
                            </p>
                            <p className="mt-2 text-sm text-[#cccccc] italic leading-relaxed">"{log.description}"</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xl font-black text-[#ea580c]">{log.hours}h</span>
                            <span className="text-[10px] uppercase font-bold text-[#585858]">{log.project}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {timeLogs.length === 0 && (
                      <div className="py-12 text-center text-[#858585] italic">No activity logs found. Click '+ Log Activity' to get started.</div>
                    )}
                  </div>
                ) : (
                  <WorkTimeCalendar
                    dark={appearanceDark}
                    logs={timeLogs}
                    selectedDate={selectedCalendarDate}
                    onSelectDate={setSelectedCalendarDate}
                  />
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-[#cccccc]">Active Planning Tasks</h2>
                    <p className="text-xs text-[#858585]">Tasks assigned to you on the planning boards.</p>
                  </div>
                  <button 
                    onClick={() => setUiMode("kanban")}
                    className="flex items-center gap-1.5 text-xs text-[#ea580c] hover:underline"
                  >
                    <Layout size={14} />
                    Manage Board
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredCards.map((card) => {
                    const loggedForCard = (card.timeLogs || []).reduce((s, l) => s + l.hours, 0);
                    const isOverdue = card.dueDate && new Date(card.dueDate).getTime() < Date.now() && !card.completed;
                    
                    return (
                      <div key={card.id} className={`group relative rounded-xl border ${isOverdue ? 'border-red-500/50 shadow-lg shadow-red-500/5' : 'border-[#3c3c3c]'} bg-[#252526] overflow-hidden transition-all hover:border-[#ea580c]/50`}>
                        {/* Card Cover */}
                        {card.cover && (
                          <div
                            className="w-full h-16 flex-shrink-0"
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
                              <div className="flex items-center justify-center h-full text-2xl">
                                {card.cover.value}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityColor(card.priority)}`}>
                                {card.priority}
                              </span>
                              {card.completed && (
                                <span className="bg-green-900/30 text-green-400 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-green-500/20">
                                  Completed
                                </span>
                              )}
                              {isOverdue && (
                                <span className="bg-red-900/30 text-red-400 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-red-500/20 animate-pulse">
                                  OVERDUE
                                </span>
                              )}
                              {card.estimatedTime && (
                                <span className="bg-[#3c3c3c] text-[#cccccc] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-[#444444]">
                                  Est: {card.estimatedTime}{card.estimatedTimeUnit === 'days' ? 'd' : 'h'}
                                </span>
                              )}
                              <span className="text-[10px] text-[#585858] font-medium">
                                <Clock size={10} className="inline mr-1" />
                                {loggedForCard}h logged
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-[#cccccc] truncate">{card.title}</h3>
                            <p className="mt-1 text-xs text-[#858585] line-clamp-2">{card.description}</p>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(card.tags || []).map(tag => (
                                <span key={tag} className="text-[10px] text-[#585858] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3c3c3c]">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            
                            {card.startDate && (
                              <div className="mt-2 text-[10px] text-[#585858]">
                                Started: {new Date(card.startDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {card.dueDate && (
                              <div className={`flex items-center gap-1.5 text-[10px] ${isOverdue ? 'text-red-400 font-bold' : 'text-amber-500/80 font-medium'}`}>
                                <Calendar size={12} />
                                {new Date(card.dueDate).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex -space-x-2">
                              {(card.assignees || []).map(a => (
                                <div key={a.userId} className="h-6 w-6 rounded-full border-2 border-[#252526] bg-[#3c3c3c] flex items-center justify-center text-[10px] font-bold text-[#cccccc]" title={a.displayName}>
                                  {a.displayName.charAt(0)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between border-t border-[#3c3c3c] pt-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#585858]">
                              <MessageSquare size={12} />
                              {(card.comments || []).length}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#585858]">
                              <CheckCircle2 size={12} />
                              {(card.checklists || []).filter(c => c.items.every(i => i.completed)).length}/{(card.checklists || []).length}
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openLogModal(card.id)}
                              className="rounded bg-[#ea580c]/10 px-2 py-1 text-[10px] font-bold text-[#ea580c] hover:bg-[#ea580c]/20"
                            >
                              + Log Time
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedCard({ boardId: card.boardId, cardId: card.id });
                                setCardViewOpen(true);
                              }}
                              className="rounded bg-[#3c3c3c] px-2 py-1 text-[10px] font-bold text-[#cccccc] hover:bg-[#4c4c4c]"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredCards.length === 0 && (
                    <div className="py-12 text-center text-[#858585] italic">
                      No tasks assigned to you on the planning board.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === "contacts" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#cccccc]">Team Directory</h2>
                  {isLeader && (
                    <button className="rounded bg-[#ea580c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#c2410c] transition-colors">
                      + Add Contact
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="rounded-xl border border-[#3c3c3c] bg-[#252526] p-4 hover:border-[#ea580c]/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center">
                            <User size={20} className="text-[#858585]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#cccccc]">{contact.name}</h3>
                            <p className="text-[11px] uppercase tracking-wider font-bold text-[#ea580c]/80">{contact.role}</p>
                            <p className="text-xs text-[#585858] mt-0.5">{contact.phone}</p>
                          </div>
                        </div>
                        {isLeader && (
                          <div className="flex gap-2">
                            <button className="rounded-lg bg-blue-900/20 p-2 text-blue-400 hover:bg-blue-900/40 transition-colors">
                              <MessageSquare size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Kanban Card Details Modal */}
      {selectedCard && (
        <CardView
          boardId={selectedCard.boardId}
          cardId={selectedCard.cardId}
          isOpen={cardViewOpen}
          onClose={() => {
            setCardViewOpen(false);
            setSelectedCard(null);
          }}
          onUpdated={loadData}
        />
      )}

      {/* Log Activity Modal */}
      <WorkLogActivityModal
        isOpen={logActivityOpen}
        onClose={() => setCardLogActivityOpen(false)}
        cards={allCards}
        onLog={handleLogActivity}
        appearanceDark={appearanceDark}
        initialCardId={preselectedCardId}
      />
    </div>
  );
}
