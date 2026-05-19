/**
 * Board Drive View Component
 * Shows files linked to a Kanban board
 * Allows linking files to cards
 */

import React, { useState, useEffect } from 'react';
import { Folder, File, Link2, Search, X, HardDrive, ChevronRight } from 'lucide-react';
import type { Board, BoardCard } from '../../../types/kanban';
import { driveService } from '../../../services/mockDriveService';
import type { DriveFile } from '../../../types/drive';

interface BoardDriveViewProps {
  board: Board;
  cards: Map<string, BoardCard>;
  currentFolder?: string;
  onNavigateFolder?: (folderId?: string) => void;
  onLinkFile?: (cardId: string, fileId: string) => void;
  onUnlinkFile?: (cardId: string, fileId: string) => void;
}

export const WorkFilesView: React.FC<BoardDriveViewProps> = ({
  board: _board,
  cards,
  currentFolder,
  onNavigateFolder,
  onLinkFile,
  onUnlinkFile,
}) => {
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [folderPath, setFolderPath] = useState<DriveFile[]>([]);

  useEffect(() => {
    loadFiles();
    loadFolders();
    buildFolderPath();
  }, [currentFolder]);

  const loadFiles = () => {
    try {
      const files = driveService.getFiles(currentFolder);
      const fileList = files.filter((f) => f.type === 'file');
      setAllFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
      setAllFiles([]);
    }
  };

  const loadFolders = () => {
    try {
      const files = driveService.getFiles(currentFolder);
      const folderList = files.filter((f) => f.type === 'folder');
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  };

  const buildFolderPath = () => {
    if (!currentFolder) {
      setFolderPath([]);
      return;
    }

    const path: DriveFile[] = [];
    let current: DriveFile | null = driveService.getFile(currentFolder) || null;

    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = driveService.getFile(current.parentId) || null;
      } else {
        current = null;
      }
    }

    setFolderPath(path);
  };

  // Get files linked to board cards
  const getLinkedFiles = (): Map<string, DriveFile[]> => {
    const linked = new Map<string, DriveFile[]>();
    cards.forEach((card) => {
      const fileIds = card.metadata?.fileIds || [];
      if (fileIds.length > 0) {
        const files = fileIds
          .map((id: string) => driveService.getFile(id))
          .filter((f: DriveFile | null): f is DriveFile => f !== null);
        if (files.length > 0) {
          linked.set(card.id, files);
        }
      }
    });
    return linked;
  };

  // Get all files linked to any card in the board
  const getAllLinkedFiles = (): DriveFile[] => {
    const linkedFileIds = new Set<string>();
    cards.forEach((card) => {
      const fileIds = card.metadata?.fileIds || [];
      fileIds.forEach((id: string) => linkedFileIds.add(id));
    });
    return allFiles.filter((file) => linkedFileIds.has(file.id));
  };

  // Get unlinked files
  const getUnlinkedFiles = (): DriveFile[] => {
    const linkedFileIds = new Set<string>();
    cards.forEach((card) => {
      const fileIds = card.metadata?.fileIds || [];
      fileIds.forEach((id: string) => linkedFileIds.add(id));
    });
    return allFiles.filter(
      (file) =>
        !linkedFileIds.has(file.id) &&
        (!searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const handleLinkFile = (cardId: string, fileId: string) => {
    if (onLinkFile) {
      onLinkFile(cardId, fileId);
    }
    setIsLinkingMode(false);
    setSelectedCardId(null);
  };

  const handleUnlinkFile = (cardId: string, fileId: string) => {
    if (onUnlinkFile) {
      onUnlinkFile(cardId, fileId);
    }
  };

  const handleFolderClick = (folderId: string) => {
    if (onNavigateFolder) {
      onNavigateFolder(folderId);
    }
  };

  // Navigate up functionality - to be implemented when needed
  // const handleNavigateUp = () => {
  //   if (currentFolder) {
  //     const current = driveService.getFile(currentFolder);
  //     if (current?.parentId && onNavigateFolder) {
  //       onNavigateFolder(current.parentId);
  //     } else if (onNavigateFolder) {
  //       onNavigateFolder(undefined);
  //     }
  //   }
  // };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  getLinkedFiles(); // Called for side effects if needed
  const allLinked = getAllLinkedFiles();
  const unlinked = getUnlinkedFiles();

  return (
    <div className="flex-1 overflow-y-auto pl-4 pr-2 lg:pl-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-orange-400" />
                Board Files
              </h3>
              <p className="text-sm text-[#858585]">
                {allLinked.length} file{allLinked.length !== 1 ? 's' : ''} linked to board cards
              </p>
            </div>
            <button
              onClick={() => setIsLinkingMode(!isLinkingMode)}
              className="px-4 py-2 bg-[#ea580c] hover:bg-orange-700 text-[#cccccc] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              {isLinkingMode ? 'Cancel Linking' : 'Link File'}
            </button>
          </div>

          {/* Folder Path Breadcrumb */}
          {(currentFolder || folderPath.length > 0) && (
            <div className="flex items-center gap-2 text-sm text-[#858585] mb-4">
              <button
                onClick={() => onNavigateFolder && onNavigateFolder(undefined)}
                className="hover:text-[#cccccc] transition-colors flex items-center gap-1"
              >
                <HardDrive className="w-4 h-4" />
                Storage
              </button>
              {folderPath.map((folder) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => handleFolderClick(folder.id)}
                    className="hover:text-[#cccccc] transition-colors"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#858585]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-[#cccccc] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">Folders</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors text-left"
                >
                  <Folder className="w-8 h-8 text-orange-400 mb-2" />
                  <p className="text-sm font-medium text-gray-100 truncate">{folder.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linked Files Section */}
        {allLinked.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">Linked Files</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allLinked
                .filter(
                  (file) =>
                    !searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((file) => {
                  const linkedToCards = Array.from(cards.values()).filter(
                    (card) => card.metadata?.fileIds?.includes(file.id)
                  );

                  return (
                    <div
                      key={file.id}
                      className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <h5 className="text-sm font-medium text-gray-100 truncate">{file.name}</h5>
                        </div>
                      </div>

                      <div className="text-xs text-[#858585] mb-3">
                        {formatFileSize(file.size)} • {file.mimeType || 'Unknown type'}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {linkedToCards.map((card) => (
                            <span
                              key={card.id}
                              className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30"
                            >
                              {card.title}
                            </span>
                          ))}
                        </div>
                        {linkedToCards.length > 0 && (
                          <button
                            onClick={() => {
                              if (linkedToCards.length === 1) {
                                handleUnlinkFile(linkedToCards[0].id, file.id);
                              }
                            }}
                            className="text-[#858585] hover:text-red-400 transition-colors"
                            title="Unlink from card"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Unlinked Files Section */}
        {isLinkingMode && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">
              Available Files {selectedCardId && `- Link to: ${cards.get(selectedCardId)?.title}`}
            </h4>
            {unlinked.length === 0 ? (
              <div className="text-center py-8 text-[#585858]">
                <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No unlinked files found in this folder</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlinked.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors cursor-pointer"
                    onClick={() => {
                      if (selectedCardId) {
                        handleLinkFile(selectedCardId, file.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="w-5 h-5 text-[#858585] flex-shrink-0" />
                        <h5 className="text-sm font-medium text-gray-100 truncate">{file.name}</h5>
                      </div>
                    </div>

                    <div className="text-xs text-[#858585] mb-3">
                      {formatFileSize(file.size)} • {file.mimeType || 'Unknown type'}
                    </div>

                    {!selectedCardId && (
                      <div className="mt-3">
                        <p className="text-xs text-[#585858] mb-2">Select a card to link:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(cards.values()).slice(0, 3).map((card) => (
                            <button
                              key={card.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardId(card.id);
                                handleLinkFile(card.id, file.id);
                              }}
                              className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 hover:bg-orange-500/30"
                            >
                              {card.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Files Section (when not in linking mode) */}
        {!isLinkingMode && allLinked.length === 0 && unlinked.length === 0 && (
          <div className="text-center py-12 text-[#585858]">
            <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No files linked</h3>
            <p className="mb-4">Link files to cards to see them here.</p>
            <button
              onClick={() => setIsLinkingMode(true)}
              className="px-4 py-2 bg-[#ea580c] hover:bg-orange-700 text-[#cccccc] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Link2 className="w-4 h-4" />
              Link File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkFilesView;
