export interface DriveFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  parentId?: string;
  mimeType?: string;
  kanbanBoardId?: string;
  kanbanCardId?: string;
}
