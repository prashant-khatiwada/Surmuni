import { AudioService } from "../core/audio";
import { TrackMetadata } from "../core/types";

export class MediaLibraryManager {
  private windowEl: HTMLElement;
  private searchInput: HTMLInputElement;
  private scanBtn: HTMLButtonElement;
  private tracksContainer: HTMLElement;
  private statusText: HTMLElement;
  private onTrackSelected: (track: TrackMetadata) => void;
  private debounceTimer: number | null = null;

  constructor(
    windowEl: HTMLElement,
    searchInput: HTMLInputElement,
    scanBtn: HTMLButtonElement,
    tracksContainer: HTMLElement,
    statusText: HTMLElement,
    onTrackSelected: (track: TrackMetadata) => void
  ) {
    this.windowEl = windowEl;
    this.searchInput = searchInput;
    this.scanBtn = scanBtn;
    this.tracksContainer = tracksContainer;
    this.statusText = statusText;
    this.onTrackSelected = onTrackSelected;

    this.bindEvents();
    this.loadInitialTracks();
  }

  private bindEvents() {
    this.scanBtn.addEventListener("click", async () => {
      const folder = await AudioService.pickFolder();
      if (!folder) return;

      this.statusText.innerText = `Scanning ${folder}...`;
      try {
        const added = await AudioService.scanLibraryFolder(folder);
        this.statusText.innerText = `Indexed ${added} tracks from folder.`;
        this.search(this.searchInput.value);
      } catch (e) {
        this.statusText.innerText = `Scan error: ${e}`;
      }
    });

    this.searchInput.addEventListener("input", () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.search(this.searchInput.value);
      }, 150);
    });
  }

  async loadInitialTracks() {
    try {
      const tracks = await AudioService.getLibraryTracks();
      this.renderTracks(tracks);
    } catch (e) {
      console.warn("Could not load initial library tracks:", e);
    }
  }

  async search(query: string) {
    try {
      const tracks = await AudioService.searchLibrary(query);
      this.renderTracks(tracks);
    } catch (e) {
      this.statusText.innerText = `Search error: ${e}`;
    }
  }

  toggle() {
    const isHidden = this.windowEl.style.display === "none";
    this.windowEl.style.display = isHidden ? "flex" : "none";
    if (isHidden) {
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  private renderTracks(tracks: TrackMetadata[]) {
    this.tracksContainer.innerHTML = "";
    if (tracks.length === 0) {
      this.tracksContainer.innerHTML = `<div class="empty-playlist-msg">No tracks found.</div>`;
      this.statusText.innerText = `0 tracks`;
      return;
    }

    this.statusText.innerText = `${tracks.length} tracks found in database`;

    tracks.forEach((track) => {
      const item = document.createElement("div");
      item.className = "playlist-item";
      item.innerHTML = `
        <span>${track.artist} - ${track.title}</span>
        <span>${track.album || ""}</span>
      `;
      item.addEventListener("dblclick", () => {
        this.onTrackSelected(track);
      });
      this.tracksContainer.appendChild(item);
    });
  }
}
