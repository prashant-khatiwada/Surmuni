pub mod metadata;

use rusqlite::{params, Connection, Result};
use std::path::Path;
use std::sync::Mutex;
use walkdir::WalkDir;
use metadata::extract_metadata;
use crate::engine::types::TrackMetadata;

pub struct MediaLibrary {
    db: Mutex<Connection>,
}

impl MediaLibrary {
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                duration_secs REAL NOT NULL,
                bitrate INTEGER,
                sample_rate INTEGER,
                channels INTEGER,
                path TEXT UNIQUE NOT NULL
            )",
            [],
        )?;

        // Speed up search with indexes on artist, title, album
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tracks_search ON tracks (artist, title, album)",
            [],
        )?;

        Ok(Self {
            db: Mutex::new(conn),
        })
    }

    pub fn scan_directory(&self, folder_path: &str) -> usize {
        let mut count = 0;
        let extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "aiff", "mid", "midi", "mod", "xm", "s3m", "it"];

        let db = match self.db.lock() {
            Ok(guard) => guard,
            Err(_) => return 0,
        };

        for entry in WalkDir::new(folder_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if extensions.contains(&ext_lower.as_str()) {
                        let path_str = path.to_string_lossy().to_string();
                        // Extract metadata
                        let meta = match extract_metadata(&path_str) {
                            Ok(m) => m,
                            Err(_) => {
                                let file_name = path.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("Audio File")
                                    .to_string();
                                TrackMetadata {
                                    title: file_name,
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
                            }
                        };

                        let _ = db.execute(
                            "INSERT OR REPLACE INTO tracks 
                            (title, artist, album, duration_secs, bitrate, sample_rate, channels, path)
                            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                            params![
                                meta.title,
                                meta.artist,
                                meta.album,
                                meta.duration_secs,
                                meta.bitrate,
                                meta.sample_rate,
                                meta.channels,
                                meta.path
                            ],
                        );
                        count += 1;
                    }
                }
            }
        }

        count
    }

    pub fn search(&self, query: &str) -> Vec<TrackMetadata> {
        let db = match self.db.lock() {
            Ok(guard) => guard,
            Err(_) => return Vec::new(),
        };

        let sql = if query.trim().is_empty() {
            "SELECT title, artist, album, duration_secs, bitrate, sample_rate, channels, path 
             FROM tracks ORDER BY artist, album, title LIMIT 200"
        } else {
            "SELECT title, artist, album, duration_secs, bitrate, sample_rate, channels, path 
             FROM tracks 
             WHERE title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
             ORDER BY artist, title LIMIT 200"
        };

        let mut tracks = Vec::new();
        if query.trim().is_empty() {
            if let Ok(mut stmt) = db.prepare(sql) {
                if let Ok(mapped) = stmt.query_map([], |row| {
                    Ok(TrackMetadata {
                        title: row.get(0)?,
                        artist: row.get(1)?,
                        album: row.get(2)?,
                        duration_secs: row.get(3)?,
                        bitrate: row.get(4)?,
                        sample_rate: row.get(5)?,
                        channels: row.get(6)?,
                        path: row.get(7)?,
                        replay_gain_db: None,
                        cover_art: None,
                    })
                }) {
                    for track in mapped.flatten() {
                        tracks.push(track);
                    }
                }
            }
        } else {
            let search_pattern = format!("%{}%", query.trim());
            if let Ok(mut stmt) = db.prepare(sql) {
                if let Ok(mapped) = stmt.query_map(params![search_pattern], |row| {
                    Ok(TrackMetadata {
                        title: row.get(0)?,
                        artist: row.get(1)?,
                        album: row.get(2)?,
                        duration_secs: row.get(3)?,
                        bitrate: row.get(4)?,
                        sample_rate: row.get(5)?,
                        channels: row.get(6)?,
                        path: row.get(7)?,
                        replay_gain_db: None,
                        cover_art: None,
                    })
                }) {
                    for track in mapped.flatten() {
                        tracks.push(track);
                    }
                }
            }
        }

        tracks
    }

    pub fn get_all_tracks(&self) -> Vec<TrackMetadata> {
        self.search("")
    }
}
