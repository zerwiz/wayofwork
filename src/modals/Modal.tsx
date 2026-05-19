/**
 * Modal Base Component
 * Base modal component for all modal types
 * Following WHN Chat modal design specifications
 */

import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  maxWidth = 'md',
  className = '',
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  if (!isOpen) return null;

  // Use React Portal to render modal at document body level (escapes overflow-hidden containers)
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={(e) => {
        // Close modal when clicking outside the modal content (on backdrop or outer container)
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('modal-backdrop')) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity modal-backdrop -z-10" 
        aria-hidden="true"
        onClick={(e) => {
          // Close when clicking directly on backdrop
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal Container */}
      <div
        className={`relative z-10 glass-card rounded-lg shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col animate-scale-in ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        style={{ maxWidth: maxWidth === 'xs' ? '320px' : maxWidth === 'sm' ? '384px' : maxWidth === 'xl' ? '576px' : 'calc(100vw - 1rem)' }}
        onClick={(e) => {
          // Prevent clicks inside modal from closing it
          e.stopPropagation();
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-purple-500/20 flex-shrink-0 gap-3">
            {title && (
              <h2 id="modal-title" className="text-base sm:text-lg font-semibold gradient-text truncate flex-1 min-w-0">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20 hover:shadow-lg hover:shadow-purple-500/10 flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body
  );
}
