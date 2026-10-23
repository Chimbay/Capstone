use crate::error::LibraryError;
use crate::models::FileInfo;
use crate::scan::{check_name, resolve, with_uuid, write_atomic};
use crate::state::{Library, Workspace};
use lopdf::Document;
use percent_encoding::percent_decode_str;
use serde_json::json;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use tauri::State;
use tauri::ipc::{InvokeBody, Request};
use uuid::Uuid;

// Writes `<folder>/<title><ext>`. The next tree scan indexes it.
fn create_file(
    lib: &Library,
    folder: &str,
    title: &str,
    ext: &str,
    content: &str,
) -> Result<(), LibraryError> {
    check_name(title)?;
    let path = resolve(&lib.root, folder)?.join(format!("{title}{ext}"));
    // create_new: never overwrite an existing file with the same name.
    File::create_new(path)?.write_all(content.as_bytes())?;
    Ok(())
}

fn create_note(lib: &Library, folder: &str, title: &str, body: &str) -> Result<(), LibraryError> {
    create_file(
        lib,
        folder,
        title,
        ".md",
        &with_uuid(body, &Uuid::new_v4().to_string()),
    )
}

// File commands are `async` so they run on a worker thread instead of the main thread,
// where they'd queue every other command (and the native window) behind a slow scan or upload.

// Raw request: the PDF bytes are the body; title and folder are URI-encoded headers,
// so large files skip JSON serialization.
#[tauri::command(async)]
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

#[tauri::command(async)]
pub fn file_read_by_uuid(ws: State<Workspace>, uuid: &str) -> Result<String, LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    std::fs::read_to_string(lib.path_of(uuid)?).map_err(Into::into)
}

// Read live, so a note renamed or edited outside the app shows its current name and text.
#[tauri::command(async)]
pub fn file_info(ws: State<Workspace>, uuid: &str) -> Result<FileInfo, LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    let path = lib.path_of(uuid)?;
    let file_name = path.file_name().unwrap_or_default().to_string_lossy();
    let name = file_name
        .strip_suffix(".board.json")
        .or_else(|| file_name.strip_suffix(".md"))
        .unwrap_or(&file_name)
        .to_string();
    Ok(FileInfo {
        name,
        content: std::fs::read_to_string(&path)?,
    })
}

#[tauri::command(async)]
pub fn create_new_file(
    ws: State<Workspace>,
    folder: &str,
    title: &str,
) -> Result<(), LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    create_note(&lib, folder, title, "")
}

#[tauri::command(async)]
pub fn create_board(ws: State<Workspace>, folder: &str, title: &str) -> Result<(), LibraryError> {
    let board = json!({ "uuid": Uuid::new_v4().to_string(), "nodes": [], "edges": [] });
    let lib = ws.get()?;
    let _io = lib.exclusive();
    create_file(
        &lib,
        folder,
        title,
        ".board.json",
        &serde_json::to_string_pretty(&board)?,
    )
}

// Only overwrites the file that still carries `uuid`, so a note deleted or renamed outside
// the app is never recreated under its old name.
#[tauri::command(async)]
pub fn file_save(ws: State<Workspace>, uuid: &str, content: &str) -> Result<(), LibraryError> {
    let lib = ws.get()?;
    let _io = lib.exclusive();
    write_atomic(&lib.path_of(uuid)?, content.as_bytes())?;
    Ok(())
}
