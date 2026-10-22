use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub bitrate: u32,
    pub sample_rate: u32,
    pub channels: u16,
    pub path: String,
    pub replay_gain_db: Option<f32>,
    pub cover_art: Option<String>, // Base64 data:image/png;base64,...
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlaybackStatus {
    pub position: f64,
    pub is_playing: bool,
    pub is_paused: bool,
    pub duration: f64,
    pub fft_bands: Vec<f32>, // 19 or 32 visualizer bands (0.0 to 1.0)
    pub should_advance: bool, // AutoDJ flag: triggers early transition on silence
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EqualizerConfig {
    pub enabled: bool,
    pub preamp: f32,
    pub bands: Vec<f32>, // 10 bands (-12.0 to +12.0 dB)
}

pub enum AudioCommand {
    Play(String),
    Pause,
    Resume,
    Stop,
    Seek(f64),
    SetVolume(f32),
    SetBalance(f32),
    SetMono(bool),
    SetEqualizer(EqualizerConfig),
    SetCrossfadeSecs(f32),
}

pub struct AppState {
    pub cmd_tx: std::sync::mpsc::Sender<AudioCommand>,
    pub status: std::sync::Arc<std::sync::Mutex<PlaybackStatus>>,
}
