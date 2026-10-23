import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MagneticDockEngine } from "../core/dock";

export class ChassisManager {
  private appWindow = getCurrentWindow();
  private appContainer: HTMLElement;
  private mainWindow: HTMLElement;
  private eqWindow: HTMLElement;
  private plWindow: HTMLElement;
  private mlWindow: HTMLElement;
  private milkdropWindow: HTMLElement;

  public currentScale: 1 | 2 | 3 = 1;
  public isAlwaysOnTop = false;
  public isWayland = false;
  public onStateChanged?: () => void;

  constructor() {
    this.appContainer = document.getElementById("app") as HTMLElement;
    this.mainWindow = document.querySelector(".main-window") as HTMLElement;
    this.eqWindow = document.getElementById("eq-window") as HTMLElement;
    this.plWindow = document.getElementById("pl-window") as HTMLElement;
    this.mlWindow = document.getElementById("ml-window") as HTMLElement;
    this.milkdropWindow = document.getElementById("milkdrop-window") as HTMLElement;

    this.bindEvents();
    this.initPlatform();
  }

  private async initPlatform() {
    try {
      const info = await invoke<{ os: string; is_wayland: boolean; detached_supported: boolean }>(
        "get_platform_info"
      );
      this.isWayland = info.is_wayland;
      MagneticDockEngine.isDetachedSupported = info.detached_supported;

      if (!info.detached_supported) {
        const item = document.getElementById("menu-item-toggle-detached");
        if (item) {
          item.classList.add("disabled");
          item.innerText = "Detached windows (disabled on Wayland)";
          item.title = "Wayland compositors prohibit client-side window positioning";
        }
      }
    } catch (err) {
      console.warn("Could not query platform info:", err);
    }
  }

  private bindEvents() {
    // Window control buttons
    document.getElementById("btn-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      invoke("app_close").catch(() => this.appWindow.close());
    });

    document.getElementById("btn-minimize")?.addEventListener("click", (e) => {
      e.stopPropagation();
      invoke("app_minimize").catch(() => this.appWindow.minimize());
    });

    // Windowshade toggles
    document.getElementById("btn-shade")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleWindowshade();
    });

    document.getElementById("btn-eq-shade")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleEqWindowshade();
    });

    document.getElementById("btn-pl-shade")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePlWindowshade();
    });

    // Double click titlebars
    document.querySelector(".main-window .window-titlebar")?.addEventListener("dblclick", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest("button") && !target.closest("select")) {
        this.toggleWindowshade();
      }
    });

    document.querySelector(".eq-window .window-titlebar")?.addEventListener("dblclick", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest("button") && !target.closest("select")) {
        this.toggleEqWindowshade();
      }
    });

    document.querySelector(".playlist-window .window-titlebar")?.addEventListener("dblclick", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest("button") && !target.closest("select")) {
        this.togglePlWindowshade();
      }
    });

    // Window mode radios
    document.querySelectorAll<HTMLInputElement>("input[name='window-mode']").forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const val = (e.target as HTMLInputElement).value;
        this.setDetachedMode(val === "detached");
      });
    });

    // 29px-stepped playlist resizing
    this.initPlaylistResize();
  }

  public toggleWindowshade() {
    this.mainWindow?.classList.toggle("windowshade");
    this.fitWindowToDockedStack();
    this.onStateChanged?.();
  }

  public toggleEqWindowshade() {
    this.eqWindow?.classList.toggle("windowshade");
    this.fitWindowToDockedStack();
    this.onStateChanged?.();
  }

  public togglePlWindowshade() {
    this.plWindow?.classList.toggle("windowshade");
    this.fitWindowToDockedStack();
    this.onStateChanged?.();
  }

  public setAppScale(scale: 1 | 2 | 3) {
    this.currentScale = scale;
    this.appContainer.classList.remove("scale-1x", "scale-2x", "scale-3x");
    this.appContainer.classList.add(`scale-${scale}x`);

    document.getElementById("menu-scale-1x")?.classList.toggle("checked", scale === 1);
    document.getElementById("menu-scale-2x")?.classList.toggle("checked", scale === 2);
    document.getElementById("menu-scale-3x")?.classList.toggle("checked", scale === 3);

    this.fitWindowToDockedStack();
    this.onStateChanged?.();
  }

  public async setAlwaysOnTop(ontop: boolean) {
    this.isAlwaysOnTop = ontop;
    try {
      await invoke("app_set_always_on_top", { alwaysOnTop: ontop });
    } catch {
      await this.appWindow.setAlwaysOnTop(ontop).catch(() => {});
    }
    document.getElementById("menu-item-toggle-ontop")?.classList.toggle("checked", ontop);
    document.getElementById("clutter-a")?.classList.toggle("active", ontop);
    this.onStateChanged?.();
  }

  public setDetachedMode(detached: boolean) {
    if (this.isWayland && detached) {
      alert("Detached windows are disabled under Wayland compositors (Wayland protocol prohibits client window positioning).");
      return;
    }

    MagneticDockEngine.setDetachedMode(detached, this.appContainer);

    const radios = document.querySelectorAll<HTMLInputElement>("input[name='window-mode']");
    radios.forEach((r) => {
      r.checked = r.value === (detached ? "detached" : "docked");
    });

    document.getElementById("menu-item-toggle-detached")?.classList.toggle("checked", detached);

    this.fitWindowToDockedStack();
    this.onStateChanged?.();
  }

  public async fitWindowToDockedStack() {
    if (MagneticDockEngine.isDetachedMode) {
      const detachedW = 1024 * this.currentScale;
      const detachedH = 768 * this.currentScale;
      try {
        await invoke("app_set_window_size", { width: detachedW, height: detachedH });
      } catch {
        await this.appWindow.setSize({ type: "Logical", width: detachedW, height: detachedH } as any).catch(() => {});
      }
      return;
    }

    const baseW = 275;
    let totalH = this.mainWindow.classList.contains("windowshade") ? 14 : 116;

    if (this.eqWindow && this.eqWindow.style.display !== "none") {
      totalH += this.eqWindow.classList.contains("windowshade") ? 14 : 116;
    }
    if (this.plWindow && this.plWindow.style.display !== "none") {
      totalH += this.plWindow.classList.contains("windowshade") ? 14 : (this.plWindow.offsetHeight || 116);
    }
    if (this.mlWindow && this.mlWindow.style.display !== "none") {
      totalH += this.mlWindow.offsetHeight || 200;
    }
    if (this.milkdropWindow && this.milkdropWindow.style.display !== "none") {
      totalH += this.milkdropWindow.offsetHeight || 240;
    }

    const targetW = Math.max(baseW * this.currentScale, 275);
    const targetH = Math.max(totalH * this.currentScale, 116);

    try {
      await invoke("app_set_window_size", { width: targetW, height: targetH });
    } catch {
      await this.appWindow.setSize({ type: "Logical", width: targetW, height: targetH } as any).catch(() => {});
    }
  }

  private initPlaylistResize() {
    const plResizeHandle = document.getElementById("pl-resize-handle");
    if (!plResizeHandle || !this.plWindow) return;

    let isResizing = false;
    let startY = 0;
    let startHeight = 116;

    plResizeHandle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startY = e.clientY;
      startHeight = this.plWindow.offsetHeight || 116;

      const onMove = (moveEvent: MouseEvent) => {
        if (!isResizing) return;
        const dy = moveEvent.clientY - startY;
        const steps = Math.round(dy / 29);
        const newHeight = Math.max(116, startHeight + steps * 29);
        this.plWindow.style.height = `${newHeight}px`;
        this.fitWindowToDockedStack();
      };

      const onUp = () => {
        isResizing = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        this.fitWindowToDockedStack();
        this.onStateChanged?.();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }
}
