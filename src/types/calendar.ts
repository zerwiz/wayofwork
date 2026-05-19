export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  kanbanCardId?: string;
  boardId?: string;
  startTime?: string;
  endTime?: string;
}
