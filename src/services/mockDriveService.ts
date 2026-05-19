import type { DriveFile } from '../types/drive';

const mockFiles: DriveFile[] = [];
const mockAllFiles: DriveFile[] = [];

export const driveService = {
  getFiles: (_folderId?: string): DriveFile[] => mockFiles,
  getFile: (id: string): DriveFile | undefined => mockAllFiles.find(f => f.id === id) || mockFiles.find(f => f.id === id),
  getAllFiles: (): DriveFile[] => mockAllFiles,
  updateFile: (id: string, _data: Partial<DriveFile>): void => {},
};
