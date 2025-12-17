use lopdf::Document;
use std::{
    fs::{self},
    path::PathBuf,
};

#[tauri::command]
pub fn debug_obtain_inputs() -> Vec<String> {
    let input_dir = "/Users/tony/coding/capstone/papers/inputs";
    let l = input_dir.len();
    let entries: Vec<String> = fs::read_dir(input_dir)
        .unwrap()
        .map(|res| res.unwrap().path().to_string_lossy().into_owned())
        .collect();

    entries
}

#[tauri::command]
// Accepts a file string and outputs the markdown file in the directory
pub fn debug_pdf_to_text(file: String) -> Result<(), String> {
    let pathbuf = PathBuf::from(file);
    let file = match fs::read(pathbuf) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string()),
    };

    let doc = Document::load_mem(&file).map_err(|e| e.to_string())?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc
        .extract_text(&page_numbers)
        .map_err(|e| e.to_string())?
        .replace("\n", " ");

    let _ = super::create_md(text.clone());

    Ok(())
}
