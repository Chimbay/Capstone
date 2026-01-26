use crate::diagnostics::LibraryError;
use crate::lite::{FileMetadata, Lite};
use chrono::Local;
use lopdf::Document;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

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
    let library_dir: &PathBuf = &state.app_dir;
    let mut path: PathBuf = PathBuf::from(library_dir);
    
    // Convert into text
    let doc = Document::load_mem(&bytes)?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();

    let text: String = doc.extract_text(&page_numbers).unwrap().replace("\n", " ");
    // Create a uuid
    let uuid: Uuid = Uuid::new_v4();
    // Create YAML Data
    let yaml = format! {"---\nuuid:{}\n---", uuid};

    let full_content = format! {"{}, \n {}", yaml, text};

    // Set the filename
    let filename = format!("{}-{}.md", title, uuid);
    path.push(&filename);

    // Create the metadata and pass to SQL
    let local_time = Local::now().to_string();
    let metadata = FileMetadata {
        uuid: uuid.to_string(),
        display_name: title.clone(),
        path: filename,
        created: local_time.clone(),
        modified: local_time,
    };
    let mut markdown: File = File::create(&path)?;
    markdown.write_all(full_content.as_bytes())?;
    // Save metadata to database
    db.create_file(metadata)?;
    Ok(())
}

#[tauri::command]
pub fn file_read_by_uuid(fs: State<FileSystem>, db: State<Lite>, uuid: &str) -> Result<String, LibraryError> {
    let metadata = db.get_file_by_uuid(uuid)?;
    let full_path = fs.app_dir.join(&metadata.path);
    std::fs::read_to_string(full_path).map_err(Into::into)
}
