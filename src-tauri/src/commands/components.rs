use std::fs::{self};
use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LibraryError {
    #[error(transparent)]
    Io(#[from] io::Error),
}
impl serde::Serialize for LibraryError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
pub fn library_list() -> Result<Vec<String>, LibraryError> {
    let path = "/Users/tony/coding/capstone/papers/outputs";
    let files = fs::read_dir(path)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<Result<Vec<_>, LibraryError>>()?;
    Ok(files)
}
