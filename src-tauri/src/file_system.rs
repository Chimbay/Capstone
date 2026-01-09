use crate::diagnostics::LibraryError;
use lopdf::Document;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::{Manager, State};
pub struct FileSystem {
    pub app_dir: PathBuf,
}
impl FileSystem {
    pub fn new(path: PathBuf) -> Self {
        Self { app_dir: path }
    }
}

#[tauri::command]
pub fn file_upload(
    state: State<FileSystem>,
    bytes: Vec<u8>,
    title: &str,
) -> Result<(), LibraryError> {
    // Convert into text
    let doc: Document = Document::load_mem(&bytes).unwrap();
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text: String = doc.extract_text(&page_numbers).unwrap().replace("\n", " ");

    // Save a markdown file (Just plain text for now)
    let output_dir: &PathBuf = &state.app_dir;
    fs::create_dir_all(output_dir)?;
    let mut path: PathBuf = PathBuf::from(output_dir);
    // Needs fixing
    path.push(format! {"{}.md", title});

    let mut markdown: File = File::create(&path)?;
    markdown.write(text.as_bytes());

    Ok(())
}

#[tauri::command]
// Markdown to text just for now. Prototype
pub fn md_to_text(state: State<FileSystem>, path: &str) -> Result<String, LibraryError> {
    let library_dir = state.app_dir.join(path);
    fs::read_to_string(library_dir).map_err(Into::into)
}
