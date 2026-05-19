export interface BoardColorOption {
  value: string;
  label: string;
  type?: string;
  gradient?: string;
}

export const boardColorOptions: BoardColorOption[] = [
  { value: 'purple', label: 'Purple', type: 'solid' },
  { value: 'blue', label: 'Blue', type: 'solid' },
  { value: 'green', label: 'Green', type: 'solid' },
  { value: 'orange', label: 'Orange', type: 'solid' },
  { value: 'red', label: 'Red', type: 'solid' },
];

export const boardIconOptions = [
  { value: 'layout-grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'check-square', label: 'Tasks' },
];
