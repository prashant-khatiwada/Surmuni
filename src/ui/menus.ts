import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface MenuActionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenFile: () => void;
  onOpenUrl: () => void;
  onClearPlaylist: () => void;
  onSetScale: (scale: 1 | 2 | 3) => void;
  onSetVisMode: (mode: number) => void;
  onToggleVisWindow: () => void;
  onToggleShade: () => void;
  onToggleEq: () => void;
  onTogglePl: () => void;
  onToggleDetached: () => void;
  onToggleAlwaysOnTop: () => void;
  onOpenMuseum: () => void;
  onOpenPrefs: () => void;
  onToggleMono: () => void;
  onToggleLoudness: () => void;
  onToggleReplayGain: () => void;
}

export class WinampMenuManager {
  private menuEl: HTMLElement;
  private appWindow = getCurrentWindow();

  constructor(callbacks: MenuActionCallbacks) {
    this.menuEl = document.getElementById("winamp-main-menu") as HTMLElement;
    this.bindEvents(callbacks);
  }

  public open(_x: number, y: number) {
    if (!this.menuEl) return;
    const menuLeft = 160;
    const clampedY = Math.max(5, Math.min(y, 116 - 80));
    this.menuEl.style.left = `${menuLeft}px`;
    this.menuEl.style.top = `${clampedY}px`;
    this.menuEl.style.display = "block";
  }

  public close() {
    if (this.menuEl) {
      this.menuEl.style.display = "none";
    }
  }

  private bindEvents(cb: MenuActionCallbacks) {
    // Outside click dismiss
    window.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#winamp-main-menu") &&
        !target.closest("#clutter-o") &&
        !target.closest("#btn-pref-icon")
      ) {
        this.close();
      }
    });

    // Wire actions
    const wire = (id: string, action: () => void) => {
      document.getElementById(id)?.addEventListener("click", () => {
        action();
        this.close();
      });
    };

    wire("menu-item-play", cb.onPlay);
    wire("menu-item-pause", cb.onPause);
    wire("menu-item-stop", cb.onStop);
    wire("menu-item-prev", cb.onPrev);
    wire("menu-item-next", cb.onNext);
    wire("menu-item-open-file", cb.onOpenFile);
    wire("menu-item-open-url", cb.onOpenUrl);
    wire("menu-item-clear-pl", cb.onClearPlaylist);
    wire("menu-item-quit", () => {
      invoke("app_close").catch(() => this.appWindow.close());
    });

    wire("menu-scale-1x", () => cb.onSetScale(1));
    wire("menu-scale-2x", () => cb.onSetScale(2));
    wire("menu-scale-3x", () => cb.onSetScale(3));

    wire("menu-vis-spectrum", () => cb.onSetVisMode(0));
    wire("menu-vis-oscilloscope", () => cb.onSetVisMode(1));
    wire("menu-vis-vu", () => cb.onSetVisMode(2));
    wire("menu-vis-milkdrop", cb.onToggleVisWindow);
    wire("menu-vis-off", () => cb.onSetVisMode(3));

    wire("menu-item-shade", cb.onToggleShade);
    wire("menu-item-toggle-eq", cb.onToggleEq);
    wire("menu-item-toggle-pl", cb.onTogglePl);
    wire("menu-item-toggle-detached", cb.onToggleDetached);
    wire("menu-item-toggle-ontop", cb.onToggleAlwaysOnTop);
    wire("menu-item-change-skin", cb.onOpenMuseum);
    wire("menu-item-mono", cb.onToggleMono);
    wire("menu-item-loudness", cb.onToggleLoudness);
    wire("menu-item-replaygain", cb.onToggleReplayGain);
    wire("menu-item-prefs", cb.onOpenPrefs);

    wire("menu-item-shortcuts", () => {
      alert(
        "Surmuni Keyboard Shortcuts:\n\n" +
          "Space / X: Play / Pause\n" +
          "C: Pause\n" +
          "V: Stop\n" +
          "Z: Previous Track\n" +
          "B: Next Track\n" +
          "J / F3: Jump to File\n" +
          "I: File Info / Tag Editor\n" +
          "Alt+D: Detached Windows\n" +
          "Ctrl+D: 2× Double Size\n" +
          "Ctrl+A: Always on Top\n" +
          "Alt+G: Toggle Equalizer\n" +
          "Alt+E: Toggle Playlist\n" +
          "Ctrl+Shift+K: MilkDrop 2 Visualizer\n" +
          "Ctrl+P: Preferences\n" +
          "Ctrl+L: Open Audio Stream URL\n" +
          "Ctrl+Z: Undo Playlist Action\n" +
          "Del / Backspace: Remove Selected Track\n" +
          "Esc: Cancel background folder scan"
      );
    });

    wire("menu-item-about", () => {
      alert(
        "Surmuni v1.5.0\nAuthentic, Bit-Perfect Winamp 2.x Experience\nDesktop parity with OneAmp & Classic Winamp\n\nBuilt with Rust, Tauri v2 & Web Audio API.\nLicensed under GNU GPLv3."
      );
    });
  }
}
