use crate::commands::FileSystem;
use crate::db::Db;
use crate::error::LibraryError;
use crate::models::TreeNode;
use crate::workspace::{check_name, resolve, scan};
use std::io::ErrorKind;
use tauri::State;

// Scans the library folder and rebuilds the index from it.
#[tauri::command]
pub fn library_tree(fs: State<FileSystem>, db: State<Db>) -> Result<Vec<TreeNode>, LibraryError> {
    let (tree, index) = scan(&fs.app_dir)?;
    db.replace_all(&index)?;
    Ok(tree)
}

#[tauri::command]
pub fn create_folder(fs: State<FileSystem>, folder: &str, name: &str) -> Result<(), LibraryError> {
    check_name(name)?;
    std::fs::create_dir(resolve(&fs.app_dir, folder)?.join(name))?;
    Ok(())
}

// Only empty folders: the app never recursively deletes user files.
#[tauri::command]
pub fn delete_folder(fs: State<FileSystem>, path: &str) -> Result<(), LibraryError> {
    if path.is_empty() {
        return Err(LibraryError::BadRequest("cannot delete the library root"));
    }
    std::fs::remove_dir(resolve(&fs.app_dir, path)?)?;
    Ok(())
}

// Path comes from the index, not the caller.
#[tauri::command]
pub fn delete_file(db: State<Db>, fs: State<FileSystem>, uuid: &str) -> Result<(), LibraryError> {
    let path = db.get_path(uuid)?;
    match std::fs::remove_file(fs.app_dir.join(path)) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e.into()),
        _ => Ok(()),
    }
}
