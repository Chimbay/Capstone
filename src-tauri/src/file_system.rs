use crate::diagnostics::LibraryError;
use crate::lite::{Lite, FileMetadata};
use lopdf::Document;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use uuid::Uuid;
use tauri::State;
use chrono::Local;

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
    db: State<Lite>,
    bytes: Vec<u8>,
    title: String,
) -> Result<(), LibraryError> {
    // Create a markdown file (Just plain text for now)
    let output_dir: &PathBuf = &state.app_dir;
    let mut path: PathBuf = PathBuf::from(output_dir);

    // Convert into text
    let doc: Document = Document::load_mem(&bytes).unwrap();
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();

    let text: String = doc.extract_text(&page_numbers).unwrap().replace("\n", " ");
    // Create a uuid
    let uuid: Uuid = Uuid::new_v4();
    // Create YAML Data
    let yaml = format!{"---\nuuid:{}\n---", uuid};

    let full_content = format!{"{}, \n {}", yaml, text};

    // Create the metadata and pass to SQL
    let local_time = Local::now().to_string();
    let metadata = FileMetadata {
        id: uuid.to_string(),
        display_name: title.clone(),
        created: local_time.clone(),
        modified: local_time
    };

    // Set the path and create the file
    path.push(format! {"{}-{}.md", title, uuid});
    let mut markdown: File = File::create(&path)?;
    markdown.write_all(full_content.as_bytes())?;

    // Save metadata to database
    db.add_file(metadata)?;

    Ok(())
}

#[tauri::command]
pub fn md_to_text(state: State<FileSystem>, path: &str) -> Result<String, LibraryError> {
    let library_dir = state.app_dir.join(path);
    fs::read_to_string(library_dir).map_err(Into::into)
}
