use crate::db::Db;
use crate::error::LibraryError;
use crate::workspace::{check_name, resolve, with_uuid};
use lopdf::Document;
use percent_encoding::percent_decode_str;
use std::fs::{File, write};
use std::io::Write;
use std::path::{Path, PathBuf};
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

// Writes `<folder>/<title>.md` with a uuid header. The next tree scan indexes it.
fn create_note(fs: &FileSystem, folder: &str, title: &str, body: &str) -> Result<(), LibraryError> {
    check_name(title)?;
    let path = resolve(&fs.app_dir, folder)?.join(format!("{title}.md"));
    // create_new: never overwrite an existing note with the same name.
    let mut file = File::create_new(path)?;
    file.write_all(with_uuid(body, &Uuid::new_v4().to_string()).as_bytes())?;
    Ok(())
}

// Raw request: the PDF bytes are the body; title and folder are URI-encoded headers,
// so large files skip JSON serialization.
#[tauri::command]
pub fn file_upload(fs: State<FileSystem>, request: Request<'_>) -> Result<(), LibraryError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(LibraryError::BadRequest("expected raw file bytes"));
    };
    let header = |name: &'static str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| percent_decode_str(v).decode_utf8().ok())
            .ok_or(LibraryError::BadRequest("missing upload header"))
    };
    let file_name = header("title")?;
    let folder = header("folder")?;
    let title = Path::new(&*file_name)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();

    let doc = Document::load_mem(bytes)?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc.extract_text(&page_numbers)?.replace('\n', " ");

    create_note(&fs, &folder, &title, &text)
}

#[tauri::command]
pub fn file_read_by_uuid(
    fs: State<FileSystem>,
    db: State<Db>,
    uuid: &str,
) -> Result<String, LibraryError> {
    let path = db.get_path(uuid)?;
    std::fs::read_to_string(fs.app_dir.join(path)).map_err(Into::into)
}

#[tauri::command]
pub fn create_new_file(fs: State<FileSystem>, folder: &str, title: &str) -> Result<(), LibraryError> {
    create_note(&fs, folder, title, "")
}

#[tauri::command]
pub fn file_save(
    db: State<Db>,
    fs: State<FileSystem>,
    uuid: &str,
    content: &str,
) -> Result<(), LibraryError> {
    let path = db.get_path(uuid)?;
    write(fs.app_dir.join(path), content)?;
    Ok(())
}
