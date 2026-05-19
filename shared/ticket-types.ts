export type TicketCategory = 'ändring' | 'tillägg' | 'avgående';

export type TicketStatus = 
    | 'draft' 
    | 'pending_review' 
    | 'pending_approval' 
    | 'approved' 
    | 'rejected' 
    | 'invoiced';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketMaterial {
    name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
    receipt_photo?: string;
}

export interface TicketPhoto {
    url: string;
    caption?: string;
    uploaded_at: string;
}

export interface TicketKma {
    quality?: string[];
    environment?: string[];
    safety?: string[];
}

export interface Ticket {
    id: string;
    tenant_id: string;
    project_id?: string;
    title: string;
    description?: string;
    category: TicketCategory;
    status: TicketStatus;
    priority: TicketPriority;
    cost_estimate?: number;
    cost_actual?: number;
    created_by: string;
    reviewed_by?: string;
    assigned_to?: string;
    approved_by?: string;
    approved_at?: string;
    rejected_reason?: string;
    locked_at?: string;
    invoiced_at?: string;
    invoice_ref?: string;
    materials_json: string | TicketMaterial[]; // SQLite stores as string, API returns as object
    photos_json: string | TicketPhoto[];
    kmal_json: string | TicketKma[];
    created_at: string;
    updated_at: string;
}

export interface TimeBlock {
    id: string;
    ticket_id: string;
    user_id: string;
    date: string;
    check_in?: string;
    check_out?: string;
    hours: number;
    break_hours?: number;
    description?: string;
    hourly_rate?: number;
    overtime: boolean;
    overtime_hours?: number;
    overtime_rate?: number;
    approved: boolean;
    approved_by?: string;
    created_at: string;
}

export interface TimeSession {
    id: string;
    tenant_id: string;
    user_id: string;
    project_id?: string;
    check_in: string;
    check_out?: string;
    total_hours?: number;
    break_minutes?: number;
    notes?: string;
    location_json?: string;
    created_at: string;
}

export interface PriceListItem {
    name: string;
    unit: string;
    unit_price: number;
    category: string;
}

export interface PriceList {
    id: string;
    tenant_id: string;
    name: string;
    items_json: string | PriceListItem[];
    active: boolean;
    valid_from?: string;
    valid_to?: string;
    created_at: string;
}

export interface SyncLog {
    id: string;
    ticket_id: string;
    system: 'fortnox' | 'visma';
    direction: 'push' | 'pull';
    status: 'pending' | 'success' | 'failed';
    payload: string;
    response?: string;
    error?: string;
    retry_count: number;
    created_at: string;
}

export interface FortnoxConnection {
    id: string;
    tenant_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    client_secret_encrypted: string;
    scope: string;
    active: boolean;
    last_sync_at?: string;
    created_at: string;
    updated_at: string;
}
