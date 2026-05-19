import type { CalendarEvent } from '../types/calendar';

const mockEvents: CalendarEvent[] = [];

export const calendarService = {
  getEvents: (): CalendarEvent[] => mockEvents,
  getEvent: (id: string): CalendarEvent | undefined => mockEvents.find(e => e.id === id),
  updateEvent: (id: string, _data: Partial<CalendarEvent>): void => {},
};
