import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { TrackMetadata, PlaybackStatus, EqualizerConfig } from "./types";

export class AudioService {
  static async play(path: string): Promise<TrackMetadata> {
    return await invoke<TrackMetadata>("play_track", { path });
  }

  static async pause(): Promise<void> {
    await invoke("pause_track");
  }

  static async resume(): Promise<void> {
    await invoke("resume_track");
  }

  static async stop(): Promise<void> {
    await invoke("stop_track");
  }

  static async seek(seconds: number): Promise<void> {
    await invoke("seek_track", { seconds });
  }

  static async setVolume(volume: number): Promise<void> {
    await invoke("set_player_volume", { volume });
  }

  static async setBalance(balance: number): Promise<void> {
    await invoke("set_player_balance", { balance });
  }

  static async setMono(isMono: boolean): Promise<void> {
    await invoke("set_player_mono", { isMono });
  }

  static async updateEqualizer(config: EqualizerConfig): Promise<void> {
    await invoke("update_equalizer", { config });
  }

  static async setCrossfade(seconds: number): Promise<void> {
    await invoke("set_player_crossfade", { seconds });
  }

  static async setLoudness(enabled: boolean): Promise<void> {
    await invoke("set_player_loudness", { enabled });
  }

  static async setReplayGain(enabled: boolean): Promise<void> {
    await invoke("set_player_replaygain", { enabled });
  }

  static onTick(callback: (status: PlaybackStatus) => void) {
    return listen<PlaybackStatus>("playback-tick", (event) => {
      callback(event.payload);
    });
  }

  static async pickMediaFiles(): Promise<string[]> {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "All Supported Media",
          extensions: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "aiff", "mid", "midi", "mod", "xm", "s3m", "it", "sid"],
        },
        { name: "Standard Audio", extensions: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "aiff"] },
        { name: "MIDI Synthesizer Files", extensions: ["mid", "midi"] },
        { name: "Chiptune Tracker Modules", extensions: ["mod", "xm", "s3m", "it", "sid"] },
      ],
    });

    if (!selected) return [];
    return Array.isArray(selected) ? selected : [selected];
  }

  // Media Library IPC
  static async scanLibraryFolder(folder: string): Promise<number> {
    return await invoke<number>("scan_library", { folder });
  }

  static async searchLibrary(query: string): Promise<TrackMetadata[]> {
    return await invoke<TrackMetadata[]>("search_library", { query });
  }

  static async getLibraryTracks(): Promise<TrackMetadata[]> {
    return await invoke<TrackMetadata[]>("get_library_tracks");
  }

  static async pickFolder(): Promise<string | null> {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (!selected || typeof selected !== "string") return null;
    return selected;
  }
}
