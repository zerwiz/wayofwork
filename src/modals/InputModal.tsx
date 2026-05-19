/**
 * Input Modal Component
 * Modal for text input dialogs (replacement for browser prompt())
 * Following WHN Chat modal design specifications
 */

import { useState, useEffect } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'password' | 'email' | 'url' | 'number';
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  validate?: (value: string) => string | null; // Returns error message or null
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder,
  defaultValue = '',
  type = 'text',
  multiline = false,
  rows = 3,
  required = false,
  validate,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    // Validation
    if (required && !value.trim()) {
      setError('This field is required');
      return;
    }

    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="p-0">
      <div className="text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gray-900">
          {error ? (
            <AlertCircle className="w-6 h-6 text-red-400" />
          ) : (
            <Info className="w-6 h-6 text-purple-400" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

        {/* Message */}
        {message && <p className="text-sm text-gray-300 mb-4">{message}</p>}

        {/* Input */}
        <div className="mb-4 text-left">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-purple-500'
              }`}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-purple-500'
              }`}
              autoFocus
            />
          )}

          {/* Error Message */}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
