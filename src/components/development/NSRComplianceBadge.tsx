import React from 'react';

interface NSRComplianceBadgeProps {
  compliant: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const NSRComplianceBadge: React.FC<NSRComplianceBadgeProps> = ({ compliant, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'md' ? 'px-3 py-1 text-sm' : 'px-4 py-2 text-base';
  return (
    <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full ${
      compliant ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'
    }`}>
      {compliant ? '✓ Compliant' : '✗ Non-Compliant'}
    </span>
  );
};

export default NSRComplianceBadge;
