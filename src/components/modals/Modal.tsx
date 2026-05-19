import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, maxWidth, className, children }: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = maxWidth === 'sm' ? 'max-w-sm' : maxWidth === 'md' ? 'max-w-md' : maxWidth === 'lg' ? 'max-w-lg' : maxWidth === 'xl' ? 'max-w-xl' : 'max-w-lg';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-[#252526] border border-[#3c3c3c] rounded-lg ${maxWidthClass} w-full mx-4 p-6 ${className || ''}`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#cccccc]">{title}</h2>
            <button onClick={onClose} className="text-[#858585] hover:text-[#cccccc]">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
