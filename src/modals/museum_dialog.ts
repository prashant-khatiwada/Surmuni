import { SkinMuseumClient } from "../skin/museum";
import { WszSkinEngine } from "../skin/wsz_engine";

export class MuseumModal {
  private windowEl: HTMLElement;
  private gridEl: HTMLElement;
  private searchInput: HTMLInputElement;
  private onSkinApplied: (visColors?: string[]) => void;

  constructor(onSkinApplied: (visColors?: string[]) => void) {
    this.onSkinApplied = onSkinApplied;
    this.windowEl = document.getElementById("museum-window") as HTMLElement;
    this.gridEl = document.getElementById("museum-grid") as HTMLElement;
    this.searchInput = document.getElementById("museum-search-input") as HTMLInputElement;

    this.bindEvents();
  }

  private bindEvents() {
    document.getElementById("btn-museum-close")?.addEventListener("click", () => this.close());
    document.getElementById("btn-museum-search")?.addEventListener("click", () => {
      this.open(this.searchInput.value);
    });
    this.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.open(this.searchInput.value);
    });
  }

  public async open(query = "classic") {
    if (!this.windowEl) return;
    this.windowEl.style.display = "flex";
    this.gridEl.innerHTML = `<div class="empty-playlist-msg">Fetching 65k+ retro skins from Skin Museum...</div>`;

    const skins = await SkinMuseumClient.searchSkins(query);
    this.gridEl.innerHTML = "";

    if (skins.length === 0) {
      this.gridEl.innerHTML = `<div class="empty-playlist-msg">No skins found for "${query}". Try "classic", "neon", or "retro".</div>`;
      return;
    }

    skins.forEach((s) => {
      const card = document.createElement("div");
      card.className = "museum-card";
      card.innerHTML = `
        <img src="${s.screenshot_url}" class="museum-thumb" onerror="this.src='https://skins.webamp.org/static/media/screenshot.b0445d3e.png'" />
        <span class="museum-title">${s.name}</span>
      `;

      card.addEventListener("click", async () => {
        if (!s.download_url) {
          alert("This skin does not have a valid download link.");
          return;
        }

        const titleEl = card.querySelector(".museum-title");
        if (titleEl) titleEl.textContent = "Downloading & Unpacking...";
        card.style.opacity = "0.5";
        card.style.pointerEvents = "none";

        const manifest = await WszSkinEngine.downloadAndApplySkin(s.download_url);

        card.style.opacity = "1";
        card.style.pointerEvents = "auto";
        if (titleEl) titleEl.textContent = s.name;

        if (manifest) {
          this.close();
          this.onSkinApplied(manifest.vis_colors);
        }
      });

      this.gridEl.appendChild(card);
    });
  }

  public close() {
    if (this.windowEl) {
      this.windowEl.style.display = "none";
    }
  }
}
