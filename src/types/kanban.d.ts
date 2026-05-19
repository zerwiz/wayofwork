export interface Board { id: string; name: string; columns: Column[]; createdBy?: string }
export interface Column { id: string; name: string; cards: BoardCard[] }
export interface BoardCard { id: string; title: string; description?: string }
export interface BoardViewType { id: string; name: string }
export interface BoardDriveView { id: string; name: string }
