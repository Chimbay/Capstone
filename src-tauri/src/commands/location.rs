use crate::error::LibraryError;
use crate::state::Workspace;
use std::path::Path;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

// The chosen library folder, or None on first run.
#[tauri::command]
pub fn library_location(ws: State<Workspace>) -> Option<String> {
    ws.location()
}

#[tauri::command]
pub fn set_library(ws: State<Workspace>, path: &str) -> Result<(), LibraryError> {
    ws.set(Path::new(path))
}

// Opens the native folder picker. Returns None if the user cancels.
// async so the blocking dialog runs off the main thread, which it needs to stay responsive.
#[tauri::command]
pub async fn choose_library(
    app: AppHandle,
    ws: State<'_, Workspace>,
) -> Result<Option<String>, LibraryError> {
    let Some(picked) = app
        .dialog()
        .file()
        .set_title("Choose where to keep your notes and boards")
        .blocking_pick_folder()
    else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|_| LibraryError::BadRequest("that location isn't a local folder"))?;
    ws.set(&path)?;
    Ok(ws.location())
}
