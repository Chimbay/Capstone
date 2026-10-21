use crate::db::Db;
use crate::error::LibraryError;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

// The folder the user chose for notes and boards, with its index inside it.
#[derive(Clone)]
pub struct Library {
    pub root: PathBuf,
    pub db: Db,
}

impl Library {
    // The index lives in a hidden `.whiteboard` folder, which the tree scan skips.
    fn open(root: PathBuf) -> Result<Self, LibraryError> {
        if !root.is_dir() {
            return Err(LibraryError::BadRequest("not a folder"));
        }
        let meta = root.join(".whiteboard");
        fs::create_dir_all(&meta)?;
        let db = Db::new(meta.join("library.db"))?;
        Ok(Self { root, db })
    }
}

// The current library, if one has been chosen. The choice is remembered in `config`.
pub struct Workspace {
    config: PathBuf,
    current: Mutex<Option<Library>>,
}

impl Workspace {
    // A missing or unreadable config, or a library folder that no longer exists,
    // leaves no library chosen, so the app asks again instead of failing to start.
    pub fn load(config: PathBuf) -> Self {
        let current = fs::read_to_string(&config)
            .ok()
            .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
            .and_then(|v| v["library"].as_str().map(PathBuf::from))
            .and_then(|root| Library::open(root).ok());
        Self { config, current: Mutex::new(current) }
    }

    pub fn get(&self) -> Result<Library, LibraryError> {
        self.lock().clone().ok_or(LibraryError::BadRequest("no library folder chosen"))
    }

    pub fn location(&self) -> Option<String> {
        self.lock().as_ref().map(|l| l.root.to_string_lossy().into_owned())
    }

    pub fn set(&self, root: &Path) -> Result<(), LibraryError> {
        let library = Library::open(root.to_path_buf())?;
        if let Some(dir) = self.config.parent() {
            fs::create_dir_all(dir)?;
        }
        fs::write(&self.config, serde_json::json!({ "library": root }).to_string())?;
        *self.lock() = Some(library);
        Ok(())
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Option<Library>> {
        // A panic while holding the lock can't leave the Option half-written, so poisoning is safe to ignore.
        self.current.lock().unwrap_or_else(|e| e.into_inner())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn choice_is_remembered_and_index_is_hidden_in_library() {
        let tmp = std::env::temp_dir().join(format!("whiteboard-state-{}", Uuid::new_v4()));
        let config = tmp.join("config/config.json");
        let library = tmp.join("My Library");
        fs::create_dir_all(&library).unwrap();

        let ws = Workspace::load(config.clone());
        assert!(ws.get().is_err(), "nothing chosen on first run");
        assert!(ws.set(&tmp.join("missing")).is_err(), "must be an existing folder");

        ws.set(&library).unwrap();
        assert!(library.join(".whiteboard/library.db").is_file());
        assert_eq!(ws.location().unwrap(), library.to_string_lossy());

        // A fresh start reads the choice back from the config file.
        let again = Workspace::load(config.clone());
        assert_eq!(again.get().unwrap().root, library);

        // If the folder disappears, the app asks again instead of failing.
        // (Drop both first: Windows can't delete a folder while its index is open.)
        drop((ws, again));
        fs::remove_dir_all(&library).unwrap();
        assert!(Workspace::load(config).get().is_err());
        fs::remove_dir_all(tmp).unwrap();
    }
}
