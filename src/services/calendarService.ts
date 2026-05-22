import type { CalendarEvent } from '../types/calendar';

export const calendarService = {
  getEvents: async (): Promise<CalendarEvent[]> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/calendar/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  },
  
  getEvent: async (id: string): Promise<CalendarEvent | null> => {
    const events = await calendarService.getEvents();
    return events.find(e => e.id === id) || null;
  },

  createEvent: async (data: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create event');
    return await res.json();
  },

  updateEvent: async (id: string, data: Partial<CalendarEvent>): Promise<void> => {
    const token = localStorage.getItem('wop_token');
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update event');
  }
};
