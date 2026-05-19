import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
  onCancel,
  type = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const confirmColors = type === 'danger'
    ? 'bg-[#ea580c] hover:bg-[#c2410c]'
    : type === 'warning'
    ? 'bg-yellow-600 hover:bg-yellow-700'
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] p-6 rounded-lg max-w-md w-full border border-gray-700">
        <h2 className="text-xl font-bold text-[#cccccc] mb-4">{title}</h2>
        <p className="text-[#858585] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              onCancel?.();
              onClose();
            }}
            className="px-4 py-2 text-[#858585] hover:bg-[#3c3c3c] rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded transition-colors ${confirmColors}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmationModal };
export default ConfirmationModal;
