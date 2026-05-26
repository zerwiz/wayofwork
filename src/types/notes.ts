export interface ResourcePermission {
  resource_id: string;
  resource_type: 'kanban_board' | 'workspace_file' | 'document' | 'task';
  owner_id: string;
  visibility: 'private' | 'shared' | 'tenant';
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  kanbanCardId?: string;
  resourcePermission?: ResourcePermission;
}
