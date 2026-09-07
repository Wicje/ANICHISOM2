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
    #[serde(default)]
    pub title: String,
    /// Visit order, for per-tab back/forward restoration.
    #[serde(default)]
    pub history: Vec<String>,
    /// Current position in `history` when the session was saved.
    #[serde(default)]
    pub idx: usize,
    /// Vertical scroll offset on the page a restored tab should reopen at.
    #[serde(default)]
    pub scroll_y: f64,
    /// Non-null only for vaulted tabs — their real URL lives in the keyring
    /// manifest; the session file keeps just this opaque reference.
    #[serde(default)]
    pub vault_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionSnapshot {
    pub id: String,
    pub saved_at: u64,
    pub tabs: Vec<TabRecord>,
    /// Which tab was focused when the session was saved.
    #[serde(default)]
    pub active: Option<String>,
    /// Whether clean/focus mode (chrome hidden) was active.
    #[serde(default)]
    pub immersive: bool,
}

/// A checkpoint in the session memory timeline (for the new-tab page).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
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
        active: Option<String>,
        immersive: bool,
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
            active,
            immersive,
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
        self.load_snapshot(app, "latest")
    }

    /// Load a specific snapshot by id (or the "latest" pointer).
    pub fn load_snapshot(&self, app: &AppHandle, id: &str) -> Option<SessionSnapshot> {
        let path = self.session_dir(app).ok()?.join(format!("{id}.json"));
        let raw = fs::read_to_string(path).ok()?;
        serde_json::from_str(&raw).ok()
    }

    /// Reviewable memory: every archived checkpoint, newest first. The live
    /// "latest" pointer is included too, so the current workspace always shows.
    pub fn list(&self, app: &AppHandle) -> Vec<SessionSummary> {
        let Ok(dir) = self.session_dir(app) else {
            return Vec::new();
        };
        let Ok(entries) = fs::read_dir(&dir) else {
            return Vec::new();
        };

        let mut rows: Vec<SessionSummary> = Vec::new();
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".json") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(entry.path()) else {
                continue;
            };
            let Ok(snapshot) = serde_json::from_str::<SessionSnapshot>(&raw) else {
                continue;
            };
            rows.push(SessionSummary {
                id: snapshot.id,
                saved_at: snapshot.saved_at,
                tabs: snapshot.tabs,
            });
        }
        rows.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
        rows.truncate(30);
        rows
    }
}