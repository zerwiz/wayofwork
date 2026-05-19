const API = "";

async function api(path: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getTickets() {
  return api("/api/tickets");
}

export async function createTicket(data: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  project_id?: string;
}) {
  return api("/api/tickets", { method: "POST", body: JSON.stringify(data) });
}

export async function submitTicket(id: string) {
  return api(`/api/tickets/${id}/submit`, { method: "POST" });
}

export async function reviewTicket(id: string, approved: boolean, notes?: string, forward?: boolean, cost_actual?: number) {
  return api(`/api/tickets/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ approved, notes, forward, cost_actual }),
  });
}

export async function approveTicket(id: string) {
  return api(`/api/tickets/${id}/approve`, { method: "POST" });
}

export async function rejectTicket(id: string, reason?: string) {
  return api(`/api/tickets/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function invoiceTicket(id: string, invoice_ref?: string) {
  return api(`/api/tickets/${id}/invoice`, { method: "POST", body: JSON.stringify({ invoice_ref }) });
}

export async function addTimeBlock(ticketId: string, data: {
  date: string;
  hours: number;
  description?: string;
  overtime?: boolean;
}) {
  return api(`/api/tickets/${ticketId}/time-blocks`, { method: "POST", body: JSON.stringify(data) });
}

export async function getTimeSessions() {
  return api("/api/time-sessions/active");
}

export async function getTicketStatusReport() {
  return api("/api/reports/ticket-status");
}

export async function getProjectBudget() {
  return api("/api/reports/project-budget");
}

export async function getApprovedTickets() {
  return api("/api/invoices/approved-tickets");
}

export async function getPriceLists() {
  return api("/api/price-lists");
}

export async function getWeeklySummary() {
  return api("/api/reports/weekly-summary");
}

export async function checkIn(project_id?: string) {
  return api("/api/time-sessions/check-in", { method: "POST", body: JSON.stringify({ project_id }) });
}

export async function checkOut(break_minutes?: number) {
  return api("/api/time-sessions/check-out", { method: "POST", body: JSON.stringify({ break_minutes }) });
}
