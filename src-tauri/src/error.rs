use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LibraryError {
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error(transparent)]
    Database(#[from] rusqlite::Error),
    #[error(transparent)]
    Pdf(#[from] lopdf::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Pool(#[from] r2d2::Error),
    #[error("{0}")]
    BadRequest(&'static str),
}

impl serde::Serialize for LibraryError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
