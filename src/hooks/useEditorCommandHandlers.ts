import { useCallback } from "react";
import { useRefactor } from "../context/RefactorContext";

export function useEditorCommandHandlers() {
  const {
    effSelectedPath,
    editor: { save, reload, discardUnsavedChanges },
    tree: { refresh },
    multiCellSaveApiRef,
    isWsMulti
  } = useRefactor();

  const saveAndRefresh = useCallback(async () => {
    if (isWsMulti && multiCellSaveApiRef.current) {
      const ok = await multiCellSaveApiRef.current.saveAllDirty();
      if (ok) await refresh();
      return;
    }
    if (effSelectedPath) {
      const ok = await save();
      if (ok) await refresh();
    }
  }, [effSelectedPath, save, refresh, multiCellSaveApiRef, isWsMulti]);

  const reloadFocusedOrMain = useCallback(async () => {
    await reload();
  }, [reload]);

  return {
    saveAndRefresh,
    reloadFocusedOrMain,
    discardUnsavedChanges,
    save,
    reload
  };
}
