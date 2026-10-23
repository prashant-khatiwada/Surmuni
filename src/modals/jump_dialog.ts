import { PlaylistManager } from "../core/playlist";

export class JumpToFileModal {
  private windowEl: HTMLElement;
  private searchInput: HTMLInputElement;
  private resultsContainer: HTMLElement;
  private btnPlay: HTMLButtonElement;
  private btnQueue: HTMLButtonElement;
  private playlist: PlaylistManager;
  private onPlayTrack: (index: number) => void;
  private onPlaylistChanged: () => void;

  private currentMatches: number[] = [];
  private selectedIndex = -1;

  constructor(
    playlist: PlaylistManager,
    onPlayTrack: (index: number) => void,
    onPlaylistChanged: () => void
  ) {
    this.playlist = playlist;
    this.onPlayTrack = onPlayTrack;
    this.onPlaylistChanged = onPlaylistChanged;

    this.windowEl = document.getElementById("jump-window") as HTMLElement;
    this.searchInput = document.getElementById("jump-search-input") as HTMLInputElement;
    this.resultsContainer = document.getElementById("jump-results") as HTMLElement;
    this.btnPlay = document.getElementById("btn-jump-play") as HTMLButtonElement;
    this.btnQueue = document.getElementById("btn-jump-queue") as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents() {
    document.getElementById("btn-jump-close")?.addEventListener("click", () => this.close());

    this.searchInput?.addEventListener("input", () => {
      this.renderResults(this.searchInput.value);
    });

    this.btnPlay?.addEventListener("click", () => {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.currentMatches.length) {
        const trackIdx = this.currentMatches[this.selectedIndex];
        this.onPlayTrack(trackIdx);
        this.close();
      }
    });

    this.btnQueue?.addEventListener("click", () => {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.currentMatches.length) {
        const trackIdx = this.currentMatches[this.selectedIndex];
        this.playlist.queueNext(trackIdx);
        this.onPlaylistChanged();
        this.renderResults(this.searchInput.value);
      }
    });

    this.windowEl?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.currentMatches.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.currentMatches.length;
          this.updateHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.currentMatches.length > 0) {
          this.selectedIndex =
            (this.selectedIndex - 1 + this.currentMatches.length) % this.currentMatches.length;
          this.updateHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.btnPlay?.click();
      } else if (
        e.key.toLowerCase() === "q" &&
        (document.activeElement !== this.searchInput || e.ctrlKey || e.altKey)
      ) {
        e.preventDefault();
        this.btnQueue?.click();
      }
    });
  }

  public open() {
    if (!this.windowEl) return;
    this.windowEl.style.display = "flex";
    this.searchInput.value = "";
    this.selectedIndex = -1;
    this.currentMatches = [];
    this.renderResults("");
    this.searchInput.focus();
  }

  public close() {
    if (this.windowEl) {
      this.windowEl.style.display = "none";
    }
  }

  public renderResults(query: string) {
    const q = query.trim().toLowerCase();
    this.currentMatches = [];
    this.resultsContainer.innerHTML = "";

    const words = q.split(/\s+/).filter(Boolean);

    this.playlist.items.forEach((track, idx) => {
      const text = `${track.artist} ${track.title} ${track.album || ""} ${track.path}`.toLowerCase();
      const matchesAll = words.every((w) => text.includes(w));
      if (matchesAll || words.length === 0) {
        this.currentMatches.push(idx);
      }
    });

    if (this.currentMatches.length === 0) {
      this.resultsContainer.innerHTML = `<div class="empty-playlist-msg">No matching tracks in playlist.</div>`;
      this.selectedIndex = -1;
      return;
    }

    this.selectedIndex = 0;
    this.currentMatches.forEach((trackIdx, matchIdx) => {
      const track = this.playlist.items[trackIdx];
      const itemEl = document.createElement("div");
      itemEl.className = `jump-item ${matchIdx === 0 ? "active" : ""}`;
      const queuePos = this.playlist.isQueued(trackIdx);
      const queueBadge = queuePos > 0 ? `<span class="queue-badge">#${queuePos}</span>` : "";

      const mins = Math.floor((track.duration_secs || 0) / 60);
      const secs = Math.floor((track.duration_secs || 0) % 60);
      const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

      itemEl.innerHTML = `
        <span>${trackIdx + 1}. ${track.artist} - ${track.title}${queueBadge}</span>
        <span>${timeStr}</span>
      `;

      itemEl.addEventListener("click", () => {
        this.selectedIndex = matchIdx;
        this.updateHighlight();
      });

      itemEl.addEventListener("dblclick", () => {
        this.onPlayTrack(trackIdx);
        this.close();
      });

      this.resultsContainer.appendChild(itemEl);
    });
  }

  private updateHighlight() {
    const items = this.resultsContainer.querySelectorAll(".jump-item");
    items.forEach((el, idx) => {
      el.classList.toggle("active", idx === this.selectedIndex);
      if (idx === this.selectedIndex) {
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }
}
