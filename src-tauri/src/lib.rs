use std::sync::Mutex;

mod components;
mod diagnostics;

mod file_system;
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
            file_system::md_to_text,
            file_system::pdf_to_text,
            diagnostics::debug_obtain_inputs,
            diagnostics::debug_pdf_to_text,
            components::library_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
