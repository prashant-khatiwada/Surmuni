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

#[tauri::command]
pub fn app_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn app_close(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn app_start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}
