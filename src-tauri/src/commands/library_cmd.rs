use tauri::State;
use crate::AppState;
use crate::engine::types::TrackMetadata;

#[tauri::command]
pub fn scan_library(state: State<'_, AppState>, folder: String) -> usize {
    state.library.scan_directory(&folder)
}

#[tauri::command]
pub fn search_library(state: State<'_, AppState>, query: String) -> Vec<TrackMetadata> {
    state.library.search(&query)
}

#[tauri::command]
pub fn get_library_tracks(state: State<'_, AppState>) -> Vec<TrackMetadata> {
    state.library.get_all_tracks()
}
