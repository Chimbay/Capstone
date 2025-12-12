use lopdf::Document;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

#[tauri::command]
// Creating markdown files
pub fn create_md(text: String) -> std::io::Result<()> {
    // Name needs to be adjusted
    let output_dir = "/Users/tony/coding/capstone/papers/outputs";
    fs::create_dir_all(output_dir)?;

    let mut path = PathBuf::from(output_dir);
    path.push("example.md");

    let mut file = File::create(&path)?;
    file.write_all(text.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub fn pdf_to_text(file_bytes: Vec<u8>) -> Result<String, String> {
    let doc = Document::load_mem(&file_bytes).map_err(|e| e.to_string())?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc
        .extract_text(&page_numbers)
        .map_err(|e| e.to_string())?
        .replace("\n", " ");

    let _ = create_md(text.clone());
    Ok(text)
}
