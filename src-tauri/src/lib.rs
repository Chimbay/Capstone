use std::{fs, sync::Mutex};
use tauri::Manager;

mod components;
mod diagnostics;

mod file_system;
mod lite;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    builder
        .setup(|app| {
            // Get app dir
            let app_dir = app.handle().path().app_data_dir().unwrap();
            // Create the output dir
            let dir_name = "library";
            let library_dir = app_dir.join(dir_name);
            fs::create_dir_all(&library_dir)?;
            let fs = file_system::FileSystem::new(library_dir);

            // Open/create sql db
            let db_path = app_dir.join("library.db");
            let sql = lite::Lite::new(db_path)?;

            app.manage(fs);
            app.manage(sql);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            file_system::file_read_by_uuid,
            file_system::file_upload,
            components::library_list,
            // diagnostics::debug_obtain_inputs,
            // diagnostics::debug_pdf_to_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Enable the Tauri devtools plugin in development builds
    // #[cfg(debug_assertions)]
    // {
    //     let devtools = tauri_plugin_devtools::init();
    //     builder = builder.plugin(devtools);
    // }
}
