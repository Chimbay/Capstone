use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::window::Color;

mod commands;
mod db;
mod error;
mod models;
mod scan;
mod state;

/// zinc-900 to match the frontend's dark background.
fn background(theme: tauri::Theme) -> Color {
    match theme {
        tauri::Theme::Dark => Color(24, 24, 27, 255),
        _ => Color(255, 255, 255, 255),
    }
}

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

            // The window starts hidden so it doesn't flash the wrong theme; the frontend shows it after
            // its first paint. This is the fallback in case the JS never gets that far.
            if let Some(window) = app.get_webview_window("main") {
                // WebView2 paints white before first paint and while resizing; match the OS theme instead.
                if let Ok(theme) = window.theme() {
                    let _ = window.set_background_color(Some(background(theme)));
                }
                let themed = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::ThemeChanged(theme) = event {
                        let _ = themed.set_background_color(Some(background(*theme)));
                    }
                });
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    if !window.is_visible().unwrap_or(false) {
                        let _ = window.show();
                    }
                });
            }
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
            commands::file_info,
            commands::file_upload,
            commands::delete_file,
            commands::create_new_file,
            commands::create_board,
            commands::file_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
