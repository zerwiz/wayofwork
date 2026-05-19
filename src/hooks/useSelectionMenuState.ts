export interface SelectionMenuHandlers {
  onSelectAll: () => void;
  onExpandSelection: () => void;
  onShrinkSelection: () => void;
}

export function useSelectionMenuState() {
  return {
    hasSelection: false,
  };
}
