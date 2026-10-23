export interface ShortcutActions {
  onPlayPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenPreferences: () => void;
  onOpenRadioUrl: () => void;
  onOpenJump: () => void;
  onToggleDetached: () => void;
  onToggleScale2x: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleEqualizer: () => void;
  onTogglePlaylist: () => void;
  onToggleVisualizer: () => void;
  onUndoPlaylist: () => void;
  onDeleteSelected: () => void;
}

export function registerKeyboardShortcuts(actions: ShortcutActions): void {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    // Global: Ctrl+P / Cmd+P for Preferences
    if (key === "p" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      actions.onOpenPreferences();
      return;
    }

    // Global: Ctrl+L / Cmd+L for Internet Radio URL
    if (key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      actions.onOpenRadioUrl();
      return;
    }

    // Skip text inputs unless modifier key was pressed
    const activeTag = (document.activeElement?.tagName || "").toLowerCase();
    if (activeTag === "input" || activeTag === "select" || activeTag === "textarea") {
      return;
    }

    if (key === "z") {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        actions.onUndoPlaylist();
      } else {
        actions.onPrev();
      }
    } else if (key === "x" || key === "c" || e.code === "Space") {
      e.preventDefault();
      actions.onPlayPause();
    } else if (key === "v") {
      actions.onStop();
    } else if (key === "b") {
      actions.onNext();
    } else if (key === "j" || e.key === "F3") {
      e.preventDefault();
      actions.onOpenJump();
    } else if (e.ctrlKey && e.shiftKey && key === "k") {
      e.preventDefault();
      actions.onToggleVisualizer();
    } else if (e.altKey && key === "d") {
      e.preventDefault();
      actions.onToggleDetached();
    } else if ((e.ctrlKey || e.metaKey) && key === "d") {
      e.preventDefault();
      actions.onToggleScale2x();
    } else if ((e.ctrlKey || e.metaKey) && key === "a") {
      e.preventDefault();
      actions.onToggleAlwaysOnTop();
    } else if (e.altKey && key === "g") {
      e.preventDefault();
      actions.onToggleEqualizer();
    } else if (e.altKey && key === "e") {
      e.preventDefault();
      actions.onTogglePlaylist();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      actions.onDeleteSelected();
    }
  });
}
