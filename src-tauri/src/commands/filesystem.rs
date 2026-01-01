use std::fs;
use std::path::Path;
use tauri::command;

#[command]
pub fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
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
