/**
 * Board Docs View Component
 * Shows documents (notes) linked to a Kanban board
 * Allows linking documents to cards
 */

import React, { useState, useEffect } from 'react';
import { FileText, Link2, Search, Plus, X } from 'lucide-react';
import type { Board, BoardCard } from '../../../types/kanban';
import { notesService } from '../../../services/mockNotesService';
import type { Note } from '../../../types/notes';

interface BoardDocsViewProps {
  board: Board;
  cards: Map<string, BoardCard>;
  onLinkDocument?: (cardId: string, documentId: string) => void;
  onUnlinkDocument?: (cardId: string, documentId: string) => void;
}

export const WorkDocsView: React.FC<BoardDocsViewProps> = ({
  board: _board,
  cards,
  onLinkDocument,
  onUnlinkDocument,
}) => {
  const [allDocuments, setAllDocuments] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLinkingMode, setIsLinkingMode] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    try {
      const notes = notesService.getAllNotes();
      setAllDocuments(notes);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setAllDocuments([]);
    }
  };

  // Get all documents linked to any card in the board
  const getAllLinkedDocuments = (): Note[] => {
    const linkedDocIds = new Set<string>();
    cards.forEach((card) => {
      const docIds = card.metadata?.documentIds || [];
      docIds.forEach((id: string) => linkedDocIds.add(id));
    });
    return allDocuments.filter((doc) => linkedDocIds.has(doc.id));
  };

  // Get unlinked documents
  const getUnlinkedDocuments = (): Note[] => {
    const linkedDocIds = new Set<string>();
    cards.forEach((card) => {
      const docIds = card.metadata?.documentIds || [];
      docIds.forEach((id: string) => linkedDocIds.add(id));
    });
    return allDocuments.filter(
      (doc) =>
        !linkedDocIds.has(doc.id) &&
        (!searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || doc.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const handleLinkDocument = (cardId: string, documentId: string) => {
    if (onLinkDocument) {
      onLinkDocument(cardId, documentId);
    }
    setIsLinkingMode(false);
    setSelectedCardId(null);
  };

  const handleUnlinkDocument = (cardId: string, documentId: string) => {
    if (onUnlinkDocument) {
      onUnlinkDocument(cardId, documentId);
    }
  };

  const allLinked = getAllLinkedDocuments();
  const unlinked = getUnlinkedDocuments();

  return (
    <div className="flex-1 overflow-y-auto pl-4 pr-2 lg:pl-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                Board Documents
              </h3>
              <p className="text-sm text-[#858585]">
                {allLinked.length} document{allLinked.length !== 1 ? 's' : ''} linked to board cards
              </p>
            </div>
            <button
              onClick={() => setIsLinkingMode(!isLinkingMode)}
              className="px-4 py-2 bg-[#ea580c] hover:bg-orange-700 text-[#cccccc] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              {isLinkingMode ? 'Cancel Linking' : 'Link Document'}
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#858585]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-[#cccccc] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Linked Documents Section */}
        {allLinked.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">Linked Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allLinked
                .filter(
                  (doc) =>
                    !searchQuery ||
                    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((doc) => {
                  const linkedToCards = Array.from(cards.values()).filter(
                    (card: BoardCard) => card.metadata?.documentIds?.includes(doc.id)
                  );

                  return (
                    <div
                      key={doc.id}
                      className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <h5 className="text-sm font-medium text-gray-100 truncate">{doc.title || 'Untitled'}</h5>
                        </div>
                      </div>

                      {doc.content && (
                        <p className="text-xs text-[#858585] mb-3 line-clamp-2">
                          {doc.content.substring(0, 100)}...
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {linkedToCards.map((card: BoardCard) => (
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
                                handleUnlinkDocument(linkedToCards[0].id, doc.id);
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

        {/* Unlinked Documents Section */}
        {isLinkingMode && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">
              Available Documents {selectedCardId && `- Link to: ${cards.get(selectedCardId)?.title}`}
            </h4>
            {unlinked.length === 0 ? (
              <div className="text-center py-8 text-[#585858]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No unlinked documents found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlinked.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors cursor-pointer"
                    onClick={() => {
                      if (selectedCardId) {
                        handleLinkDocument(selectedCardId, doc.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#858585] flex-shrink-0" />
                        <h5 className="text-sm font-medium text-gray-100 truncate">{doc.title || 'Untitled'}</h5>
                      </div>
                    </div>

                    {doc.content && (
                      <p className="text-xs text-[#858585] mb-3 line-clamp-2">
                        {doc.content.substring(0, 100)}...
                      </p>
                    )}

                    {!selectedCardId && (
                      <div className="mt-3">
                        <p className="text-xs text-[#585858] mb-2">Select a card to link:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(cards.values()).slice(0, 3).map((card: BoardCard) => (
                            <button
                              key={card.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardId(card.id);
                                handleLinkDocument(card.id, doc.id);
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

        {/* All Documents Section (when not in linking mode) */}
        {!isLinkingMode && allLinked.length === 0 && (
          <div className="text-center py-12 text-[#585858]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No documents linked</h3>
            <p className="mb-4">Link documents to cards to see them here.</p>
            <button
              onClick={() => setIsLinkingMode(true)}
              className="px-4 py-2 bg-[#ea580c] hover:bg-orange-700 text-[#cccccc] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Link Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkDocsView;
