mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::list_dir,
            commands::image_loader::load_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running mark-lee application");
}
