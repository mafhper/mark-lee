use base64::{Engine as _, engine::general_purpose};
use std::fs;
use std::path::PathBuf;
use tauri::command;

// Maximum image size: 10MB
const MAX_IMAGE_SIZE: u64 = 10 * 1024 * 1024;

// Allowed image extensions
const ALLOWED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];

/// Load a local image file and return it as a base64 data URL
/// This bypasses the asset:// protocol issues in Tauri webview
#[command]
pub fn load_image(path: String) -> Result<String, String> {
    // Normalize path separators
    let normalized_path = path.replace('/', "\\").replace("\\\\", "\\");
    let image_path = PathBuf::from(&normalized_path);
    
    // Check if file exists
    if !image_path.exists() {
        return Err(format!("File not found: {}", normalized_path));
    }
    
    // Check if it's a file (not directory)
    if !image_path.is_file() {
        return Err("Path is not a file".to_string());
    }
    
    // Validate extension
    let extension = image_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!("Unsupported image type: .{}", extension));
    }
    
    // Check file size
    let metadata = fs::metadata(&image_path).map_err(|e| format!("Cannot read metadata: {}", e))?;
    if metadata.len() > MAX_IMAGE_SIZE {
        return Err(format!(
            "Image too large: {} MB (max: 10 MB)",
            metadata.len() / (1024 * 1024)
        ));
    }
    
    // Read file bytes
    let bytes = fs::read(&image_path).map_err(|e| format!("Cannot read file: {}", e))?;
    
    // Determine MIME type
    let mime = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "image/png",
    };
    
    // Encode to base64
    let b64 = general_purpose::STANDARD.encode(&bytes);
    
    // Return as data URL
    Ok(format!("data:{};base64,{}", mime, b64))
}
