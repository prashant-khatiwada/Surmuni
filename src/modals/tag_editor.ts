import { invoke } from "@tauri-apps/api/core";
import { PlaylistManager } from "../core/playlist";
import { TrackMetadata } from "../core/types";
import { I18nManager } from "../core/i18n";
import { showRetroToast } from "../ui/toast";

export class TagEditorModal {
  private windowEl: HTMLElement;
  private filePathEl: HTMLInputElement;
  private titleEl: HTMLInputElement;
  private artistEl: HTMLInputElement;
  private albumEl: HTMLInputElement;
  private albumArtistEl: HTMLInputElement;
  private genreEl: HTMLInputElement;
  private yearEl: HTMLInputElement;
  private trackEl: HTMLInputElement;
  private commentEl: HTMLTextAreaElement;
  private playlist: PlaylistManager;
  private onTrackUpdated: (track: TrackMetadata) => void;

  constructor(playlist: PlaylistManager, onTrackUpdated: (track: TrackMetadata) => void) {
    this.playlist = playlist;
    this.onTrackUpdated = onTrackUpdated;
    this.windowEl = document.getElementById("tag-window") as HTMLElement;
    this.filePathEl = document.getElementById("tag-file-path") as HTMLInputElement;
    this.titleEl = document.getElementById("tag-input-title") as HTMLInputElement;
    this.artistEl = document.getElementById("tag-input-artist") as HTMLInputElement;
    this.albumEl = document.getElementById("tag-input-album") as HTMLInputElement;
    this.albumArtistEl = document.getElementById("tag-input-album-artist") as HTMLInputElement;
    this.genreEl = document.getElementById("tag-input-genre") as HTMLInputElement;
    this.yearEl = document.getElementById("tag-input-year") as HTMLInputElement;
    this.trackEl = document.getElementById("tag-input-track") as HTMLInputElement;
    this.commentEl = document.getElementById("tag-input-comment") as HTMLTextAreaElement;

    this.bindEvents();
  }

  private bindEvents() {
    document.getElementById("btn-tag-close")?.addEventListener("click", () => this.close());
    document.getElementById("btn-tag-cancel")?.addEventListener("click", () => this.close());
    document.getElementById("btn-tag-save")?.addEventListener("click", () => this.save());
  }

  public async open(track: TrackMetadata) {
    if (!this.windowEl) return;
    this.filePathEl.value = track.path;
    this.titleEl.value = track.title || "";
    this.artistEl.value = track.artist || "";
    this.albumEl.value = track.album || "";
    this.albumArtistEl.value = "";
    this.genreEl.value = "";
    this.yearEl.value = "";
    this.trackEl.value = "";
    this.commentEl.value = "";

    try {
      const loftyTags = await invoke<any>("read_track_tags", { path: track.path });
      if (loftyTags) {
        if (loftyTags.title) this.titleEl.value = loftyTags.title;
        if (loftyTags.artist) this.artistEl.value = loftyTags.artist;
        if (loftyTags.album) this.albumEl.value = loftyTags.album;
        if (loftyTags.album_artist) this.albumArtistEl.value = loftyTags.album_artist;
        if (loftyTags.genre) this.genreEl.value = loftyTags.genre;
        if (loftyTags.comment) this.commentEl.value = loftyTags.comment;
        if (loftyTags.year) this.yearEl.value = loftyTags.year.toString();
        if (loftyTags.track_number) this.trackEl.value = loftyTags.track_number.toString();
      }
    } catch (err) {
      console.warn("Could not read tags via lofty:", err);
    }

    this.windowEl.style.display = "flex";
  }

  public close() {
    if (this.windowEl) {
      this.windowEl.style.display = "none";
    }
  }

  public async save() {
    const path = this.filePathEl.value;
    if (!path) return;

    const tagsPayload = {
      path,
      title: this.titleEl.value.trim() || null,
      artist: this.artistEl.value.trim() || null,
      album: this.albumEl.value.trim() || null,
      album_artist: this.albumArtistEl.value.trim() || null,
      genre: this.genreEl.value.trim() || null,
      year: parseInt(this.yearEl.value) || null,
      track_number: parseInt(this.trackEl.value) || null,
      comment: this.commentEl.value.trim() || null,
    };

    try {
      await invoke("write_track_tags", { tags: tagsPayload });
      const t = this.playlist.items.find((item) => item.path === path);
      if (t) {
        if (tagsPayload.title) t.title = tagsPayload.title;
        if (tagsPayload.artist) t.artist = tagsPayload.artist;
        if (tagsPayload.album) t.album = tagsPayload.album;
        this.onTrackUpdated(t);
      }
      this.close();
      showRetroToast(I18nManager.t("toast_tags_saved"));
    } catch (err) {
      showRetroToast("Failed to save tags: " + err, 4000);
    }
  }
}
