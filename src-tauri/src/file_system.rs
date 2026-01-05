use lopdf::Document;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

use crate::diagnostics::LibraryError;

#[tauri::command]
// Creating markdown files
pub fn create_md(text: String, file_name: String) -> std::io::Result<()> {
    // Name needs to be adjusted
    let output_dir = "/Users/tony/coding/capstone/papers/outputs";
    fs::create_dir_all(output_dir)?;

    let mut path = PathBuf::from(output_dir);
    // Needs fixing
    path.push(format! {"{}.md", file_name});

    let mut file = File::create(&path)?;
    file.write_all(text.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub fn pdf_to_text(file_bytes: Vec<u8>, file_name: String) -> Result<String, String> {
    let doc = Document::load_mem(&file_bytes).map_err(|e| e.to_string())?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc
        .extract_text(&page_numbers)
        .map_err(|e| e.to_string())?
        .replace("\n", " ");

    let _ = create_md(text.clone(), file_name);
    Ok(text)
}

#[tauri::command]
// Markdown to text just for now. Prototype
pub fn md_to_text(path: &str) -> Result<String, LibraryError> {
    // Fix this
    let output_dir: String = "/Users/tony/coding/capstone/papers/outputs/".to_owned();
    let file = output_dir + path;
    let text = fs::read_to_string(file)?;
    Ok(text)
}
