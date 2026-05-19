import { useState, useEffect, useRef } from 'react';
import { DocumentTextIcon, ArrowLeftIcon, ArrowRightIcon, PrinterIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import './DocumentViewer.css';

interface DocumentViewerProps {
  content: string;
  title?: string;
  onBack?: () => void;
}

export function DocumentViewer({ content, title = 'Document', onBack }: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const handleDoubleClick = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="document-viewer-container" style={{ backgroundColor: '#1e1e1e' }} onScroll={handleScroll}>
      <div className="viewer-toolbar" style={{ backgroundColor: '#252526', borderBottom: '1px solid #3c3c3c' }}>
        <button onClick={onBack} className="toolbar-nav-btn" style={{ color: '#cccccc' }}>
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <span className="viewer-title" style={{ color: '#cccccc' }}>{title}</span>
        <div className="viewer-actions">
          <button className="toolbar-btn" onClick={() => window.print()} style={{ color: '#cccccc' }}>
            <PrinterIcon className="w-4 h-4" />
          </button>
          <button className="toolbar-btn" style={{ color: '#cccccc' }}>
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
          <button className="toolbar-btn" style={{ color: '#cccccc' }}>
            <ShareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div 
        className="viewer-content" 
        ref={contentRef}
        onDoubleClick={handleDoubleClick}
        style={{ backgroundColor: '#1e1e1e', color: '#cccccc' }}
      >
        <div className="viewer-body" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
