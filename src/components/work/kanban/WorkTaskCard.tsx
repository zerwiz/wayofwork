import React from 'react';

interface WorkTaskCardProps {
  boardId: string;
  cardId: string | null;
  columnId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  onUpdated?: () => void;
  isCreateMode?: boolean;
}

export const WorkTaskCard: React.FC<WorkTaskCardProps> = ({
  boardId,
  cardId,
  columnId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-[#252526] p-6 rounded-lg max-w-2xl w-full">
        <h2 className="text-xl font-bold text-[#cccccc] mb-4">Card Details</h2>
        <p className="text-[#858585]">Board: {boardId}, Card: {cardId}, Column: {columnId}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-[#ea580c] text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WorkTaskCard;
