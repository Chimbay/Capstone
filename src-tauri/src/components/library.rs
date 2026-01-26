use crate::diagnostics::LibraryError;
use crate::lite::{FileMetadata, Lite};
use tauri::State;

#[tauri::command]
pub fn library_list(db: State<Lite>) -> Result<Vec<FileMetadata>, LibraryError> {
    Ok(db.list_files()?)
}
