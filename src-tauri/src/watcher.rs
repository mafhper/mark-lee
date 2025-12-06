use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

pub struct FileWatcher {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
        }
    }

    pub fn watch(&self, app: AppHandle, path_str: String) -> Result<(), String> {
        let mut watcher_guard = self.watcher.lock().map_err(|e| e.to_string())?;
        
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
        
        let path = Path::new(&path_str);
        // Watch the parent directory of the file, or the directory itself
        let watch_target = if path.is_file() {
            path.parent().unwrap_or(path)
        } else {
            path
        };

        watcher.watch(watch_target, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
        
        *watcher_guard = Some(watcher);

        // Spawn a thread to handle events
        std::thread::spawn(move || {
            for res in rx {
                match res {
                    Ok(event) => {
                        // Simple debounce could be added here
                         let _ = app.emit("fs-change", event);
                    }
                    Err(e) => println!("watch error: {:?}", e),
                }
            }
        });

        Ok(())
    }
}
