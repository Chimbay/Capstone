use crate::commands::FileSystem;
use crate::db::Db;
use crate::error::LibraryError;
use crate::models::FileMetadata;
use std::io::ErrorKind;
use tauri::State;

#[tauri::command]
pub fn library_list(db: State<Db>) -> Result<Vec<FileMetadata>, LibraryError> {
    Ok(db.list_files()?)
}

// Path comes from the db, not the caller, so a crafted path can't delete outside the library.
#[tauri::command]
pub fn delete_file(db: State<Db>, fs: State<FileSystem>, uuid: &str) -> Result<(), LibraryError> {
    let metadata = db.get_file_by_uuid(uuid)?;
    match std::fs::remove_file(fs.app_dir.join(&metadata.path)) {
        Err(e) if e.kind() != ErrorKind::NotFound => return Err(e.into()),
        _ => {}
    }
    db.delete_file(metadata)?;
    Ok(())
}
