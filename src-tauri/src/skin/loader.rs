use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Cursor, Read};
use std::path::Path;
use image::ImageFormat;
use zip::ZipArchive;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SkinManifest {
    pub name: String,
    pub bitmaps: HashMap<String, String>, // e.g. "cbuttons" -> "data:image/png;base64,..."
    pub vis_colors: Vec<String>,          // Hex or rgb strings from viscolor.txt
}

pub fn unpack_wsz_skin(path_str: &str) -> Result<SkinManifest, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err("Skin file does not exist".to_string());
    }

    let skin_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Custom Skin")
        .to_string();

    let file = File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Invalid WSZ/ZIP archive: {}", e))?;

    let mut manifest = SkinManifest {
        name: skin_name,
        bitmaps: HashMap::new(),
        vis_colors: Vec::new(),
    };

    let target_bmps = [
        "main", "titlebar", "cbuttons", "numbers", "playpaus",
        "monoster", "posbar", "volume", "balance", "shufrep",
        "text", "eqmain", "eq_slider", "pledit"
    ];

    for i in 0..archive.len() {
        let mut entry = match archive.by_index(i) {
            Ok(file) => file,
            Err(_) => continue,
        };

        let raw_name = entry.name().to_string();
        let file_name = match Path::new(&raw_name).file_name().and_then(|s| s.to_str()) {
            Some(name) => name.to_lowercase(),
            None => continue,
        };

        // Parse VISCOLOR.TXT if found
        if file_name == "viscolor.txt" {
            let mut text = String::new();
            if entry.read_to_string(&mut text).is_ok() {
                manifest.vis_colors = parse_viscolors(&text);
            }
            continue;
        }

        // Check if matching any classic sprite sheet
        for target in &target_bmps {
            if file_name == format!("{}.bmp", target) || file_name == format!("{}.png", target) {
                let mut buffer = Vec::new();
                if entry.read_to_end(&mut buffer).is_ok() {
                    if let Ok(data_url) = transcode_to_png_data_url(&buffer) {
                        manifest.bitmaps.insert(target.to_string(), data_url);
                    }
                }
                break;
            }
        }
    }

    Ok(manifest)
}

fn transcode_to_png_data_url(buffer: &[u8]) -> Result<String, String> {
    let img = image::load_from_memory(buffer)
        .map_err(|e| format!("Image decode error: {}", e))?;

    let mut png_bytes: Vec<u8> = Vec::new();
    img.write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
        .map_err(|e| format!("PNG transcode error: {}", e))?;

    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    let b64 = STANDARD.encode(&png_bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

fn parse_viscolors(text: &str) -> Vec<String> {
    let mut colors = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('/') || trimmed.starts_with(';') {
            continue;
        }

        let parts: Vec<&str> = trimmed
            .split(|c| c == ',' || c == ' ' || c == '\t')
            .filter(|s| !s.is_empty())
            .collect();

        if parts.len() >= 3 {
            if let (Ok(r), Ok(g), Ok(b)) = (
                parts[0].parse::<u8>(),
                parts[1].parse::<u8>(),
                parts[2].parse::<u8>(),
            ) {
                colors.push(format!("rgb({}, {}, {})", r, g, b));
            }
        }
    }
    colors
}
