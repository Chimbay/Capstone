use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use serde::Serialize;

pub type DbPool = Pool<SqliteConnectionManager>;
pub type DbConn = PooledConnection<SqliteConnectionManager>;

pub struct Lite {
    pool: DbPool,
}

#[derive(Serialize)]
pub struct FileMetadata {
    pub uuid: String,
    pub display_name: String,
    pub path: String,
    pub created: String,
    pub modified: String,
}

impl Lite {
    pub fn new(db_path: std::path::PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = SqliteConnectionManager::file(db_path);
        const MAX_CONNECTIONS: u32 = 10;
        let pool = Pool::builder().max_size(MAX_CONNECTIONS).build(manager)?;
        // Initalize schema
        let conn = pool.get()?;
        let sql = "CREATE TABLE IF NOT EXISTS files (
            uuid TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            path TEXT NOT NULL,
            created TEXT NOT NULL,
            modified TEXT NOT NULL
        )";

        conn.execute(sql, ())?;

        Ok(Self { pool })
    }

    fn conn(&self) -> Result<DbConn, rusqlite::Error> {
        match self.pool.get() {
            Ok(conn) => Ok(conn),
            Err(e) => Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(1),
                Some(e.to_string()),
            )),
        }
    }

    pub fn create_file(&self, file_data: FileMetadata) -> Result<(), rusqlite::Error> {
        let conn = self.conn()?;
        let query = "INSERT INTO files (uuid, display_name, path, created, modified) VALUES(?1, ?2, ?3, ?4, ?5)";

        conn.execute(
            query,
            params![
                file_data.uuid,
                file_data.display_name,
                file_data.path,
                file_data.created,
                file_data.modified
            ],
        )?;
        Ok(())
    }

    pub fn get_file_by_uuid(&self, uuid: &str) -> Result<FileMetadata, rusqlite::Error> {
        let conn = self.conn()?;
        let sql = "SELECT uuid, display_name, path, created, modified FROM files WHERE uuid = ?1";
        let mut stmt = conn.prepare(sql)?;
        stmt.query_row([uuid], |row| {
            Ok(FileMetadata {
                uuid: row.get(0)?,
                display_name: row.get(1)?,
                path: row.get(2)?,
                created: row.get(3)?,
                modified: row.get(4)?,
            })
        })
    }
    pub fn list_files(&self) -> Result<Vec<FileMetadata>, rusqlite::Error> {
        let conn = self.conn()?;
        let sql = "SELECT uuid, display_name, path, created, modified FROM files";
        let mut stmt = conn.prepare(sql)?;
        let files = stmt
            .query_map([], |row| {
                Ok(FileMetadata {
                    uuid: row.get(0)?,
                    display_name: row.get(1)?,
                    path: row.get(2)?,
                    created: row.get(3)?,
                    modified: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }
}
