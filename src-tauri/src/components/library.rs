use std::fs::{self};

use crate::diagnostics::LibraryError;

#[tauri::command]
pub fn library_list() -> Result<Vec<String>, LibraryError> {
    let path = "/Users/tony/coding/capstone/papers/outputs";
    let files = fs::read_dir(path)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<Result<Vec<_>, LibraryError>>()?;
    Ok(files)
}
