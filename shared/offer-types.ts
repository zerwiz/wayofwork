export interface OfferItem {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';

export interface Offer {
  id: string;
  tenant_id: string;
  project_id?: string;
  client_id?: string;
  offer_number: string;
  title: string;
  status: OfferStatus;
  items_json: string | OfferItem[];
  total_amount: number;
  valid_until?: string;
  notes?: string;
  created_by?: string;
  sent_at?: string;
  accepted_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  tenant_id: string;
  offer_id?: string;
  project_id?: string;
  client_id?: string;
  invoice_number: string;
  title: string;
  status: InvoiceStatus;
  items_json: string | OfferItem[];
  total_amount: number;
  vat_amount: number;
  grand_total: number;
  due_date?: string;
  notes?: string;
  ocr_number?: string;
  created_by?: string;
  sent_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
