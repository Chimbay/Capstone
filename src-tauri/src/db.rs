use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{OptionalExtension, params};
use std::collections::HashMap;

use crate::error::LibraryError;
use crate::scan::IndexRow;

pub type DbPool = Pool<SqliteConnectionManager>;
pub type DbConn = PooledConnection<SqliteConnectionManager>;

// uuid → path index of the notes on disk. The files are the source of truth;
// this table is rebuilt from them on every scan.
#[derive(Clone)]
pub struct Db {
    pool: DbPool,
}

impl Db {
    pub fn new(db_path: std::path::PathBuf) -> Result<Self, LibraryError> {
        let manager = SqliteConnectionManager::file(db_path);
        const MAX_CONNECTIONS: u32 = 10;
        let pool = Pool::builder().max_size(MAX_CONNECTIONS).build(manager)?;

        let conn = pool.get()?;
        // `files` was the old source-of-truth table; the index replaces it.
        conn.execute_batch(
            "DROP TABLE IF EXISTS files;
            CREATE TABLE IF NOT EXISTS notes (
                uuid TEXT PRIMARY KEY,
                path TEXT NOT NULL
            )",
        )?;

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

    pub fn get_path(&self, uuid: &str) -> Result<Option<String>, rusqlite::Error> {
        let conn = self.conn()?;
        conn.query_row("SELECT path FROM notes WHERE uuid = ?1", [uuid], |row| {
            row.get(0)
        })
        .optional()
    }

    // uuid -> path for every indexed file.
    pub fn all(&self) -> Result<HashMap<String, String>, rusqlite::Error> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT uuid, path FROM notes")?;
        let rows = stmt.query_map((), |row| Ok((row.get(0)?, row.get(1)?)))?;
        rows.collect()
    }

    pub fn replace_all(&self, notes: &[IndexRow]) -> Result<(), rusqlite::Error> {
        let mut conn = self.conn()?;
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM notes", ())?;
        {
            let mut stmt = tx.prepare("INSERT INTO notes (uuid, path) VALUES (?1, ?2)")?;
            for (uuid, path) in notes {
                stmt.execute(params![uuid, path])?;
            }
        }
        tx.commit()
    }
}
