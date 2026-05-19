// components/menus/ViewMenu.tsx
import React from "react";

interface ViewMenuHandlers {
  onToggleStatusBar: () => void;
  onToggleMenuBar: () => void;
  onEnterZen: () => void;
  onExitZen: () => void;
  onToggleFullScreen: () => void;
  onToggleCenteredLayout: () => void;
  onNormalView: () => void;
  onToggleWordWrap: () => void;
  onToggleBreadcrumbs: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFlipLayout: () => void;
  onApplyLayoutPreset: (preset: string) => void;
}

const ViewMenu: React.FC<ViewMenuHandlers> = (
  {
    onToggleStatusBar,
    onToggleMenuBar,
    onEnterZen,
    onExitZen,
    onToggleFullScreen,
    onToggleCenteredLayout,
    onNormalView,
    onToggleWordWrap,
    onToggleBreadcrumbs,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onFlipLayout,
    onApplyLayoutPreset,
  }
) => {
  const handleZoomIn = () => onZoomIn?.();
  const handleZoomOut = () => onZoomOut?.();
  const handleZoomReset = () => onZoomReset?.();

  return (
    <div
      role="menubar"
      className="view-menu"
      data-testid="view-menu"
    >
      <div className="view-menu-section">
        <button
          onClick={onToggleStatusBar}
          className="view-menu-item"
          title="Toggle Status Bar"
        >
          Status Bar
        </button>
        <button
          onClick={onToggleMenuBar}
          className="view-menu-item"
          title="Toggle Menu Bar"
        >
          Menu Bar
        </button>
      </div>

      <div className="view-menu-section">
        <button
          onClick={onEnterZen}
          className="view-menu-item"
          title="Enter Zen Mode"
        >
          Enter Zen
        </button>
        <button
          onClick={onExitZen}
          className="view-menu-item"
          title="Exit Zen Mode"
        >
          Exit Zen
        </button>
        <button
          onClick={onToggleFullScreen}
          className="view-menu-item"
          title="Toggle Full Screen"
        >
          Full Screen
        </button>
      </div>

      <div className="view-menu-section">
        <button
          onClick={onNormalView}
          className="view-menu-item"
          title="Normal View"
        >
          Normal View
        </button>
        <button
          onClick={onToggleCenteredLayout}
          className="view-menu-item"
          title="Toggle Centered Layout"
        >
          Centered Layout
        </button>
      </div>

      <div className="view-menu-section">
        <button
          onClick={onToggleWordWrap}
          className="view-menu-item"
          title="Toggle Word Wrap"
        >
          Word Wrap
        </button>
        <button
          onClick={onToggleBreadcrumbs}
          className="view-menu-item"
          title="Toggle Breadcrumbs"
        >
          Breadcrumbs
        </button>
      </div>

      <div className="view-menu-section">
        <button
          onClick={handleZoomIn}
          className="view-menu-item"
          title="Zoom In"
        >
          Zoom In
        </button>
        <button
          onClick={handleZoomOut}
          className="view-menu-item"
          title="Zoom Out"
        >
          Zoom Out
        </button>
        <button
          onClick={handleZoomReset}
          className="view-menu-item"
          title="Reset Zoom"
        >
          Reset Zoom
        </button>
      </div>

      <div className="view-menu-section">
        <button
          onClick={onFlipLayout}
          className="view-menu-item"
          title="Flip Layout"
        >
          Flip Layout
        </button>
        <select
          onChange={(e) => onApplyLayoutPreset?.(e.target.value)}
          className="view-menu-select"
          title="Layout Presets"
        >
          <option value="">Apply Layout Preset...</option>
          <option value="single">Single Column</option>
          <option value="dual">Dual Column</option>
          <option value="grid">Grid Layout</option>
        </select>
      </div>
    </div>
  );
};

export default ViewMenu;
