export interface EditMenuHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

export function useEditMenuState() {
  return {
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
  };
}
