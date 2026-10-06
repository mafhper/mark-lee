use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, RecvTimeoutError};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Debug, Serialize)]
pub struct WorkspaceFsChange {
    pub workspace_path: String,
    pub changed_paths: Vec<String>,
}

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
        self.unwatch()?;

        let watch_target = PathBuf::from(&path_str);
        if !watch_target.exists() || !watch_target.is_dir() {
            return Err("Workspace path is not a readable directory".to_string());
        }

        let canonical = watch_target.canonicalize().map_err(|e| e.to_string())?;
        let workspace_path = canonical.display().to_string();
        let (tx, rx) = channel();
        let mut watcher =
            RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
        watcher
            .watch(Path::new(&canonical), RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;

        *self.watcher.lock().map_err(|e| e.to_string())? = Some(watcher);

        std::thread::spawn(move || loop {
            let first_event = match rx.recv() {
                Ok(Ok(event)) => event,
                Ok(Err(error)) => {
                    eprintln!("workspace watch error: {error:?}");
                    continue;
                }
                Err(_) => break,
            };

            let mut changed_paths = first_event
                .paths
                .into_iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>();

            loop {
                match rx.recv_timeout(Duration::from_millis(250)) {
                    Ok(Ok(event)) => {
                        changed_paths.extend(
                            event
                                .paths
                                .into_iter()
                                .map(|path| path.display().to_string()),
                        );
                    }
                    Ok(Err(error)) => {
                        eprintln!("workspace watch error: {error:?}");
                    }
                    Err(RecvTimeoutError::Timeout) => break,
                    Err(RecvTimeoutError::Disconnected) => return,
                }
            }

            changed_paths.sort();
            changed_paths.dedup();
            let _ = app.emit(
                "workspace-fs-change",
                WorkspaceFsChange {
                    workspace_path: workspace_path.clone(),
                    changed_paths,
                },
            );
        });

        Ok(())
    }

    pub fn unwatch(&self) -> Result<(), String> {
        let mut watcher = self.watcher.lock().map_err(|e| e.to_string())?;
        *watcher = None;
        Ok(())
    }
}

#[tauri::command]
pub fn watch_workspace(
    app: AppHandle,
    watcher: State<'_, FileWatcher>,
    path: String,
) -> Result<(), String> {
    watcher.watch(app, path)
}

#[tauri::command]
pub fn unwatch_workspace(watcher: State<'_, FileWatcher>) -> Result<(), String> {
    watcher.unwatch()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::Instant;

    /// O padrao exato que o `watch()` usa: canal **std mpsc** + `RecommendedWatcher`
    /// + `RecursiveMode::Recursive`, e a leitura por `recv_timeout` com debounce.
    ///
    /// O que ele responde: o notify 8 entrega evento nesta plataforma com o canal
    /// padrao? Se a resposta for nao, o watcher de workspace para de atualizar a
    /// arvore e as abas — em silencio.
    #[test]
    fn entrega_evento_de_arquivo_criado() {
        let dir = std::env::temp_dir().join(format!("mark-lee-notify-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("criar diretorio de teste");

        let (tx, rx) = channel();
        let mut watcher = RecommendedWatcher::new(tx, Config::default()).expect("criar watcher");
        watcher
            .watch(Path::new(&dir), RecursiveMode::Recursive)
            .expect("registrar watch");

        // Dar tempo do backend assentar antes de provocar o evento.
        std::thread::sleep(Duration::from_millis(500));
        fs::write(dir.join("novo.md"), "conteudo").expect("escrever arquivo");

        let mut achou = false;
        let limite = Instant::now() + Duration::from_secs(10);
        while Instant::now() < limite {
            match rx.recv_timeout(Duration::from_millis(250)) {
                Ok(Ok(evento)) => {
                    if evento.paths.iter().any(|p| p.ends_with("novo.md")) {
                        achou = true;
                        break;
                    }
                }
                Ok(Err(erro)) => eprintln!("erro do watcher: {erro:?}"),
                Err(_) => {}
            }
        }

        let _ = fs::remove_dir_all(&dir);
        assert!(achou, "notify nao entregou o evento do arquivo criado em 10s");
    }
}
