use std::fs;
use tauri::Manager;

mod commands;
mod db;
mod error;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    builder
        .setup(|app| {
            let app_dir = app.handle().path().app_data_dir().unwrap();

            let library_dir = app_dir.join("library");
            fs::create_dir_all(&library_dir)?;
            let fs = commands::FileSystem::new(library_dir);

            let db_path = app_dir.join("library.db");
            let sql = db::Db::new(db_path)?;

            app.manage(fs);
            app.manage(sql);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_read_by_uuid,
            commands::file_upload,
            commands::library_list,
            commands::delete_file,
            commands::create_new_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
