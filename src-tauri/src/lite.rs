use rusqlite::{Connection, params};
use serde::Serialize;
use std::sync::Mutex;

pub struct Lite {
    pub cn: Mutex<Connection>,
}

#[derive(Serialize)]
pub struct FileMetadata {
    pub id: String,
    pub display_name: String,
    pub created: String,
    pub modified: String,
}

impl Lite {
    pub fn new(conn: Connection) -> Result<Self, rusqlite::Error> {
        let query = "CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            created TEXT NOT NULL,
            modified TEXT NOT NULL
        )";
        conn.execute(query, ())?;

        Ok(Self {
            cn: Mutex::new(conn),
        })
    }

    pub fn get_all_files(&self) -> Result<Vec<FileMetadata>, rusqlite::Error> {
        let conn = self.cn.lock().unwrap();
        let query = "SELECT * FROM files";
        let mut stmt = conn.prepare(query)?;

        let files = stmt
            .query_map([], |row| {
                Ok(FileMetadata {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    created: row.get(2)?,
                    modified: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    pub fn add_file(&self, file_data: FileMetadata) -> Result<(), rusqlite::Error> {
        let conn = self.cn.lock().unwrap();
        let query =
            "INSERT INTO files (id, display_name, created, modified) VALUES(?1, ?2, ?3, ?4)";

        conn.execute(
            query,
            params![
                &file_data.id,
                &file_data.display_name,
                &file_data.created,
                &file_data.modified
            ],
        )?;
        Ok(())
    }
}