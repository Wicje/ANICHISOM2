//! Session manager — persists the tab graph ("where you stopped") to disk
//! so the browser can resume exactly where the user left off.

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TabRecord {
    pub url: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionSnapshot {
    pub id: String,
    pub saved_at: u64,
    pub tabs: Vec<TabRecord>,
}

pub struct SessionManager;

impl SessionManager {
    pub fn new() -> Self {
        Self
    }

    fn session_dir(&self, app: &AppHandle) -> Result<PathBuf, String> {
        let dir = app
            .path()
            .app_config_dir()
            .map_err(|e| e.to_string())?
            .join("sessions");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir)
    }

    /// Persist the given tab list as the "latest" snapshot.
    pub fn save(
        &self,
        app: &AppHandle,
        tabs: Vec<TabRecord>,
    ) -> Result<String, String> {
        let id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis().to_string())
            .unwrap_or_else(|_| "0".into());

        let snapshot = SessionSnapshot {
            id: id.clone(),
            saved_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            tabs,
        };

        let path = self.session_dir(app)?.join(format!("latest.json"));
        fs::write(&path, serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;

        // Keep a timestamped audit copy for the "session history" view.
        let archive = self.session_dir(app)?.join(format!("{id}.json"));
        let _ = fs::write(&archive, serde_json::to_string(&snapshot).map_err(|e| e.to_string())?);

        Ok(id)
    }

    /// Load the latest session, if any.
    pub fn load_latest(&self, app: &AppHandle) -> Option<SessionSnapshot> {
        let path = self.session_dir(app).ok()?.join("latest.json");
        let raw = fs::read_to_string(path).ok()?;
        serde_json::from_str(&raw).ok()
    }
}