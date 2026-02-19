use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct FileMetadata {
    pub uuid: String,
    pub display_name: String,
    pub path: String,
    pub created: String,
    pub modified: String,
}

#[derive(Deserialize, Serialize)]
pub struct CreatedFile {
    pub display_name: String,
}
