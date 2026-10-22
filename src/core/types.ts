export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  duration_secs: number;
  bitrate: number;
  sample_rate: number;
  channels: number;
  path: string;
  replay_gain_db?: number;
  cover_art?: string;
  is_missing?: boolean;
}

export interface PlaybackStatus {
  position: number;
  is_playing: boolean;
  is_paused: boolean;
  duration: number;
  fft_bands?: number[];
  should_advance?: boolean;
}

export interface EqualizerConfig {
  enabled: boolean;
  preamp: number;
  bands: number[];
}
