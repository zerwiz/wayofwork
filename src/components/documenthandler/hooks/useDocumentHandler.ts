// apps/wayofwork-ui/src/components/documenthandler/hooks/usePreview.ts
import { useState, useCallback } from 'react';
import { FileEntry } from '../types/documenthandler.types';

export const usePreview = () => {
  const [visible, setVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [currentZoom, setCurrentZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const openPreview = useCallback((file: FileEntry) => {
    setSelectedFile(file);
    setVisible(true);
    setCurrentZoom(100);
    setCurrentPage(1);
    setTotalPages(1); // This would be determined by the actual file content
  }, []);

  const closePreview = useCallback(() => {
    setVisible(false);
    setSelectedFile(null);
  }, []);

  const togglePreview = useCallback(() => {
    setVisible(!visible);
  }, [visible]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const printFile = useCallback(async () => {
    // Implement print functionality
    window.print();
  }, []);

  const fullscreen = useCallback(() => {
    // Implement fullscreen functionality
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }, []);

  return {
    visible,
    selectedFile,
    currentZoom,
    setCurrentZoom,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    openPreview,
    closePreview,
    togglePreview,
    goToPage,
    printFile,
    fullscreen,
  };
};