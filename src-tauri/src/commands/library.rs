use crate::error::LibraryError;
use crate::state::Workspace;
use crate::models::TreeNode;
use crate::workspace::{check_name, resolve, scan};
use std::io::ErrorKind;
use std::path::Path;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

// Scans the library folder and rebuilds the index from it.
#[tauri::command]
pub fn library_tree(ws: State<Workspace>) -> Result<Vec<TreeNode>, LibraryError> {
    let lib = ws.get()?;
    let (tree, index) = scan(&lib.root)?;
    lib.db.replace_all(&index)?;
    Ok(tree)
}

#[tauri::command]
pub fn create_folder(ws: State<Workspace>, folder: &str, name: &str) -> Result<(), LibraryError> {
    check_name(name)?;
    std::fs::create_dir(resolve(&ws.get()?.root, folder)?.join(name))?;
    Ok(())
}

// Only empty folders: the app never recursively deletes user files.
#[tauri::command]
pub fn delete_folder(ws: State<Workspace>, path: &str) -> Result<(), LibraryError> {
    if path.is_empty() {
        return Err(LibraryError::BadRequest("cannot delete the library root"));
    }
    std::fs::remove_dir(resolve(&ws.get()?.root, path)?)?;
    Ok(())
}

// Path comes from the index, not the caller.
#[tauri::command]
pub fn delete_file(ws: State<Workspace>, uuid: &str) -> Result<(), LibraryError> {
    let lib = ws.get()?;
    match std::fs::remove_file(lib.root.join(lib.db.get_path(uuid)?)) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e.into()),
        _ => Ok(()),
    }
}

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
pub async fn choose_library(app: AppHandle, ws: State<'_, Workspace>) -> Result<Option<String>, LibraryError> {
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
