import React from 'react';
import { FileEntry } from './types/documenthandler.types';

interface PreviewFooterProps {
  file: FileEntry | null;
  onPrint: () => void;
  onFullscreen: () => void;
}

const PreviewFooter: React.FC<PreviewFooterProps> = ({ file, onPrint, onFullscreen }) => {
  if (!file) return null;

  return (
    <div className="preview-footer">
      <div className="preview-footer-info">
        <span>Page: 1 of 1</span> {/* Placeholder, actual page info would come from context */}
      </div>
      <div className="preview-footer-actions">
        <button onClick={onFullscreen} aria-label="Toggle fullscreen">
          ⛶
        </button>
        <button onClick={onPrint} aria-label="Print">
          🖨️
        </button>
      </div>
    </div>
  );
};

export default PreviewFooter;