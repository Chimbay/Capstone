use crate::db::Db;
use crate::error::LibraryError;
use crate::models::{CreatedFile, FileMetadata};
use chrono::Local;
use lopdf::Document;
use percent_encoding::percent_decode_str;
use std::fs::write;
use std::path::PathBuf;
use tauri::State;
use tauri::ipc::{InvokeBody, Request};
use uuid::Uuid;

pub struct FileSystem {
    pub app_dir: PathBuf,
}

impl FileSystem {
    pub fn new(path: PathBuf) -> Self {
        Self { app_dir: path }
    }
}

// Writes a new markdown note with a uuid front-matter header and indexes it.
fn create_note(fs: &FileSystem, db: &Db, title: &str, body: &str) -> Result<(), LibraryError> {
    // The title becomes part of a file name, so it must not escape the library folder.
    if title.contains(['/', '\\']) || title.contains("..") {
        return Err(LibraryError::BadRequest("invalid title"));
    }

    let uuid = Uuid::new_v4().to_string();
    let filename = format!("{}-{}.md", title, uuid);
    let content = format!("---\nuuid: {}\n---\n{}", uuid, body);

    let local_time = Local::now().to_string();
    let metadata = FileMetadata {
        uuid,
        display_name: title.to_string(),
        path: filename,
        created: local_time.clone(),
        modified: local_time,
    };

    write(fs.app_dir.join(&metadata.path), content)?;
    db.create_file(metadata)?;
    Ok(())
}

// Raw request: the PDF bytes are the body and the URI-encoded title is a header,
// so large files skip JSON serialization.
#[tauri::command]
pub fn file_upload(
    fs: State<FileSystem>,
    db: State<Db>,
    request: Request<'_>,
) -> Result<(), LibraryError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(LibraryError::BadRequest("expected raw file bytes"));
    };
    let title = request
        .headers()
        .get("title")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| percent_decode_str(v).decode_utf8().ok())
        .ok_or(LibraryError::BadRequest("missing title header"))?;

    let doc = Document::load_mem(bytes)?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc.extract_text(&page_numbers)?.replace('\n', " ");

    create_note(&fs, &db, &title, &text)
}

#[tauri::command]
pub fn file_read_by_uuid(
    fs: State<FileSystem>,
    db: State<Db>,
    uuid: &str,
) -> Result<String, LibraryError> {
    let metadata = db.get_file_by_uuid(uuid)?;
    let full_path = fs.app_dir.join(&metadata.path);
    std::fs::read_to_string(full_path).map_err(Into::into)
}

#[tauri::command]
pub fn create_new_file(
    db: State<Db>,
    fs: State<FileSystem>,
    data: CreatedFile,
) -> Result<(), LibraryError> {
    create_note(&fs, &db, &data.display_name, "")
}

#[tauri::command]
pub fn file_save(
    db: State<Db>,
    fs: State<FileSystem>,
    uuid: &str,
    content: &str,
) -> Result<(), LibraryError> {
    let mut metadata = db.get_file_by_uuid(uuid)?;
    let full_path = fs.app_dir.join(&metadata.path);
    write(full_path, content)?;

    metadata.modified = Local::now().to_string();
    db.update_file(metadata)?;
    Ok(())
}
