export interface BoardColorOption {
  value: string;
  label: string;
  type?: string;
  gradient?: string;
}

export const boardColorOptions: BoardColorOption[] = [
  // Solid colors
  { value: '#7c3aed', label: 'Purple', type: 'solid' },
  { value: '#2563eb', label: 'Blue', type: 'solid' },
  { value: '#059669', label: 'Green', type: 'solid' },
  { value: '#d97706', label: 'Orange', type: 'solid' },
  { value: '#dc2626', label: 'Red', type: 'solid' },
  { value: '#0891b2', label: 'Cyan', type: 'solid' },
  { value: '#dc4add', label: 'Pink', type: 'solid' },
  { value: '#64748b', label: 'Slate', type: 'solid' },
  // Gradients
  { value: 'sunset', label: 'Sunset', type: 'gradient', gradient: 'linear-gradient(135deg, #f97316, #dc2626)' },
  { value: 'ocean', label: 'Ocean', type: 'gradient', gradient: 'linear-gradient(135deg, #06b6d4, #2563eb)' },
  { value: 'forest', label: 'Forest', type: 'gradient', gradient: 'linear-gradient(135deg, #22c55e, #059669)' },
  { value: 'midnight', label: 'Midnight', type: 'gradient', gradient: 'linear-gradient(135deg, #6366f1, #1e1b4b)' },
  { value: 'coral', label: 'Coral', type: 'gradient', gradient: 'linear-gradient(135deg, #fb7185, #f97316)' },
  { value: 'aurora', label: 'Aurora', type: 'gradient', gradient: 'linear-gradient(135deg, #818cf8, #34d399)' },
  { value: 'lava', label: 'Lava', type: 'gradient', gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)' },
  { value: 'frost', label: 'Frost', type: 'gradient', gradient: 'linear-gradient(135deg, #7dd3fc, #a78bfa)' },
  { value: 'peach', label: 'Peach', type: 'gradient', gradient: 'linear-gradient(135deg, #fbcfe8, #fde68a)' },
  { value: 'deepsea', label: 'Deep Sea', type: 'gradient', gradient: 'linear-gradient(135deg, #0f766e, #1e3a5f)' },
];

export const boardIconOptions = [
  { value: 'clipboard', label: '📋' },
  { value: 'check', label: '✅' },
  { value: 'star', label: '⭐' },
  { value: 'fire', label: '🔥' },
  { value: 'idea', label: '💡' },
  { value: 'rocket', label: '🚀' },
  { value: 'target', label: '🎯' },
  { value: 'diamond', label: '💎' },
  { value: 'construction', label: '🏗️' },
  { value: 'tools', label: '🔧' },
  { value: 'chart', label: '📊' },
  { value: 'lock', label: '🔒' },
  { value: 'note', label: '📝' },
  { value: 'lightning', label: '⚡' },
  { value: 'art', label: '🎨' },
  { value: 'pin', label: '📌' },
];
