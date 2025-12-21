use std::fs::{self};

use crate::components::error::LibraryError;

#[tauri::command]
pub fn library_list() -> Result<Vec<String>, LibraryError> {
    let path = "/Users/tony/coding/capstone/papers/outputs";
    let files = fs::read_dir(path)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<Result<Vec<_>, LibraryError>>()?;
    Ok(files)
}

struct PieceTable {
    buffer: Vec<u8>,
    start: u16,
    end: u16,
}

pub fn fetch_md() -> Result<>

