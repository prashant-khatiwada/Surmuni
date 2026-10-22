use serde::{Deserialize, Serialize};
use std::path::Path;
use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::{Accessor, ItemKey, Tag};

#[derive(Debug, Serialize, Deserialize)]
pub struct TrackTags {
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub comment: Option<String>,
}

#[tauri::command]
pub fn read_track_tags(path: String) -> Result<TrackTags, String> {
    let tagged_file = lofty::read_from_path(Path::new(&path))
        .map_err(|e| format!("Lofty read error: {}", e))?;

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    if let Some(t) = tag {
        let year_val = t.get_string(ItemKey::Year)
            .or_else(|| t.get_string(ItemKey::RecordingDate))
            .and_then(|s| s.chars().take(4).collect::<String>().parse::<u32>().ok());

        Ok(TrackTags {
            path,
            title: t.title().map(|s| s.to_string()),
            artist: t.artist().map(|s| s.to_string()),
            album: t.album().map(|s| s.to_string()),
            album_artist: t.get_string(ItemKey::AlbumArtist).map(|s| s.to_string()),
            genre: t.genre().map(|s| s.to_string()),
            year: year_val,
            track_number: t.track(),
            comment: t.comment().map(|s| s.to_string()),
        })
    } else {
        Ok(TrackTags {
            path,
            title: None,
            artist: None,
            album: None,
            album_artist: None,
            genre: None,
            year: None,
            track_number: None,
            comment: None,
        })
    }
}

#[tauri::command]
pub fn write_track_tags(tags: TrackTags) -> Result<(), String> {
    let p = Path::new(&tags.path);
    let mut tagged_file = lofty::read_from_path(p)
        .map_err(|e| format!("Lofty read error: {}", e))?;

    let tag_type = tagged_file.primary_tag_type();
    let tag = match tagged_file.tag_mut(tag_type) {
        Some(t) => t,
        None => {
            tagged_file.insert_tag(Tag::new(tag_type));
            tagged_file.primary_tag_mut().ok_or_else(|| "Failed to create tag".to_string())?
        }
    };

    if let Some(title) = tags.title {
        tag.set_title(title);
    }
    if let Some(artist) = tags.artist {
        tag.set_artist(artist);
    }
    if let Some(album) = tags.album {
        tag.set_album(album);
    }
    if let Some(album_artist) = tags.album_artist {
        tag.insert_text(ItemKey::AlbumArtist, album_artist);
    }
    if let Some(genre) = tags.genre {
        tag.set_genre(genre);
    }
    if let Some(year) = tags.year {
        tag.insert_text(ItemKey::Year, year.to_string());
    }
    if let Some(track) = tags.track_number {
        tag.set_track(track);
    }
    if let Some(comment) = tags.comment {
        tag.set_comment(comment);
    }

    tagged_file.save_to_path(p, WriteOptions::default())
        .map_err(|e| format!("Lofty write error: {}", e))?;

    Ok(())
}

