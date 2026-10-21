use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{MenuBuilder, SubmenuBuilder};

mod commands;
mod db;
mod error;
mod models;
mod scan;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());

    builder
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save", "Save")
                .build()?;
            let menu = MenuBuilder::new(app).items(&[&file_menu]).build()?;

            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id().0 == "save" {
                    // Only fails while the app is shutting down; not worth crashing over.
                    let _ = handle.emit("menu:save", ());
                }
            });

            // Remembers which library folder the user chose; the library itself lives wherever they picked.
            let config = app.path().app_config_dir()?.join("config.json");
            app.manage(state::Workspace::load(config));
            app.set_menu(menu)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library_location,
            commands::set_library,
            commands::choose_library,
            commands::library_tree,
            commands::create_folder,
            commands::delete_folder,
            commands::file_read_by_uuid,
            commands::file_upload,
            commands::delete_file,
            commands::create_new_file,
            commands::create_board,
            commands::file_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
