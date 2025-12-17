use thiserror::Error;
use std::io;

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
