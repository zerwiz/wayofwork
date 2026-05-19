import React from 'react';
import { FileEntry } from './types/documenthandler.types';

interface PreviewHeaderProps {
  file: FileEntry | null;
  onClose: () => void;
  onFullscreen: () => void;
}

const PreviewHeader: React.FC<PreviewHeaderProps> = ({ file, onClose, onFullscreen }) => {
  if (!file) return null;

  return (
    <div className="preview-header">
      <div className="preview-header-title">
        <h2>{file.name}</h2>
      </div>
      <div className="preview-header-actions">
        <button onClick={onFullscreen} aria-label="Toggle fullscreen">
          ⛶
        </button>
        <button onClick={onClose} aria-label="Close preview">
          ×
        </button>
      </div>
    </div>
  );
};

export default PreviewHeader;