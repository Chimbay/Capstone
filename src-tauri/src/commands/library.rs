use crate::error::LibraryError;
use crate::state::Workspace;
use crate::models::TreeNode;
use crate::scan::{check_name, resolve};
use std::io::ErrorKind;
use tauri::State;

// Scans the library folder and rebuilds the index from it.
#[tauri::command]
pub fn library_tree(ws: State<Workspace>) -> Result<Vec<TreeNode>, LibraryError> {
    ws.get()?.rescan()
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

// Path comes from the index, not the caller, and is checked to still carry `uuid`,
// so a different note that now lives at a stale path is never deleted.
#[tauri::command]
pub fn delete_file(ws: State<Workspace>, uuid: &str) -> Result<(), LibraryError> {
    let path = match ws.get()?.path_of(uuid) {
        // Already gone: deleting is done.
        Err(LibraryError::NotFound) => return Ok(()),
        other => other?,
    };
    match std::fs::remove_file(path) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e.into()),
        _ => Ok(()),
    }
}
