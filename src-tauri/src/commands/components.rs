use std::fs;
use std::io;

#[tauri::command]
// Obtains the output for library purposes
pub fn library_list() -> Vec<String> {
    let input_dir = "/Users/tony/coding/capstone/papers/outputs";
    let entries: Vec<String> = fs::read_dir(input_dir)
        .unwrap()
        .map(|res| res.unwrap().path().to_string_lossy().into_owned())
        .collect();

    entries
}

pub fn list() -> io::Result<Vec<String>> {
    let path = "/Users/tony/coding/capstone/papers/outputs";

    let files = fs::read_dir(path)?
        .map(|entry| {
            let entry = entry?;
            Ok(entry.file_name().to_string_lossy().into_owned())
        })
        .collect::<Result<Vec<_>, io::Error>>()?;

    Ok(files)
}
