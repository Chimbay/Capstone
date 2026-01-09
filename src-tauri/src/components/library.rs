use std::fs::{self};
use tauri::State;

use crate::diagnostics::LibraryError;
use crate::file_system::FileSystem;

#[tauri::command]
pub fn library_list(state: State<FileSystem>) -> Result<Vec<String>, LibraryError> {
    let library_dir = &state.app_dir;

    let files: Vec<String> = fs::read_dir(library_dir)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<Result<Vec<_>, LibraryError>>()?;
    Ok(files)
}
