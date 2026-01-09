use std::{fs, sync::Mutex};

use tauri::Manager;
use tauri::path::PathResolver;

mod components;
mod diagnostics;

mod file_system;
mod piece_table;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    
    builder

        .setup(|app| {
            // Get app dir
            let app_dir = app.handle().path().app_data_dir().unwrap();
            // Create the output dir
            let dir_name = "library";
            let output_dir = app_dir.join(dir_name);
            fs::create_dir_all(&output_dir).unwrap();

            let fs = file_system::FileSystem::new(output_dir);
            app.manage(fs);

            Ok(())
        })
        .manage(piece_table::AppState {
            piece_table: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            piece_table::init_document,
            piece_table::insert_text,
            piece_table::get_table,
            file_system::md_to_text,
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
