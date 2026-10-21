use crate::error::LibraryError;
use crate::state::{Library, Workspace};
use crate::scan::{check_name, resolve, with_uuid};
use lopdf::Document;
use serde_json::json;
use percent_encoding::percent_decode_str;
use std::fs::{File, write};
use std::io::Write;
use std::path::Path;
use tauri::State;
use tauri::ipc::{InvokeBody, Request};
use uuid::Uuid;

// Writes `<folder>/<title><ext>`. The next tree scan indexes it.
fn create_file(lib: &Library, folder: &str, title: &str, ext: &str, content: &str) -> Result<(), LibraryError> {
    check_name(title)?;
    let path = resolve(&lib.root, folder)?.join(format!("{title}{ext}"));
    // create_new: never overwrite an existing file with the same name.
    File::create_new(path)?.write_all(content.as_bytes())?;
    Ok(())
}

fn create_note(lib: &Library, folder: &str, title: &str, body: &str) -> Result<(), LibraryError> {
    create_file(lib, folder, title, ".md", &with_uuid(body, &Uuid::new_v4().to_string()))
}

// Raw request: the PDF bytes are the body; title and folder are URI-encoded headers,
// so large files skip JSON serialization.
#[tauri::command]
pub fn file_upload(ws: State<Workspace>, request: Request<'_>) -> Result<(), LibraryError> {
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

    create_note(&ws.get()?, &folder, &title, &text)
}

#[tauri::command]
pub fn file_read_by_uuid(ws: State<Workspace>, uuid: &str) -> Result<String, LibraryError> {
    let lib = ws.get()?;
    std::fs::read_to_string(lib.root.join(lib.db.get_path(uuid)?)).map_err(Into::into)
}

#[tauri::command]
pub fn create_new_file(ws: State<Workspace>, folder: &str, title: &str) -> Result<(), LibraryError> {
    create_note(&ws.get()?, folder, title, "")
}

#[tauri::command]
pub fn create_board(ws: State<Workspace>, folder: &str, title: &str) -> Result<(), LibraryError> {
    let board = json!({ "uuid": Uuid::new_v4().to_string(), "nodes": [], "edges": [] });
    create_file(&ws.get()?, folder, title, ".board.json", &serde_json::to_string_pretty(&board)?)
}

// Writes to a temp file and renames it over the original, so a crash mid-save
// leaves the old version intact instead of a half-written note or board.
#[tauri::command]
pub fn file_save(ws: State<Workspace>, uuid: &str, content: &str) -> Result<(), LibraryError> {
    let lib = ws.get()?;
    let path = lib.root.join(lib.db.get_path(uuid)?);
    let mut tmp = path.clone().into_os_string();
    tmp.push(".tmp");
    write(&tmp, content)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}
