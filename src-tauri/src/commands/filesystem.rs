use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{command, Manager};

const MAX_WORKSPACE_DEPTH: usize = 8;
const MAX_CHILDREN_PER_DIRECTORY: usize = 250;
const MAX_TOTAL_WORKSPACE_NODES: usize = 5_000;
const VIRTUAL_NODE_PREFIX: &str = "__mark_lee_virtual__:";

#[derive(Debug, Serialize)]
pub struct WorkspaceNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<WorkspaceNode>,
}

#[derive(Default)]
struct BuildState {
    total_nodes: usize,
}

fn virtual_node(base_path: &Path, suffix: &str, name: String) -> WorkspaceNode {
    WorkspaceNode {
        name,
        path: format!("{VIRTUAL_NODE_PREFIX}{}#{suffix}", base_path.display()),
        is_dir: false,
        children: Vec::new(),
    }
}

fn is_ignored_directory(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | ".hg"
            | ".svn"
            | ".next"
            | ".nuxt"
            | ".svelte-kit"
            | ".turbo"
            | ".yarn"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
            | "coverage"
            | "tmp"
            | "temp"
    )
}

fn build_tree(path: &Path, depth: usize, state: &mut BuildState) -> Result<WorkspaceNode, String> {
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    let is_symlink = metadata.file_type().is_symlink();
    let is_dir = metadata.is_dir();
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_else(|| path.to_str().unwrap_or(""))
        .to_string();

    let mut node = WorkspaceNode {
        name,
        path: path.display().to_string(),
        is_dir,
        children: Vec::new(),
    };

    state.total_nodes += 1;

    if is_symlink {
        return Ok(node);
    }

    if is_dir {
        if depth >= MAX_WORKSPACE_DEPTH {
            node.children.push(virtual_node(
                path,
                "depth-limit",
                "... depth limit reached".to_string(),
            ));
            return Ok(node);
        }

        let mut entries: Vec<PathBuf> = fs::read_dir(path)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .collect();

        entries.sort_by(|a, b| {
            let a_is_dir = a.is_dir();
            let b_is_dir = b.is_dir();
            if a_is_dir && !b_is_dir {
                std::cmp::Ordering::Less
            } else if !a_is_dir && b_is_dir {
                std::cmp::Ordering::Greater
            } else {
                a.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .cmp(b.file_name().and_then(|n| n.to_str()).unwrap_or(""))
            }
        });

        let mut omitted_entries = 0usize;

        for child_path in entries {
            if node.children.len() >= MAX_CHILDREN_PER_DIRECTORY {
                omitted_entries += 1;
                continue;
            }

            if state.total_nodes >= MAX_TOTAL_WORKSPACE_NODES {
                omitted_entries += 1;
                continue;
            }

            let child_name = child_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default();

            if child_path.is_dir() && is_ignored_directory(child_name) {
                omitted_entries += 1;
                continue;
            }

            match build_tree(&child_path, depth + 1, state) {
                Ok(child) => node.children.push(child),
                Err(_) => omitted_entries += 1,
            }
        }

        if omitted_entries > 0 {
            node.children.push(virtual_node(
                path,
                "omitted",
                format!("... {omitted_entries} items omitted"),
            ));
        }
    }

    Ok(node)
}

#[command]
pub fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    fs::write(p, content).map_err(|e| e.to_string())
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

#[command]
pub fn read_workspace_tree(path: String) -> Result<WorkspaceNode, String> {
    let mut state = BuildState::default();
    build_tree(Path::new(&path), 0, &mut state)
}

#[command]
pub fn create_workspace_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    fs::write(p, "").map_err(|e| e.to_string())
}

#[command]
pub fn create_workspace_directory(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    fs::create_dir_all(p).map_err(|e| e.to_string())
}

#[command]
pub fn rename_workspace_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[command]
pub fn delete_workspace_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(target.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(target.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let dir = if target.is_dir() {
            target
        } else {
            target
                .parent()
                .map(PathBuf::from)
                .ok_or_else(|| "Invalid path".to_string())?
        };
        Command::new("xdg-open")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub fn get_user_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.display().to_string())
        .map_err(|e| e.to_string())
}

#[command]
pub fn read_user_data_file(
    app: tauri::AppHandle,
    file_name: String,
) -> Result<Option<String>, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(file_name);
    if path.exists() {
        fs::read_to_string(path)
            .map(Some)
            .map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[command]
pub fn write_user_data_file(
    app: tauri::AppHandle,
    file_name: String,
    content: String,
) -> Result<(), String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(file_name);
    fs::write(path, content).map_err(|e| e.to_string())
}

fn sanitize_filename(name: &str) -> String {
    let mut sanitized = name
        .trim()
        .replace(' ', "_")
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    while sanitized.contains("__") {
        sanitized = sanitized.replace("__", "_");
    }

    if sanitized.is_empty() {
        "image".to_string()
    } else {
        sanitized
    }
}

#[command]
pub fn copy_image_to_document_dir(
    image_path: String,
    document_path: String,
) -> Result<String, String> {
    let image = PathBuf::from(&image_path);
    if !image.exists() {
        return Err("Image file not found".to_string());
    }

    let doc = PathBuf::from(&document_path);
    let doc_dir = doc
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Invalid document path".to_string())?;

    if !doc_dir.exists() {
        fs::create_dir_all(&doc_dir).map_err(|e| e.to_string())?;
    }

    let original_name = image
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("image");
    let sanitized_name = sanitize_filename(original_name);

    let mut destination = doc_dir.join(&sanitized_name);
    if destination != image && destination.exists() {
        let stem = Path::new(&sanitized_name)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("image");
        let ext = Path::new(&sanitized_name)
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("");
        let mut index = 1;
        loop {
            let candidate = if ext.is_empty() {
                format!("{}_{}", stem, index)
            } else {
                format!("{}_{}.{}", stem, index, ext)
            };
            let candidate_path = doc_dir.join(candidate);
            if !candidate_path.exists() {
                destination = candidate_path;
                break;
            }
            index += 1;
        }
    }

    if destination != image {
        fs::copy(&image, &destination).map_err(|e| e.to_string())?;
    }

    let relative = destination
        .strip_prefix(&doc_dir)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    Ok(relative)
}

#[cfg(test)]
mod tests {
    use super::read_workspace_tree;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_workspace(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("mark-lee-{name}-{unique}"));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn read_workspace_tree_omits_heavy_directories() {
        let root = temp_workspace("tree-ignore");
        let docs = root.join("docs");
        let node_modules = root.join("node_modules");

        fs::create_dir_all(&docs).unwrap();
        fs::create_dir_all(&node_modules).unwrap();
        fs::write(docs.join("readme.md"), "# ok").unwrap();
        fs::write(node_modules.join("huge.js"), "export {}").unwrap();

        let tree = read_workspace_tree(root.display().to_string()).unwrap();
        let child_names: Vec<&str> = tree
            .children
            .iter()
            .map(|child| child.name.as_str())
            .collect();

        assert!(child_names.contains(&"docs"));
        assert!(!child_names.contains(&"node_modules"));
        assert!(child_names.iter().any(|name| name.contains("omitted")));

        fs::remove_dir_all(root).unwrap();
    }
}
