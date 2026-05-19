// apps/wayofwork-ui/src/components/documenthandler/hooks/useFileExplorer.ts
import { useState, useCallback, useMemo } from 'react';
import { FileEntry } from '../types/documenthandler.types';

export const useFileExplorer = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mock data - in real app, this would load from API
  const mockFiles: FileEntry[] = [
    {
      id: '1',
      name: 'example.tex',
      path: '/docs/example.tex',
      extension: '.tex',
      size: 1024,
      modified: new Date('2025-01-15'),
      isDirectory: false,
    },
    {
      id: '2',
      name: 'document.pdf',
      path: '/docs/document.pdf',
      extension: '.pdf',
      size: 2048,
      modified: new Date('2025-01-20'),
      isDirectory: false,
    },
    {
      id: '3',
      name: 'notes.md',
      path: '/docs/notes.md',
      extension: '.md',
      size: 512,
      modified: new Date('2025-01-25'),
      isDirectory: false,
    },
  ];

  // Initialize with mock data
  useState(() => setFiles(mockFiles));

  const filteredFiles = useMemo(() => {
    return files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let modifier = sortOrder === 'desc' ? -1 : 1;

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * modifier;
      }

      if (sortBy === 'date') {
        return (a.modified.getTime() - b.modified.getTime()) * modifier;
      }

      if (sortBy === 'size') {
        return (a.size - b.size) * modifier;
      }

      return 0;
    });
  }, [filteredFiles, sortBy, sortOrder]);

  const selectFile = useCallback((file: FileEntry) => {
    setSelectedFile(file);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return {
    files: sortedFiles,
    selectedFile,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectFile,
    clearSelection,
  };
};