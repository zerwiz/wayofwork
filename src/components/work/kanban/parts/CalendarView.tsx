import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BoardCard } from '../../../../types/kanban';

interface CalendarViewProps {
  cards: Map<string, BoardCard>;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  getPriorityColor: (priority: string) => string;
  handleOpenWorkTaskCard: (cardId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  cards,
  selectedMonth,
  setSelectedMonth,
  getPriorityColor,
  handleOpenWorkTaskCard
}) => {
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
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-100">Calendar View</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { const newDate = new Date(selectedMonth); newDate.setMonth(newDate.getMonth() - 1); setSelectedMonth(newDate); }} className="p-2 hover:bg-[#252526] rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#858585]" />
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center text-[#cccccc]">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => { const newDate = new Date(selectedMonth); newDate.setMonth(newDate.getMonth() + 1); setSelectedMonth(newDate); }} className="p-2 hover:bg-[#252526] rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-[#858585]" />
          </button>
          <button onClick={() => setSelectedMonth(new Date())} className="px-3 py-2 bg-[#ea580c] text-[#cccccc] rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="bg-[#1e1e1e] rounded-lg border border-gray-700 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-[#252526]">
            {weekDays.map(day => <div key={day} className="bg-[#1e1e1e] p-2 text-center text-sm font-semibold text-[#cccccc]">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[#252526]">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="bg-[#1e1e1e] min-h-[100px]" />)}
            {days.map((day) => {
              const date = new Date(year, month, day);
              const dayCards = getCardsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={day} className={`bg-[#1e1e1e] min-h-[100px] p-2 border-l border-t border-gray-700 ${isToday ? 'bg-orange-900/20 border-orange-600/50' : ''}`}>
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-orange-400' : 'text-[#cccccc]'}`}>{day}</div>
                  <div className="space-y-1">
                    {dayCards.slice(0, 3).map((card) => (
                      <div key={card.id} onClick={() => handleOpenWorkTaskCard(card.id)} className="rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden">
                        <div className={`text-xs p-1.5 ${card.cover ? 'bg-[#252526]' : getPriorityColor(card.priority)}`}>
                          <span className="truncate flex-1 min-w-0 text-[#cccccc] font-medium">{card.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayCards.length > 3 && <div className="text-xs text-[#585858] px-1.5">+{dayCards.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
