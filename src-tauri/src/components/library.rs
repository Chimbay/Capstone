use crate::diagnostics::LibraryError;
use crate::file_system::FileSystem;
use crate::lite::{FileMetadata, Lite};
use serde::Serialize;
use std::fs;
use tauri::State;

#[derive(Serialize)]
pub struct Library {
    meta_data: Vec<FileMetadata>,
    paths: Vec<String>,
}
#[tauri::command]
pub fn library_list(db: State<Lite>, fs: State<FileSystem>) -> Result<Library, LibraryError> {
    let metadata = db.get_all_files()?;
    let library_dir = &fs.app_dir;
    let files: Vec<String> = fs::read_dir(library_dir)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<Result<Vec<_>, LibraryError>>()?;

    Ok(Library {
        meta_data: metadata,
        paths: files,
    })
}
