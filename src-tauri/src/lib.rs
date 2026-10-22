pub mod engine;
pub mod database;
pub mod skin;
pub mod commands;

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub use engine::types::{AudioCommand, PlaybackStatus};
pub use engine::start_audio_engine;
pub use database::MediaLibrary;
use commands::*;

pub struct AppState {
    pub cmd_tx: std::sync::mpsc::Sender<AudioCommand>,
    pub status: Arc<Mutex<PlaybackStatus>>,
    pub library: Arc<MediaLibrary>,
}

fn dirs_db_path() -> std::path::PathBuf {
    if let Some(data_dir) = dirs::data_dir().or_else(dirs::home_dir) {
        let p = data_dir.join(".surmuni_library.db");
        if let Ok(_) = MediaLibrary::new(p.clone()) {
            return p;
        }
    }
    // Fallback to local working directory or OS temp directory if home is restricted
    let local = std::path::PathBuf::from("surmuni_library.db");
    if let Ok(_) = MediaLibrary::new(local.clone()) {
        return local;
    }
    std::env::temp_dir().join("surmuni_library.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let status = Arc::new(Mutex::new(PlaybackStatus {
        position: 0.0,
        is_playing: false,
        is_paused: false,
        duration: 0.0,
        fft_bands: vec![0.0; 19],
        should_advance: false,
    }));

    let (cmd_tx, _worker) = start_audio_engine(Arc::clone(&status));
    let status_for_tick = Arc::clone(&status);

    let db_path = dirs_db_path();
    let library = Arc::new(MediaLibrary::new(db_path).unwrap_or_else(|_| {
        let temp_db = std::env::temp_dir().join("surmuni_library.db");
        MediaLibrary::new(temp_db)
            .expect("Failed to initialize SQLite media library")
    }));

    let app_state = AppState {
        cmd_tx,
        status: Arc::clone(&status),
        library,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            play_track,
            pause_track,
            resume_track,
            stop_track,
            set_player_volume,
            set_player_balance,
            set_player_mono,
            update_equalizer,
            set_player_crossfade,
            seek_track,
            get_player_status,
            get_metadata,
            get_default_demo_track,
            check_file_exists,
            scan_dropped_paths,
            load_wsz_skin,
            download_and_load_skin,
            scan_library,
            search_library,
            get_library_tracks,
            read_track_tags,
            write_track_tags,
            fetch_stream_title,
            app_minimize,
            app_close,
            app_start_dragging
        ])
        .setup(move |app| {
            let handle: AppHandle = app.handle().clone();
            let timer_status = Arc::clone(&status_for_tick);

            thread::spawn(move || loop {
                thread::sleep(Duration::from_millis(150));
                let s = timer_status.lock().unwrap().clone();
                let _ = handle.emit("playback-tick", &s);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
