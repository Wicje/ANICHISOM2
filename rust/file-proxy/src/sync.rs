use crate::connector::FileMetadata;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct SyncEngine {
    conn: Arc<Mutex<Connection>>,
}

impl SyncEngine {
    pub fn new(db_path: &str) -> anyhow::Result<Self> {
        let conn = Connection::open(db_path)?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                modified_at TEXT NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'synced',
                connector_id TEXT NOT NULL,
                last_synced TEXT
            );
            CREATE TABLE IF NOT EXISTS sync_log (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                details TEXT
            );"
        )?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn upsert_file(&self, file: &FileMetadata) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO files (id, name, path, mime_type, size, modified_at, sync_status, connector_id, last_synced)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)",
            params![
                file.id,
                file.name,
                file.path,
                file.mime_type,
                file.size,
                file.modified_at,
                file.sync_status,
                file.connector_id,
            ],
        )?;
        Ok(())
    }

    pub fn list_files(&self) -> anyhow::Result<Vec<FileMetadata>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, path, mime_type, size, modified_at, sync_status, connector_id FROM files ORDER BY modified_at DESC"
        )?;

        let files = stmt.query_map([], |row| {
            Ok(FileMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                mime_type: row.get(3)?,
                size: row.get(4)?,
                modified_at: row.get(5)?,
                sync_status: row.get(6)?,
                connector_id: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    pub fn delete_file(&self, file_id: &str) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files WHERE id = ?1", params![file_id])?;
        Ok(())
    }

    pub fn get_sync_status(&self) -> anyhow::Result<serde_json::Value> {
        let conn = self.conn.lock().unwrap();
        let total: i64 = conn.query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))?;
        let synced: i64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE sync_status = 'synced'",
            [],
            |row| row.get(0),
        )?;
        let pending: i64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE sync_status = 'pending'",
            [],
            |row| row.get(0),
        )?;

        Ok(serde_json::json!({
            "total": total,
            "synced": synced,
            "pending": pending,
            "last_sync": chrono::Utc::now().to_rfc3339(),
        }))
    }
}
