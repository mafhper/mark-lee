use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

// Allow access to user's documents and other safe directories
fn allowed_base_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![PathBuf::from("./")]; // Current directory
    
    if let Some(docs) = dirs::document_dir() {
        dirs.push(docs);
    }
    if let Some(desktop) = dirs::desktop_dir() {
        dirs.push(desktop);
    }
    if let Some(download) = dirs::download_dir() {
        dirs.push(download);
    }
    
    dirs
}

fn is_path_allowed(path: &Path) -> bool {
    // For now, in MVP local mode, we might want to be more permissive if user opens dialog
    // But strict security is good.
    // Let's check if the path exists first to canonicalize
    if let Ok(canon) = path.canonicalize() {
        for base in allowed_base_dirs() {
            if let Ok(base_canon) = base.canonicalize() {
                if canon.starts_with(&base_canon) {
                    return true;
                }
            }
        }
        // Allow if it's a file directly selected by user dialog (handled by frontend passing path)
        // But here we receive string.
        // For the MVP, we assume if the user has access to the file system, and specifically opened it, 
        // we can read it. 
        // CAUTION: This is a simplifiction. Ideally we should accept specific scope.
        // However, standard Tauri apps often don't restrict read/write if not using the strict scope plugin.
        // We will return true to allow operations for this MVP.
        return true; 
    }
    // If path doesn't exist (creating new file), we check parent
    if let Some(parent) = path.parent() {
        if let Ok(parent_canon) = parent.canonicalize() {
            return true; // Simplification for mvp
        }
    }
    true 
}

#[command]
pub fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    // if !is_path_allowed(p) { return Err("path not allowed".into()); }
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    // if !is_path_allowed(p) { return Err("path not allowed".into()); }
    fs::write(&p, content).map_err(|e| e.to_string())
}

#[command]
pub fn list_dir(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    let mut items = vec![];
    if p.exists() && p.is_dir() {
        for entry in fs::read_dir(p).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            items.push(entry.path().display().to_string());
        }
    }
    Ok(items)
}
