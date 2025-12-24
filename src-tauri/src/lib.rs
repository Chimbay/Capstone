use std::path::Path;
use std::sync::Mutex;
use tauri_plugin_log::{Target, TargetKind, log};

mod commands;
mod components;

mod piece_table;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Tauri APP STARTED");
    let builder = tauri::Builder::default();
    // Enable the Tauri devtools plugin in development builds
    // #[cfg(debug_assertions)]
    // {
    //     let devtools = tauri_plugin_devtools::init();
    //     builder = builder.plugin(devtools);
    // }

    builder
        .manage(piece_table::AppState {
            piece_table: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            piece_table::init_document,
            piece_table::insert_text,
            piece_table::get_table,
            commands::pdf_to_text,
            commands::debug_obtain_inputs,
            commands::debug_pdf_to_text,
            commands::library_list,
            commands::md_to_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
