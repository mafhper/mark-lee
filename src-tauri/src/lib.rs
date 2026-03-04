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
            commands::filesystem::read_workspace_tree,
            commands::filesystem::create_workspace_file,
            commands::filesystem::create_workspace_directory,
            commands::filesystem::rename_workspace_path,
            commands::filesystem::delete_workspace_path,
            commands::filesystem::reveal_in_file_manager,
            commands::filesystem::get_user_data_path,
            commands::filesystem::read_user_data_file,
            commands::filesystem::write_user_data_file,
            commands::filesystem::copy_image_to_document_dir,
            commands::image_loader::load_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running mark-lee application");
}
