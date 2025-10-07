use tauri_plugin_log::{Target, TargetKind, log};

use lopdf::Document;
use std::path::Path;

#[tauri::command]
fn pdf_to_text(file_bytes: Vec<u8>) -> Result<String, String> {
    let doc = Document::load_mem(&file_bytes).map_err(|e| e.to_string())?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc.extract_text(&page_numbers).map_err(|e| e.to_string())?.replace("\n", " ");

    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // Enable the Tauri devtools plugin in development builds
    // #[cfg(debug_assertions)]
    // {
    //     let devtools = tauri_plugin_devtools::init();
    //     builder = builder.plugin(devtools);
    // }


    builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout))
                .level(log::LevelFilter::Info)
                .filter(|metadata| metadata.target().starts_with("webview:"))
                .format(|out, message, record| {
                    let target = record
                        .target()
                        .strip_prefix("webview:")
                        .unwrap_or(record.target());

                    let file_part = target.split('@').nth(1).unwrap_or(target);

                    let filename = Path::new(file_part)
                        .file_name()
                        .and_then(|f| f.to_str())
                        .unwrap_or(file_part);
                    out.finish(format_args!("[{}] {}", filename, message))
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![pdf_to_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
