import { TrackMetadata } from "./types";
import { AudioService } from "./audio";

export class PlaylistManager {
  private tracks: TrackMetadata[] = [];
  private activeIndex: number = -1;
  private selectedIndex: number = -1;
  private shuffleQueue: number[] = [];
  private shufflePointer: number = -1;
  public isShuffle: boolean = false;
  public isRepeat: boolean = false;

  // Undo History Stack (Ctrl+Z)
  private undoStack: { tracks: TrackMetadata[]; activeIndex: number }[] = [];

  // Play-next priority queue (indexes into this.tracks)
  public playNextQueue: number[] = [];

  get length(): number {
    return this.tracks.length;
  }

  get items(): readonly TrackMetadata[] {
    return this.tracks;
  }

  get currentIndex(): number {
    return this.activeIndex;
  }

  set currentIndex(idx: number) {
    this.activeIndex = idx;
  }

  get selected(): number {
    return this.selectedIndex;
  }

  set selected(idx: number) {
    this.selectedIndex = idx;
  }

  get currentTrack(): TrackMetadata | null {
    if (this.activeIndex >= 0 && this.activeIndex < this.tracks.length) {
      return this.tracks[this.activeIndex];
    }
    return null;
  }

  private saveUndoSnapshot() {
    this.undoStack.push({
      tracks: [...this.tracks],
      activeIndex: this.activeIndex,
    });
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.tracks = prev.tracks;
    this.activeIndex = prev.activeIndex;
    this.selectedIndex = -1;
    if (this.isShuffle) this.generateShuffleQueue(true);
    return true;
  }

  addTrack(track: TrackMetadata) {
    this.saveUndoSnapshot();
    this.tracks.push(track);
    if (this.isShuffle) this.generateShuffleQueue(true);
  }

  clear() {
    if (this.tracks.length === 0) return;
    this.saveUndoSnapshot();
    this.tracks = [];
    this.activeIndex = -1;
    this.selectedIndex = -1;
    this.shuffleQueue = [];
    this.shufflePointer = -1;
  }

  queueNext(idx: number): boolean {
    if (idx < 0 || idx >= this.tracks.length) return false;
    const existingPos = this.playNextQueue.indexOf(idx);
    if (existingPos !== -1) {
      this.playNextQueue.splice(existingPos, 1);
    }
    this.playNextQueue.push(idx);
    return true;
  }

  isQueued(idx: number): number {
    const pos = this.playNextQueue.indexOf(idx);
    return pos !== -1 ? pos + 1 : 0;
  }

  unqueue(idx: number) {
    const pos = this.playNextQueue.indexOf(idx);
    if (pos !== -1) {
      this.playNextQueue.splice(pos, 1);
    }
  }

  remove(idx: number): boolean {
    if (idx < 0 || idx >= this.tracks.length) return false;
    this.saveUndoSnapshot();
    const wasPlaying = idx === this.activeIndex;
    this.tracks.splice(idx, 1);

    // Update play-next queue offsets
    this.playNextQueue = this.playNextQueue
      .filter((q) => q !== idx)
      .map((q) => (q > idx ? q - 1 : q));

    if (wasPlaying) {
      this.activeIndex = -1;
    } else if (idx < this.activeIndex) {
      this.activeIndex--;
    }
    this.selectedIndex = -1;
    if (this.isShuffle) this.generateShuffleQueue(true);
    return wasPlaying;
  }

  generateShuffleQueue(startWithCurrent = true) {
    if (this.tracks.length === 0) {
      this.shuffleQueue = [];
      this.shufflePointer = -1;
      return;
    }

    const indices = Array.from({ length: this.tracks.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    if (startWithCurrent && this.activeIndex !== -1) {
      const pos = indices.indexOf(this.activeIndex);
      if (pos !== -1) {
        indices.splice(pos, 1);
        indices.unshift(this.activeIndex);
      }
    }
    this.shufflePointer = 0;
    this.shuffleQueue = indices;
  }

  randomizeInPlace() {
    if (this.tracks.length <= 1) return;
    this.saveUndoSnapshot();
    const current = this.currentTrack;

    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }

    if (current) {
      this.activeIndex = this.tracks.findIndex((t) => t.path === current.path);
    }
  }

  getNextIndex(): number | null {
    if (this.tracks.length === 0) return null;

    // Check if there is a track queued up in the play-next queue
    while (this.playNextQueue.length > 0) {
      const nextIdx = this.playNextQueue.shift()!;
      if (nextIdx >= 0 && nextIdx < this.tracks.length) {
        return nextIdx;
      }
    }

    if (this.isShuffle) {
      if (this.shuffleQueue.length === 0) this.generateShuffleQueue();
      this.shufflePointer++;
      if (this.shufflePointer >= this.shuffleQueue.length) {
        if (this.isRepeat) {
          this.generateShuffleQueue(false);
          this.shufflePointer = 0;
        } else {
          return null;
        }
      }
      return this.shuffleQueue[this.shufflePointer];
    }

    let next = this.activeIndex + 1;
    if (next >= this.tracks.length) {
      if (this.isRepeat) next = 0;
      else return null;
    }
    return next;
  }

  getPrevIndex(): number | null {
    if (this.tracks.length === 0) return null;

    if (this.isShuffle) {
      if (this.shuffleQueue.length === 0) this.generateShuffleQueue();
      this.shufflePointer--;
      if (this.shufflePointer < 0) {
        this.shufflePointer = this.shuffleQueue.length - 1;
      }
      return this.shuffleQueue[this.shufflePointer];
    }

    let prev = this.activeIndex - 1;
    if (prev < 0) {
      if (this.isRepeat) prev = this.tracks.length - 1;
      else prev = 0;
    }
    return prev;
  }

  async play(idx: number): Promise<TrackMetadata | null> {
    if (idx < 0 || idx >= this.tracks.length) return null;
    this.activeIndex = idx;
    this.selectedIndex = idx;
    const track = this.tracks[idx];

    try {
      const meta = await AudioService.play(track.path);
      this.tracks[idx] = meta;
      return meta;
    } catch (e) {
      console.error("Playback failed:", e);
      return null;
    }
  }

  exportM3U(): string {
    let out = "#EXTM3U\n";
    for (const track of this.tracks) {
      const dur = Math.round(track.duration_secs || 0);
      out += `#EXTINF:${dur},${track.artist} - ${track.title}\n`;
      out += `${track.path}\n`;
    }
    return out;
  }

  exportPLS(): string {
    let out = "[playlist]\nNumberOfEntries=" + this.tracks.length + "\n";
    this.tracks.forEach((t, i) => {
      const n = i + 1;
      out += `File${n}=${t.path}\n`;
      out += `Title${n}=${t.artist} - ${t.title}\n`;
      out += `Length${n}=${Math.round(t.duration_secs || 0)}\n`;
    });
    out += "Version=2\n";
    return out;
  }

  static formatTitle(track: TrackMetadata, template?: string): string {
    const activeTemplate = template || localStorage.getItem("surmuni_row_format") || "{artist} - {title}";
    const filename = track.path.split(/[\/\\]/).pop() || "Audio File";
    const duration = track.duration_secs
      ? `${Math.floor(track.duration_secs / 60)}:${Math.floor(track.duration_secs % 60).toString().padStart(2, "0")}`
      : "0:00";

    const hasArtist = Boolean(track.artist && track.artist.trim());
    const hasTitle = Boolean(track.title && track.title.trim());

    if (!hasArtist && !hasTitle) {
      return filename;
    }

    let formatted = activeTemplate
      .replace(/{artist}/g, track.artist || "")
      .replace(/{title}/g, track.title || "")
      .replace(/{album}/g, track.album || "")
      .replace(/{filename}/g, filename)
      .replace(/{duration}/g, duration);

    formatted = formatted
      .replace(/^[\s\-_–—|]+/, "")
      .replace(/[\s\-_–—|]+$/, "")
      .replace(/\s*[\-_–—|]\s*[\-_–—|]\s*/g, " - ")
      .trim();

    return formatted || filename;
  }

  // Parses M3U and PLS playlist file content into track items
  static parsePlaylistFile(content: string): TrackMetadata[] {
    if (content.includes("[playlist]") || content.includes("NumberOfEntries=")) {
      return PlaylistManager.parsePLS(content);
    }
    return PlaylistManager.parseM3U(content);
  }

  static parseM3U(content: string): TrackMetadata[] {
    const lines = content.split(/\r?\n/);
    const tracks: TrackMetadata[] = [];
    let currentTitle = "";
    let currentArtist = "";
    let currentDuration = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("#EXTINF:")) {
        const commaIdx = trimmed.indexOf(",");
        if (commaIdx !== -1) {
          const info = trimmed.substring(8, commaIdx);
          currentDuration = parseFloat(info) || 0;
          const namePart = trimmed.substring(commaIdx + 1);
          const dashIdx = namePart.indexOf(" - ");
          if (dashIdx !== -1) {
            currentArtist = namePart.substring(0, dashIdx).trim();
            currentTitle = namePart.substring(dashIdx + 3).trim();
          } else {
            currentArtist = "Unknown Artist";
            currentTitle = namePart.trim();
          }
        }
      } else if (!trimmed.startsWith("#")) {
        const fileName = trimmed.split(/[\/\\]/).pop() || "Audio File";
        tracks.push({
          title: currentTitle || fileName,
          artist: currentArtist || "Unknown Artist",
          album: "Playlist Track",
          duration_secs: currentDuration,
          bitrate: 320,
          sample_rate: 44100,
          channels: 2,
          path: trimmed,
        });

        currentTitle = "";
        currentArtist = "";
        currentDuration = 0;
      }
    }

    return tracks;
  }

  static parsePLS(content: string): TrackMetadata[] {
    const lines = content.split(/\r?\n/);
    const files: Record<number, string> = {};
    const titles: Record<number, string> = {};
    const lengths: Record<number, number> = {};

    lines.forEach((l) => {
      const mFile = l.match(/^File(\d+)=(.*)$/i);
      if (mFile) files[parseInt(mFile[1])] = mFile[2].trim();

      const mTitle = l.match(/^Title(\d+)=(.*)$/i);
      if (mTitle) titles[parseInt(mTitle[1])] = mTitle[2].trim();

      const mLen = l.match(/^Length(\d+)=(.*)$/i);
      if (mLen) lengths[parseInt(mLen[1])] = parseFloat(mLen[2]) || 0;
    });

    const tracks: TrackMetadata[] = [];
    Object.keys(files).forEach((keyStr) => {
      const n = parseInt(keyStr);
      const path = files[n];
      const rawTitle = titles[n] || "";
      let artist = "Unknown Artist";
      let title = path.split(/[\/\\]/).pop() || "Audio File";

      if (rawTitle.includes(" - ")) {
        const parts = rawTitle.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      } else if (rawTitle) {
        title = rawTitle;
      }

      tracks.push({
        title,
        artist,
        album: "PLS Stream",
        duration_secs: lengths[n] || 0,
        bitrate: 320,
        sample_rate: 44100,
        channels: 2,
        path,
      });
    });

    return tracks;
  }
}
