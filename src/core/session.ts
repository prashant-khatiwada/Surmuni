import { invoke } from "@tauri-apps/api/core";
import { PlaylistManager } from "./playlist";
import { TrackMetadata } from "./types";
import { AudioService } from "./audio";
import { ChassisManager } from "../ui/chassis";
import { WinampFontEngine } from "../skin/font_engine";

export interface SessionState {
  tracks: readonly TrackMetadata[];
  currentIndex: number;
  seekPosition: number;
  volume: number;
  balance: number;
  isMono: boolean;
  scale: 1 | 2 | 3;
  isAlwaysOnTop: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isDetached: boolean;
  panels: {
    eq: boolean;
    pl: boolean;
    ml: boolean;
    vis: boolean;
  };
}

export class SessionManager {
  private playlist: PlaylistManager;
  private chassis: ChassisManager;
  private volumeSlider: HTMLInputElement;
  private balanceSlider: HTMLInputElement;
  private seekSlider: HTMLInputElement;
  private timeDisplay: HTMLElement;

  constructor(
    playlist: PlaylistManager,
    chassis: ChassisManager,
    volumeSlider: HTMLInputElement,
    balanceSlider: HTMLInputElement,
    seekSlider: HTMLInputElement,
    timeDisplay: HTMLElement
  ) {
    this.playlist = playlist;
    this.chassis = chassis;
    this.volumeSlider = volumeSlider;
    this.balanceSlider = balanceSlider;
    this.seekSlider = seekSlider;
    this.timeDisplay = timeDisplay;
  }

  public save(isMono: boolean, panels: { eq: boolean; pl: boolean; ml: boolean; vis: boolean }) {
    try {
      const session: SessionState = {
        tracks: this.playlist.items,
        currentIndex: this.playlist.currentIndex,
        seekPosition: parseFloat(this.seekSlider.value) || 0,
        volume: parseFloat(this.volumeSlider.value) || 80,
        balance: parseFloat(this.balanceSlider.value) || 0,
        isMono,
        scale: this.chassis.currentScale,
        isAlwaysOnTop: this.chassis.isAlwaysOnTop,
        isShuffle: this.playlist.isShuffle,
        isRepeat: this.playlist.isRepeat,
        isDetached: false,
        panels,
      };
      localStorage.setItem("surmuni_session_state", JSON.stringify(session));
    } catch {}
  }

  public async restore(
    onTrackLoaded: (track: TrackMetadata) => void,
    onRenderPlaylist: () => void
  ): Promise<boolean> {
    try {
      const raw = localStorage.getItem("surmuni_session_state");
      if (!raw) return false;
      const session: SessionState = JSON.parse(raw);

      if (session.volume !== undefined && this.volumeSlider) {
        this.volumeSlider.value = session.volume.toString();
        AudioService.setVolume(session.volume / 100);
      }
      if (session.balance !== undefined && this.balanceSlider) {
        this.balanceSlider.value = session.balance.toString();
        AudioService.setBalance(session.balance / 100);
      }
      if (session.scale && (session.scale === 1 || session.scale === 2 || session.scale === 3)) {
        this.chassis.setAppScale(session.scale);
      }
      if (session.isAlwaysOnTop) {
        this.chassis.setAlwaysOnTop(true);
      }
      if (session.isDetached) {
        this.chassis.setDetachedMode(true);
      }

      if (session.tracks && Array.isArray(session.tracks) && session.tracks.length > 0) {
        for (const t of session.tracks) {
          let exists = true;
          try {
            exists = await invoke<boolean>("check_file_exists", { path: t.path });
          } catch {
            exists = true;
          }
          this.playlist.addTrack({
            ...t,
            is_missing: !exists,
          });
        }

        if (session.currentIndex >= 0 && session.currentIndex < this.playlist.length) {
          this.playlist.currentIndex = session.currentIndex;
          this.playlist.selected = session.currentIndex;
          const currentItem = this.playlist.items[session.currentIndex];
          onTrackLoaded(currentItem);

          if (session.seekPosition && currentItem.duration_secs > 0) {
            this.seekSlider.value = session.seekPosition.toString();
            const targetSecs = (session.seekPosition / 100) * currentItem.duration_secs;
            const m = Math.floor(targetSecs / 60);
            const s = Math.floor(targetSecs % 60);
            const displayTime = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            this.timeDisplay.innerText = displayTime;
            WinampFontEngine.renderTime(displayTime);
          }
        }

        onRenderPlaylist();
        return true;
      }
    } catch (err) {
      console.warn("Failed restoring session state:", err);
    }
    return false;
  }
}
