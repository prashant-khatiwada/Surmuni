use std::io::Read;

#[tauri::command]
pub fn fetch_stream_title(url: String) -> Result<String, String> {
    let response = ureq::get(&url)
        .header("Icy-MetaData", "1")
        .call()
        .map_err(|e| format!("Stream connect error: {}", e))?;

    let metaint: usize = response
        .headers()
        .get("icy-metaint")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if metaint == 0 {
        return Ok("Live Internet Radio Stream".to_string());
    }

    let mut body = response.into_body().into_reader();
    let mut audio_buf = vec![0u8; metaint];
    body.read_exact(&mut audio_buf).map_err(|e| e.to_string())?;

    let mut len_byte = [0u8; 1];
    body.read_exact(&mut len_byte).map_err(|e| e.to_string())?;
    let meta_len = (len_byte[0] as usize) * 16;

    if meta_len > 0 {
        let mut meta_buf = vec![0u8; meta_len];
        body.read_exact(&mut meta_buf).map_err(|e| e.to_string())?;
        let meta_str = String::from_utf8_lossy(&meta_buf);
        
        // Extract StreamTitle='...';
        if let Some(start) = meta_str.find("StreamTitle='") {
            let rest = &meta_str[start + 13..];
            if let Some(end) = rest.find("';") {
                return Ok(rest[..end].to_string());
            }
        }
    }

    Ok("Online Radio Broadcast".to_string())
}
