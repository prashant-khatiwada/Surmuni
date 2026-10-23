pub mod engine;
pub mod database;
pub mod skin;
pub mod commands;

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

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
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // Pass opened file arguments to frontend
                if argv.len() > 1 {
                    let paths: Vec<String> = argv.into_iter().skip(1).collect();
                    let _ = app.emit("open-files-from-args", paths);
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            play_track,
            preload_next_track,
            pause_track,
            resume_track,
            stop_track,
            set_player_volume,
            set_player_balance,
            set_player_mono,
            update_equalizer,
            set_player_crossfade,
            set_player_loudness,
            set_player_replaygain,
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
            get_platform_info,
            app_set_window_size,
            app_set_always_on_top,
            app_minimize,
            app_close,
            app_start_dragging,
            app_open_preferences,
            app_close_preferences,
            app_open_visualizer,
            app_toggle_visualizer,
            app_close_visualizer,
            app_open_library,
            app_toggle_library,
            app_close_library
        ])
        .setup(move |app| {
            let handle: AppHandle = app.handle().clone();
            let timer_status = Arc::clone(&status_for_tick);

            // 1. Build Native Cross-Platform OS Application Menu Bar
            // On macOS this appears in the top Apple menu bar.
            // On Windows & Linux, this binds natively to window headers.
            let app_menu_about = MenuItem::with_id(app, "menu_about", "About Surmuni", true, None::<&str>)?;
            let app_menu_prefs = MenuItem::with_id(app, "menu_prefs", "Preferences…", true, Some("CmdOrCtrl+P"))?;
            let app_menu_quit = MenuItem::with_id(app, "menu_quit", "Quit Surmuni", true, Some("CmdOrCtrl+Q"))?;
            
            #[cfg(target_os = "macos")]
            let first_submenu = Submenu::with_items(app, "Surmuni", true, &[&app_menu_about, &app_menu_prefs, &app_menu_quit])?;
            #[cfg(not(target_os = "macos"))]
            let file_open = MenuItem::with_id(app, "menu_open_file", "Open File(s)…", true, Some("CmdOrCtrl+O"))?;
            #[cfg(not(target_os = "macos"))]
            let file_url = MenuItem::with_id(app, "menu_open_url", "Open Audio URL…", true, Some("CmdOrCtrl+L"))?;
            #[cfg(not(target_os = "macos"))]
            let first_submenu = Submenu::with_items(app, "File", true, &[&file_open, &file_url, &app_menu_prefs, &app_menu_quit])?;

            let playback_play = MenuItem::with_id(app, "menu_play", "Play / Pause", true, Some("Space"))?;
            let playback_stop = MenuItem::with_id(app, "menu_stop", "Stop", true, Some("V"))?;
            let playback_next = MenuItem::with_id(app, "menu_next", "Next Track", true, Some("B"))?;
            let playback_prev = MenuItem::with_id(app, "menu_prev", "Previous Track", true, Some("Z"))?;
            let playback_submenu = Submenu::with_items(app, "Playback", true, &[&playback_play, &playback_stop, &playback_next, &playback_prev])?;

            let view_double_size = MenuItem::with_id(app, "menu_double_size", "Double Size (2×)", true, Some("CmdOrCtrl+D"))?;
            let view_detached = MenuItem::with_id(app, "menu_detached", "Detached Windows", true, Some("Alt+D"))?;
            let view_eq = MenuItem::with_id(app, "menu_eq", "Equalizer", true, Some("Alt+G"))?;
            let view_pl = MenuItem::with_id(app, "menu_pl", "Playlist", true, Some("Alt+E"))?;
            let view_vis = MenuItem::with_id(app, "menu_vis", "MilkDrop 2 Visualizer", true, Some("CmdOrCtrl+Shift+K"))?;
            let view_lib = MenuItem::with_id(app, "menu_lib", "Media Library", true, Some("CmdOrCtrl+M"))?;
            let view_submenu = Submenu::with_items(app, "View", true, &[&view_double_size, &view_detached, &view_eq, &view_pl, &view_vis, &view_lib])?;

            #[cfg(not(target_os = "macos"))]
            let help_about = MenuItem::with_id(app, "menu_about", "About Surmuni", true, None::<&str>)?;
            #[cfg(not(target_os = "macos"))]
            let help_submenu = Submenu::with_items(app, "Help", true, &[&help_about])?;

            #[cfg(target_os = "macos")]
            let root_menu = Menu::with_items(app, &[&first_submenu, &playback_submenu, &view_submenu])?;
            #[cfg(not(target_os = "macos"))]
            let root_menu = Menu::with_items(app, &[&first_submenu, &playback_submenu, &view_submenu, &help_submenu])?;
            let _ = app.set_menu(root_menu);

            app.on_menu_event(|app, event| match event.id.as_ref() {
                "menu_open_file" => { let _ = app.emit("menu-app-open-file", ()); }
                "menu_open_url" => { let _ = app.emit("menu-app-open-url", ()); }
                "menu_play" => { let _ = app.emit("media-key-play-pause", ()); }
                "menu_next" => { let _ = app.emit("media-key-next", ()); }
                "menu_prev" => { let _ = app.emit("media-key-prev", ()); }
                "menu_stop" => { let _ = app.emit("menu-app-stop", ()); }
                "menu_double_size" => { let _ = app.emit("menu-app-scale-2x", ()); }
                "menu_detached" => { let _ = app.emit("menu-app-detached", ()); }
                "menu_eq" => { let _ = app.emit("menu-app-eq", ()); }
                "menu_pl" => { let _ = app.emit("menu-app-pl", ()); }
                "menu_vis" => { let _ = app.emit("menu-app-vis", ()); }
                "menu_lib" => { let _ = app.emit("menu-app-lib", ()); }
                "menu_prefs" => { let _ = app.emit("menu-app-prefs", ()); }
                "menu_about" => { let _ = app.emit("menu-app-about", ()); }
                "menu_quit" => { app.exit(0); }
                _ => {}
            });

            // 2. Build System Tray Menu
            let tray_play_pause = MenuItem::with_id(app, "tray_play_pause", "Play / Pause", true, None::<&str>)?;
            let tray_next = MenuItem::with_id(app, "tray_next", "Next Track", true, None::<&str>)?;
            let tray_prev = MenuItem::with_id(app, "tray_prev", "Previous Track", true, None::<&str>)?;
            let tray_show_hide = MenuItem::with_id(app, "tray_show_hide", "Show / Hide Surmuni", true, None::<&str>)?;
            let tray_quit = MenuItem::with_id(app, "tray_quit", "Quit Surmuni", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &tray_play_pause,
                    &tray_next,
                    &tray_prev,
                    &tray_show_hide,
                    &tray_quit,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Surmuni Audio Player");

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "tray_play_pause" => {
                        let _ = app.emit("media-key-play-pause", ());
                    }
                    "tray_next" => {
                        let _ = app.emit("media-key-next", ());
                    }
                    "tray_prev" => {
                        let _ = app.emit("media-key-prev", ());
                    }
                    "tray_show_hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(true) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "tray_quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 2. Playback Tick Heartbeat
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
