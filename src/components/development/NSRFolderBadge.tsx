import React from 'react';

interface NSRFolderBadgeProps {
  folder: string;
  size?: string;
  onClick?: () => void;
}

const NSRFolderBadge: React.FC<NSRFolderBadgeProps> = ({ folder, onClick }) => {
  return (
    <span
      onClick={onClick}
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-900/30 text-blue-400 rounded border border-blue-500/30 cursor-pointer hover:bg-blue-900/50"
    >
      {folder}
    </span>
  );
};

export default NSRFolderBadge;
