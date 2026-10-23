use crate::skin::loader::{unpack_wsz_skin, SkinManifest};

#[tauri::command]
pub fn load_wsz_skin(path: String) -> Result<SkinManifest, String> {
    unpack_wsz_skin(&path)
}

#[tauri::command]
pub async fn download_and_load_skin(url: String) -> Result<SkinManifest, String> {
    let bytes = download_skin_bytes(&url)?;
    let base_cache = dirs::cache_dir()
        .or_else(dirs::data_dir)
        .or_else(dirs::home_dir)
        .unwrap_or_else(std::env::temp_dir);
    let cache_dir = base_cache.join(".surmuni_cache").join("skins");
    std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    
    let filename = url.split('/').last().unwrap_or("skin.wsz");
    let target = cache_dir.join(filename);
    std::fs::write(&target, bytes).map_err(|e| e.to_string())?;
    
    unpack_wsz_skin(&target.to_string_lossy())
}

fn download_skin_bytes(url: &str) -> Result<Vec<u8>, String> {
    let mut response = ureq::get(url)
        .call()
        .map_err(|e| format!("Failed to download skin: {}", e))?;
    let mut bytes = Vec::new();
    std::io::Read::read_to_end(&mut response.body_mut().as_reader(), &mut bytes)
        .map_err(|e| format!("Failed reading skin payload: {}", e))?;
    Ok(bytes)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct PlatformInfo {
    pub os: String,
    pub is_wayland: bool,
    pub detached_supported: bool,
}

#[tauri::command]
pub fn get_platform_info() -> PlatformInfo {
    #[cfg(target_os = "linux")]
    let is_wayland = std::env::var("WAYLAND_DISPLAY").map(|v| !v.is_empty()).unwrap_or(false);
    #[cfg(not(target_os = "linux"))]
    let is_wayland = false;

    let os = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    PlatformInfo {
        os: os.to_string(),
        is_wayland,
        detached_supported: !is_wayland,
    }
}

#[tauri::command]
pub fn app_set_window_size(window: tauri::Window, width: f64, height: f64) {
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
}

#[tauri::command]
pub fn app_set_always_on_top(window: tauri::Window, always_on_top: bool) {
    let _ = window.set_always_on_top(always_on_top);
}

#[tauri::command]
pub fn app_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn app_close(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn app_open_preferences(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(pref_window) = app.get_webview_window("preferences") {
        let _ = pref_window.show();
        let _ = pref_window.unminimize();
        let _ = pref_window.set_focus();
    } else {
        // Fallback create if closed
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "preferences",
            tauri::WebviewUrl::App("preferences.html".into())
        )
        .title("Surmuni Preferences")
        .inner_size(560.0, 440.0)
        .min_inner_size(500.0, 380.0)
        .resizable(true)
        .decorations(true)
        .build();
    }
    Ok(())
}

#[tauri::command]
pub fn app_close_preferences(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(pref_window) = app.get_webview_window("preferences") {
        let _ = pref_window.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn app_open_visualizer(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(vis_window) = app.get_webview_window("visualizer") {
        let _ = vis_window.show();
        let _ = vis_window.unminimize();
        let _ = vis_window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "visualizer",
            tauri::WebviewUrl::App("visualizer.html".into())
        )
        .title("MilkDrop 2 Visualizer — Surmuni")
        .inner_size(640.0, 480.0)
        .min_inner_size(400.0, 300.0)
        .resizable(true)
        .decorations(true)
        .build();
    }
    Ok(())
}

#[tauri::command]
pub fn app_close_visualizer(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(vis_window) = app.get_webview_window("visualizer") {
        let _ = vis_window.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn app_start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}
