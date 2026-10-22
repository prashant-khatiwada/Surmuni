// Magnetic Snap & Tethered Dock Engine for Surmuni / Winamp
// Emulates Winamp 2.x's snap.cpp physics with 12px magnetic attraction,
// supports both:
// 1. "Docked Stack" mode (all windows stacked into one unified frame)
// 2. "Detached Windows" mode (windows can be pulled apart, moved freely, and snap back together)

export interface WindowRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MagneticDockEngine {
  private static readonly SNAP_DISTANCE = 14; // 14px magnetic snap threshold
  public static isDetachedMode = false;
  private static dockedGroups: Map<string, Set<string>> = new Map(); // id -> set of docked window IDs

  static snapToWindows(
    movingRect: WindowRect,
    otherRects: WindowRect[]
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snappedToId?: string } {
    let bestX = movingRect.x;
    let bestY = movingRect.y;
    let snappedX = false;
    let snappedY = false;
    let snappedToId: string | undefined = undefined;

    let minDiffX = MagneticDockEngine.SNAP_DISTANCE;
    let minDiffY = MagneticDockEngine.SNAP_DISTANCE;

    for (const target of otherRects) {
      // Horizontal alignments:
      // 1. movingRect.left -> target.right
      const diffLeftToRight = Math.abs(movingRect.x - (target.x + target.width));
      if (diffLeftToRight < minDiffX) {
        minDiffX = diffLeftToRight;
        bestX = target.x + target.width;
        snappedX = true;
        snappedToId = target.id;
      }

      // 2. movingRect.right -> target.left
      const diffRightToLeft = Math.abs((movingRect.x + movingRect.width) - target.x);
      if (diffRightToLeft < minDiffX) {
        minDiffX = diffRightToLeft;
        bestX = target.x - movingRect.width;
        snappedX = true;
        snappedToId = target.id;
      }

      // 3. movingRect.left -> target.left (flush vertical alignment)
      const diffLeftToLeft = Math.abs(movingRect.x - target.x);
      if (diffLeftToLeft < minDiffX) {
        minDiffX = diffLeftToLeft;
        bestX = target.x;
        snappedX = true;
        snappedToId = target.id;
      }

      // Vertical alignments:
      // 1. movingRect.top -> target.bottom
      const diffTopToBottom = Math.abs(movingRect.y - (target.y + target.height));
      if (diffTopToBottom < minDiffY) {
        minDiffY = diffTopToBottom;
        bestY = target.y + target.height;
        snappedY = true;
        snappedToId = target.id;
      }

      // 2. movingRect.bottom -> target.top
      const diffBottomToTop = Math.abs((movingRect.y + movingRect.height) - target.y);
      if (diffBottomToTop < minDiffY) {
        minDiffY = diffBottomToTop;
        bestY = target.y - movingRect.height;
        snappedY = true;
        snappedToId = target.id;
      }

      // 3. movingRect.top -> target.top (flush horizontal alignment)
      const diffTopToTop = Math.abs(movingRect.y - target.y);
      if (diffTopToTop < minDiffY) {
        minDiffY = diffTopToTop;
        bestY = target.y;
        snappedY = true;
        snappedToId = target.id;
      }
    }

    return { x: bestX, y: bestY, snappedX, snappedY, snappedToId };
  }

  // Attaches native mouse dragging and magnetic snapping to an element
  static enableSnapping(element: HTMLElement, container: HTMLElement, onNativeDrag?: () => void) {
    const handle = element.querySelector(".window-titlebar") as HTMLElement;
    if (!handle) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

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
      // Ignore clicks on buttons/inputs
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("select") || target.closest("input")) return;
      if (e.button !== 0) return;

      // If in docked mode, delegate to Tauri native window dragging
      if (!MagneticDockEngine.isDetachedMode) {
        if (onNativeDrag) onNativeDrag();
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      initialLeft = rect.left - parentRect.left;
      initialTop = rect.top - parentRect.top;

      element.style.position = "absolute";
      element.style.zIndex = "100";
      element.style.left = `${initialLeft}px`;
      element.style.top = `${initialTop}px`;
      element.style.width = `${rect.width}px`;

      // Track docked windows that should move along with this window
      const dockedFollowers: { el: HTMLElement; origLeft: number; origTop: number }[] = [];
      const currentId = element.id || "main-window";
      const group = MagneticDockEngine.dockedGroups.get(currentId);

      if (group) {
        group.forEach((otherId) => {
          const otherEl = document.getElementById(otherId);
          if (otherEl && otherEl !== element && otherEl.style.display !== "none") {
            const oRect = otherEl.getBoundingClientRect();
            dockedFollowers.push({
              el: otherEl,
              origLeft: oRect.left - parentRect.left,
              origTop: oRect.top - parentRect.top,
            });
          }
        });
      }

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let curX = initialLeft + dx;
        let curY = initialTop + dy;

        // Gather bounding boxes of all other visible windows in container
        const otherRects: WindowRect[] = [];
        const windows = container.querySelectorAll<HTMLElement>(".winamp-window");
        windows.forEach((w) => {
          if (w !== element && w.style.display !== "none") {
            const wRect = w.getBoundingClientRect();
            otherRects.push({
              id: w.id || "unnamed-window",
              x: wRect.left - parentRect.left,
              y: wRect.top - parentRect.top,
              width: wRect.width,
              height: wRect.height,
            });
          }
        });

        const movingRect: WindowRect = {
          id: currentId,
          x: curX,
          y: curY,
          width: element.offsetWidth,
          height: element.offsetHeight,
        };

        const snapped = MagneticDockEngine.snapToWindows(movingRect, otherRects);
        element.style.left = `${snapped.x}px`;
        element.style.top = `${snapped.y}px`;

        // If snapped to another window, register dock relationship
        if (snapped.snappedToId) {
          if (!MagneticDockEngine.dockedGroups.has(currentId)) {
            MagneticDockEngine.dockedGroups.set(currentId, new Set());
          }
          MagneticDockEngine.dockedGroups.get(currentId)!.add(snapped.snappedToId);

          if (!MagneticDockEngine.dockedGroups.has(snapped.snappedToId)) {
            MagneticDockEngine.dockedGroups.set(snapped.snappedToId, new Set());
          }
          MagneticDockEngine.dockedGroups.get(snapped.snappedToId)!.add(currentId);
        }

        // Move all docked follower windows simultaneously with 0ms lag
        const actualDx = snapped.x - initialLeft;
        const actualDy = snapped.y - initialTop;
        dockedFollowers.forEach((follower) => {
          follower.el.style.left = `${follower.origLeft + actualDx}px`;
          follower.el.style.top = `${follower.origTop + actualDy}px`;
        });
      };

      const onMouseUp = () => {
        isDragging = false;
        element.style.zIndex = "25";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  // Switch between Docked Stack and Detached Windows mode
  static setDetachedMode(detached: boolean, container: HTMLElement) {
    MagneticDockEngine.isDetachedMode = detached;
    const windows = container.querySelectorAll<HTMLElement>(".winamp-window");

    if (detached) {
      container.classList.add("detached-canvas");
      // Calculate spread-out or side-by-side retro initial layout
      let currentTop = 10;
      windows.forEach((w) => {
        if (w.style.display !== "none") {
          const rect = w.getBoundingClientRect();
          w.style.position = "absolute";
          w.style.left = w.style.left || "16px";
          w.style.top = `${currentTop}px`;
          w.style.zIndex = "15";
          currentTop += rect.height + 6;
        }
      });
    } else {
      container.classList.remove("detached-canvas");
      // Reset all windows to relative stacked layout
      windows.forEach((w) => {
        w.style.position = "static";
        w.style.left = "";
        w.style.top = "";
        w.style.zIndex = "";
      });
      MagneticDockEngine.dockedGroups.clear();
    }
  }
}
