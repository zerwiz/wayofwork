/**
 * Success Modal Component
 * Modal for displaying success messages
 * Following WHN Chat modal design specifications
 */

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  autoClose = false,
  autoCloseDelay = 3000,
}: SuccessModalProps) {
  // Auto-close functionality
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="border-green-700 p-0">
      <div className="text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/50">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-300 mb-4">{message}</p>

        {/* Button */}
        {!autoClose && (
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors"
          >
            OK
          </button>
        )}
      </div>
    </Modal>
  );
}
