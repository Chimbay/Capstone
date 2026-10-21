use crate::error::LibraryError;
use crate::state::Workspace;
use crate::models::TreeNode;
use crate::scan::{check_name, resolve, scan};
use std::io::ErrorKind;
use tauri::State;

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
