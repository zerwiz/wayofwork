import { useEffect } from 'react';

export const useKanbanEvents = (onBoardChanged: () => void, onCardChanged?: (boardId: string) => void) => {
  useEffect(() => {
    const token = localStorage.getItem("wop_token");
    const lang = localStorage.getItem("wop_language") || "sv";
    const wsUrl = (import.meta as any).env?.VITE_WAYOFPI_WS_URL || `/ws`;
    const url = `${wsUrl}?surface=kanban${token ? `&token=${encodeURIComponent(token)}` : ""}&lang=${lang}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'event') {
        if (data.event === 'kanban_boards_changed') {
          onBoardChanged();
        } else if (data.event === 'kanban_cards_changed' && onCardChanged) {
          onCardChanged(data.data.boardId);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [onBoardChanged, onCardChanged]);
};
