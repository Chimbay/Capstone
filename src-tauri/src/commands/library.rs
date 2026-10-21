use crate::error::LibraryError;
use crate::models::TreeNode;
use crate::scan::{check_name, resolve};
use crate::state::Workspace;
use std::io::ErrorKind;
use tauri::State;

// Async (worker thread) and under the library's I/O lock: see commands/files.rs.

// Scans the library folder and rebuilds the index from it.
#[tauri::command(async)]
pub fn library_tree(ws: State<Workspace>) -> Result<Vec<TreeNode>, LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    lib.rescan()
}

#[tauri::command(async)]
pub fn create_folder(ws: State<Workspace>, folder: &str, name: &str) -> Result<(), LibraryError> {
    check_name(name)?;
    let lib = ws.get()?;
    let _io = lib.exclusive();
    std::fs::create_dir(resolve(&lib.root, folder)?.join(name))?;
    Ok(())
}

// Only empty folders: the app never recursively deletes user files.
#[tauri::command(async)]
pub fn delete_folder(ws: State<Workspace>, path: &str) -> Result<(), LibraryError> {
    if path.is_empty() {
        return Err(LibraryError::BadRequest("cannot delete the library root"));
    }
    let lib = ws.get()?;
    let _io = lib.exclusive();
    std::fs::remove_dir(resolve(&lib.root, path)?)?;
    Ok(())
}

// Path comes from the index, not the caller, and is checked to still carry `uuid`,
// so a different note that now lives at a stale path is never deleted.
#[tauri::command(async)]
pub fn delete_file(ws: State<Workspace>, uuid: &str) -> Result<(), LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    let path = match lib.path_of(uuid) {
        // Already gone: deleting is done.
        Err(LibraryError::NotFound) => return Ok(()),
        other => other?,
    };
    match std::fs::remove_file(path) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e.into()),
        _ => Ok(()),
    }
}
