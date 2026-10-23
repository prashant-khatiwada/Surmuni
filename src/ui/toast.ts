// Retro In-App Toast & Notification helper

let toastContainer: HTMLElement | null = null;

export function showRetroToast(message: string, durationMs = 2800): void {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "retro-toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "retro-toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger smooth slide in
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, durationMs);
}
