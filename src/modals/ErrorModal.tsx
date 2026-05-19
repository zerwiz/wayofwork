/**
 * Error Modal Component
 * Modal for displaying error messages
 * Following WHN Chat modal design specifications
 */

import { AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  isLoading?: boolean;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  showRetry = false,
  onRetry,
  isLoading = false,
}: ErrorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      className="border-red-700 p-0"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/50">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-300 mb-4">{message}</p>

        {/* Details */}
        {details && (
          <div className="bg-gray-900 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs text-gray-400 font-mono break-all">{details}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Retry'
              )}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
