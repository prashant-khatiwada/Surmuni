// Dynamic Retro Micro-Tooltip System for Winamp UI

let microTooltip: HTMLElement | null = null;

export function initMicroTooltip(): HTMLElement {
  if (!microTooltip) {
    microTooltip = document.createElement("div");
    microTooltip.className = "winamp-micro-tooltip";
    document.body.appendChild(microTooltip);
  }
  return microTooltip;
}

export function bindMicroTooltip(el: HTMLElement | null, textFn: () => string): void {
  if (!el) return;
  const tip = initMicroTooltip();

  el.addEventListener("mouseenter", (e) => {
    tip.textContent = textFn();
    tip.style.left = `${e.clientX + 10}px`;
    tip.style.top = `${e.clientY + 12}px`;
    tip.style.display = "block";
  });

  el.addEventListener("mousemove", (e) => {
    tip.textContent = textFn();
    tip.style.left = `${Math.min(e.clientX + 10, window.innerWidth - 120)}px`;
    tip.style.top = `${e.clientY + 12}px`;
  });

  el.addEventListener("mouseleave", () => {
    tip.style.display = "none";
  });
}
