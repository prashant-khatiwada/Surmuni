// Magnetic Snap & Tethered Dock Engine for Surmuni / Winamp
// 1:1 Parity with OneAmp (layout.rs) and Winamp 2.x geometry:
// - Transitive docked groups (docked_group): windows touching share a group.
// - Follower dragging: moving any window moves all transitively docked windows.
// - 12px magnetic edge snapping with orthogonal axis proximity checks.
// - Full support for Docked Stack vs Detached Windows across macOS, Windows, X11 (Wayland keeps docked stack).

export interface WindowRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MagneticDockEngine {
  public static readonly SNAP_DISTANCE = 12; // 12px magnetic snap threshold (matches Winamp/OneAmp 10-12px)
  public static readonly TOUCH_EPS = 2.5; // Two edges closer than this count as touching
  public static isDetachedMode = false;
  public static isDetachedSupported = true; // False on Linux Wayland
  private static windowPositions: Map<string, { x: number; y: number }> = new Map();

  /**
   * Two rects touch if they share an edge (vertical or horizontal) and overlap along the other axis.
   */
  static touching(a: WindowRect, b: WindowRect): boolean {
    const overlapX = a.x < (b.x + b.width - this.TOUCH_EPS) && b.x < (a.x + a.width - this.TOUCH_EPS);
    const overlapY = a.y < (b.y + b.height - this.TOUCH_EPS) && b.y < (a.y + a.height - this.TOUCH_EPS);

    const verticalEdge =
      Math.abs((a.x + a.width) - b.x) <= this.TOUCH_EPS ||
      Math.abs((b.x + b.width) - a.x) <= this.TOUCH_EPS;

    const horizontalEdge =
      Math.abs((a.y + a.height) - b.y) <= this.TOUCH_EPS ||
      Math.abs((b.y + b.height) - a.y) <= this.TOUCH_EPS;

    return (verticalEdge && overlapY) || (horizontalEdge && overlapX);
  }

  /**
   * Computes all windows transitively docked to rootId.
   */
  static getDockedGroup(rects: Map<string, WindowRect>, rootId: string): Set<string> {
    const group = new Set<string>([rootId]);
    let added = true;

    while (added) {
      added = false;
      for (const id of Array.from(group)) {
        const current = rects.get(id);
        if (!current) continue;

        for (const [targetId, targetRect] of rects.entries()) {
          if (!group.has(targetId) && this.touching(current, targetRect)) {
            group.add(targetId);
            added = true;
          }
        }
      }
    }

    return group;
  }

  /**
   * Corrects move delta so moving rects snap onto target edges.
   */
  static snapOffset(
    movingGroup: WindowRect[],
    targets: WindowRect[]
  ): { dx: number; dy: number; snapped: boolean } {
    let bestDx: number | null = null;
    let bestDy: number | null = null;

    const considerX = (d: number) => {
      if (Math.abs(d) <= MagneticDockEngine.SNAP_DISTANCE) {
        if (bestDx === null || Math.abs(d) < Math.abs(bestDx)) {
          bestDx = d;
        }
      }
    };

    const considerY = (d: number) => {
      if (Math.abs(d) <= MagneticDockEngine.SNAP_DISTANCE) {
        if (bestDy === null || Math.abs(d) < Math.abs(bestDy)) {
          bestDy = d;
        }
      }
    };

    for (const m of movingGroup) {
      for (const t of targets) {
        // Only snap sideways when rects are near each other on Y axis
        const nearY =
          m.y <= (t.y + t.height + MagneticDockEngine.SNAP_DISTANCE) &&
          t.y <= (m.y + m.height + MagneticDockEngine.SNAP_DISTANCE);

        // Only snap vertically when rects are near each other on X axis
        const nearX =
          m.x <= (t.x + t.width + MagneticDockEngine.SNAP_DISTANCE) &&
          t.x <= (m.x + m.width + MagneticDockEngine.SNAP_DISTANCE);

        if (nearY) {
          considerX((t.x + t.width) - m.x); // left to right edge
          considerX(t.x - (m.x + m.width)); // right to left edge
          considerX(t.x - m.x);             // align lefts
          considerX((t.x + t.width) - (m.x + m.width)); // align rights
        }

        if (nearX) {
          considerY((t.y + t.height) - m.y); // top to bottom edge
          considerY(t.y - (m.y + m.height)); // bottom to top edge
          considerY(t.y - m.y);             // align tops
          considerY((t.y + t.height) - (m.y + m.height)); // align bottoms
        }
      }
    }

    return {
      dx: bestDx ?? 0,
      dy: bestDy ?? 0,
      snapped: bestDx !== null || bestDy !== null,
    };
  }

  /**
   * Attaches mouse dragging and magnetic snapping to a window.
   */
  static enableSnapping(
    element: HTMLElement,
    container: HTMLElement,
    onNativeDrag?: () => void,
    onMoveEnd?: () => void
  ) {
    const handle = element.querySelector(".window-titlebar") as HTMLElement;
    if (!handle) return;

    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let initialPositions = new Map<string, { left: number; top: number }>();
    let movingIds = new Set<string>();

    handle.style.cursor = "move";

    // Bring clicked window to front
    element.addEventListener("mousedown", () => {
      if (!MagneticDockEngine.isDetachedMode) return;
      const allWindows = container.querySelectorAll<HTMLElement>(".winamp-window");
      allWindows.forEach((w) => {
        if (w !== element && parseInt(w.style.zIndex || "10") >= 20) {
          w.style.zIndex = "10";
        }
      });
      element.style.zIndex = "25";
    });

    handle.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("select") || target.closest("input")) return;
      if (e.button !== 0) return;

      // In docked mode, delegate to Tauri native window dragging
      if (!MagneticDockEngine.isDetachedMode) {
        if (onNativeDrag) onNativeDrag();
        return;
      }

      isDragging = true;
      startPointerX = e.clientX;
      startPointerY = e.clientY;

      const parentRect = container.getBoundingClientRect();

      // Read current rects of all visible windows
      const currentRects = new Map<string, WindowRect>();
      const allWindows = container.querySelectorAll<HTMLElement>(".winamp-window");

      allWindows.forEach((w) => {
        if (w.style.display !== "none") {
          const wRect = w.getBoundingClientRect();
          const left = wRect.left - parentRect.left;
          const top = wRect.top - parentRect.top;
          currentRects.set(w.id, {
            id: w.id,
            x: left,
            y: top,
            width: w.offsetWidth,
            height: w.offsetHeight,
          });
        }
      });

      // Compute which windows are transitively docked to this one
      const currentId = element.id;
      movingIds = MagneticDockEngine.getDockedGroup(currentRects, currentId);

      // Snapshot initial positions for all moving group members
      initialPositions.clear();
      movingIds.forEach((id) => {
        const wEl = document.getElementById(id);
        if (wEl) {
          const r = wEl.getBoundingClientRect();
          const left = r.left - parentRect.left;
          const top = r.top - parentRect.top;
          initialPositions.set(id, { left, top });
          wEl.style.position = "absolute";
          wEl.style.left = `${left}px`;
          wEl.style.top = `${top}px`;
          wEl.style.zIndex = id === currentId ? "30" : "28";
        }
      });

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return;

        const rawDx = moveEvent.clientX - startPointerX;
        const rawDy = moveEvent.clientY - startPointerY;

        // If the user drags away with significant force (> 20px) while other group members exist,
        // break away and drag only this window
        if (movingIds.size > 1 && (Math.abs(rawDx) > 28 || Math.abs(rawDy) > 28) && moveEvent.shiftKey) {
          movingIds = new Set([currentId]);
        }

        // Build target rects (windows that are NOT moving)
        const targets: WindowRect[] = [];
        allWindows.forEach((w) => {
          if (w.style.display !== "none" && !movingIds.has(w.id)) {
            const r = w.getBoundingClientRect();
            targets.push({
              id: w.id,
              x: r.left - parentRect.left,
              y: r.top - parentRect.top,
              width: w.offsetWidth,
              height: w.offsetHeight,
            });
          }
        });

        // Compute proposed moving rects
        const movingRects: WindowRect[] = [];
        movingIds.forEach((id) => {
          const init = initialPositions.get(id);
          const wEl = document.getElementById(id);
          if (init && wEl) {
            movingRects.push({
              id,
              x: init.left + rawDx,
              y: init.top + rawDy,
              width: wEl.offsetWidth,
              height: wEl.offsetHeight,
            });
          }
        });

        // Calculate magnetic snap offset
        const snap = MagneticDockEngine.snapOffset(movingRects, targets);
        const finalDx = rawDx + snap.dx;
        const finalDy = rawDy + snap.dy;

        // Move all members of the moving group synchronously
        movingIds.forEach((id) => {
          const init = initialPositions.get(id);
          const wEl = document.getElementById(id);
          if (init && wEl) {
            const newX = Math.max(0, init.left + finalDx);
            const newY = Math.max(0, init.top + finalDy);
            wEl.style.left = `${newX}px`;
            wEl.style.top = `${newY}px`;
            MagneticDockEngine.windowPositions.set(id, { x: newX, y: newY });
          }
        });
      };

      const onMouseUp = () => {
        isDragging = false;
        movingIds.forEach((id) => {
          const wEl = document.getElementById(id);
          if (wEl) wEl.style.zIndex = "15";
        });
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        if (onMoveEnd) onMoveEnd();
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  /**
   * Switch between Docked Stack and Detached Windows mode.
   */
  static setDetachedMode(detached: boolean, container: HTMLElement) {
    if (detached && !MagneticDockEngine.isDetachedSupported) {
      console.warn("Detached mode is not supported on Wayland. Keeping docked stack.");
      return;
    }

    MagneticDockEngine.isDetachedMode = detached;
    const windows = container.querySelectorAll<HTMLElement>(".winamp-window");

    if (detached) {
      container.classList.add("detached-canvas");
      // Restore or initialize positions for detached windows
      let offsetTop = 16;
      windows.forEach((w) => {
        if (w.style.display !== "none") {
          const saved = MagneticDockEngine.windowPositions.get(w.id);
          w.style.position = "absolute";
          w.style.left = saved ? `${saved.x}px` : "20px";
          w.style.top = saved ? `${saved.y}px` : `${offsetTop}px`;
          w.style.zIndex = "15";
          offsetTop += (w.offsetHeight || 116) + 12;
        }
      });
    } else {
      container.classList.remove("detached-canvas");
      // Reset all windows to docked vertical stack
      windows.forEach((w) => {
        w.style.position = "relative";
        w.style.left = "";
        w.style.top = "";
        w.style.zIndex = "";
      });
    }
  }

  /**
   * Get saved positions for session persistence.
   */
  static getPositions(): Record<string, { x: number; y: number }> {
    const out: Record<string, { x: number; y: number }> = {};
    MagneticDockEngine.windowPositions.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  /**
   * Restore positions from session storage.
   */
  static restorePositions(positions: Record<string, { x: number; y: number }>) {
    if (!positions) return;
    Object.entries(positions).forEach(([k, v]) => {
      MagneticDockEngine.windowPositions.set(k, v);
    });
  }
}
