use std::fs::File;
use std::path::Path;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use crate::engine::synth::{extract_midi_metadata, load_tracker_module};
use crate::engine::types::TrackMetadata;

pub fn extract_metadata(path_str: &str) -> Result<TrackMetadata, String> {
    let path = Path::new(path_str);
    let filename = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown Track")
        .to_string();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Chiptune Trackers (MOD, XM, S3M, IT, SID)
    if ["mod", "xm", "s3m", "it", "sid"].contains(&ext.as_str()) {
        if let Ok(module) = load_tracker_module(path, &ext) {
            let song_title = if !module.name.trim().is_empty() {
                module.name.clone()
            } else {
                filename
            };

            return Ok(TrackMetadata {
                title: song_title,
                artist: format!("{} Chiptune Tracker", ext.to_uppercase()),
                album: "Tracker Module".to_string(),
                duration_secs: 180.0,
                bitrate: 705,
                sample_rate: 44100,
                channels: 2,
                path: path_str.to_string(),
                replay_gain_db: None,
                cover_art: None,
            });
        }
    }

    // MIDI Files
    if ext == "mid" || ext == "midi" {
        return extract_midi_metadata(path, filename);
    }

    // Standard Audio Formats
    let mut metadata = TrackMetadata {
        title: filename.clone(),
        artist: "Surmuni Artist".to_string(),
        album: "Unknown Album".to_string(),
        duration_secs: 0.0,
        bitrate: 320,
        sample_rate: 44100,
        channels: 2,
        path: path_str.to_string(),
        replay_gain_db: None,
        cover_art: None,
    };

    let file = File::open(path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if !ext.is_empty() {
        hint.with_extension(&ext);
    }

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    if let Ok(probed) = symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts) {
        let mut format = probed.format;

        if let Some(track) = format.default_track() {
            if let Some(tb) = track.codec_params.time_base {
                if let Some(n_frames) = track.codec_params.n_frames {
                    let time = tb.calc_time(n_frames);
                    metadata.duration_secs = time.seconds as f64 + time.frac;
                }
            }
            if let Some(rate) = track.codec_params.sample_rate {
                metadata.sample_rate = rate;
            }
            if let Some(channels) = track.codec_params.channels {
                metadata.channels = channels.count() as u16;
            }
        }

        if let Some(meta) = format.metadata().current() {
            // Check for visuals (embedded album art)
            if let Some(visual) = meta.visuals().first() {
                use base64::engine::general_purpose::STANDARD;
                use base64::Engine;
                let b64 = STANDARD.encode(&visual.data);
                let mime = if !visual.media_type.is_empty() {
                    &visual.media_type
                } else {
                    "image/jpeg"
                };
                metadata.cover_art = Some(format!("data:{};base64,{}", mime, b64));
            }

            for tag in meta.tags() {
                match tag.std_key {
                    Some(symphonia::core::meta::StandardTagKey::TrackTitle) => {
                        metadata.title = tag.value.to_string();
                    }
                    Some(symphonia::core::meta::StandardTagKey::Artist) => {
                        metadata.artist = tag.value.to_string();
                    }
                    Some(symphonia::core::meta::StandardTagKey::Album) => {
                        metadata.album = tag.value.to_string();
                    }
                    _ => {
                        // Check for ReplayGain metadata tags
                        let key_upper = tag.key.to_uppercase();
                        if key_upper.contains("REPLAYGAIN_TRACK_GAIN") {
                            let val_str = tag.value.to_string();
                            // Example format: "-6.20 dB" or "-6.20"
                            let cleaned = val_str.replace("dB", "").trim().to_string();
                            if let Ok(gain) = cleaned.parse::<f32>() {
                                metadata.replay_gain_db = Some(gain);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(metadata)
}
