use crate::db::Db;
use crate::error::LibraryError;
use crate::models::FileMetadata;
use tauri::State;

#[tauri::command]
pub fn library_list(db: State<Db>) -> Result<Vec<FileMetadata>, LibraryError> {
    Ok(db.list_files()?)
}

#[tauri::command]
pub fn delete_file(db: State<Db>, file: FileMetadata) -> Result<(), LibraryError> {
    db.delete_file(file)?;
    Ok(())
}
