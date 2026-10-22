use tauri::State;
use crate::AppState;
use crate::engine::types::*;
use crate::database::metadata::extract_metadata;

#[tauri::command]
pub fn play_track(state: State<'_, AppState>, path: String) -> Result<TrackMetadata, String> {
    let meta = extract_metadata(&path)?;
    state
        .cmd_tx
        .send(AudioCommand::Play(path))
        .map_err(|e| e.to_string())?;
    Ok(meta)
}

#[tauri::command]
pub fn pause_track(state: State<'_, AppState>) {
    let _ = state.cmd_tx.send(AudioCommand::Pause);
}

#[tauri::command]
pub fn resume_track(state: State<'_, AppState>) {
    let _ = state.cmd_tx.send(AudioCommand::Resume);
}

#[tauri::command]
pub fn stop_track(state: State<'_, AppState>) {
    let _ = state.cmd_tx.send(AudioCommand::Stop);
}

#[tauri::command]
pub fn set_player_volume(state: State<'_, AppState>, volume: f32) {
    let _ = state.cmd_tx.send(AudioCommand::SetVolume(volume));
}

#[tauri::command]
pub fn set_player_balance(state: State<'_, AppState>, balance: f32) {
    let _ = state.cmd_tx.send(AudioCommand::SetBalance(balance));
}

#[tauri::command]
pub fn set_player_mono(state: State<'_, AppState>, is_mono: bool) {
    let _ = state.cmd_tx.send(AudioCommand::SetMono(is_mono));
}

#[tauri::command]
pub fn update_equalizer(state: State<'_, AppState>, config: EqualizerConfig) {
    let _ = state.cmd_tx.send(AudioCommand::SetEqualizer(config));
}

#[tauri::command]
pub fn set_player_crossfade(state: State<'_, AppState>, seconds: f32) {
    let _ = state.cmd_tx.send(AudioCommand::SetCrossfadeSecs(seconds));
}

#[tauri::command]
pub fn seek_track(state: State<'_, AppState>, seconds: f64) {
    let _ = state.cmd_tx.send(AudioCommand::Seek(seconds));
}

#[tauri::command]
pub fn get_player_status(state: State<'_, AppState>) -> PlaybackStatus {
    let s = state.status.lock().unwrap();
    s.clone()
}

#[tauri::command]
pub fn get_metadata(path: String) -> Result<TrackMetadata, String> {
    extract_metadata(&path)
}

#[tauri::command]
pub fn check_file_exists(path: String) -> bool {
    if path.starts_with("http://") || path.starts_with("https://") {
        return true;
    }
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn scan_dropped_paths(paths: Vec<String>) -> Vec<TrackMetadata> {
    use walkdir::WalkDir;
    let extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "aiff", "mid", "midi", "mod", "xm", "s3m", "it", "sid"];
    let mut results = Vec::new();

    for p in paths {
        let path = std::path::Path::new(&p);
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if extensions.contains(&ext.to_lowercase().as_str()) {
                    let meta = extract_metadata(&p).unwrap_or_else(|_| {
                        let name = path.file_stem().and_then(|n| n.to_str()).unwrap_or("Audio File");
                        TrackMetadata {
                            title: name.to_string(),
                            artist: "Unknown Artist".to_string(),
                            album: "Unknown".to_string(),
                            duration_secs: 0.0,
                            bitrate: 320,
                            sample_rate: 44100,
                            channels: 2,
                            path: p.clone(),
                            replay_gain_db: None,
                            cover_art: None,
                        }
                    });
                    results.push(meta);
                }
            }
        } else if path.is_dir() {
            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                let sub_path = entry.path();
                if sub_path.is_file() {
                    if let Some(ext) = sub_path.extension().and_then(|e| e.to_str()) {
                        if extensions.contains(&ext.to_lowercase().as_str()) {
                            let path_str = sub_path.to_string_lossy().to_string();
                            let meta = extract_metadata(&path_str).unwrap_or_else(|_| {
                                let name = sub_path.file_stem().and_then(|n| n.to_str()).unwrap_or("Audio File");
                                TrackMetadata {
                                    title: name.to_string(),
                                    artist: "Unknown Artist".to_string(),
                                    album: "Unknown".to_string(),
                                    duration_secs: 0.0,
                                    bitrate: 320,
                                    sample_rate: 44100,
                                    channels: 2,
                                    path: path_str.clone(),
                                    replay_gain_db: None,
                                    cover_art: None,
                                }
                            });
                            results.push(meta);
                        }
                    }
                }
            }
        }
    }
    results
}

#[tauri::command]
pub fn get_default_demo_track() -> Option<TrackMetadata> {
    const EMBEDDED_DEMO_MIDI: &[u8] = include_bytes!("../../demo/space_techno_loop_30s.mid");
    let cache_dir = dirs_cache_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let target_path = cache_dir.join("space_techno_loop_30s.mid");

    let _ = std::fs::create_dir_all(&cache_dir);
    if !target_path.exists() {
        let _ = std::fs::write(&target_path, EMBEDDED_DEMO_MIDI);
    }

    let path_str = target_path.to_string_lossy().to_string();
    extract_metadata(&path_str).ok()
}

fn dirs_cache_dir() -> Option<std::path::PathBuf> {
    dirs::cache_dir()
        .or_else(dirs::data_dir)
        .or_else(dirs::home_dir)
        .map(|d| d.join(".surmuni_cache"))
        .or_else(|| Some(std::env::temp_dir().join(".surmuni_cache")))
}
