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
    /// Pinned in the strip; restored pin-for-pin on the next launch.
    #[serde(default)]
    pub pinned: bool,
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

#[derive(Clone)]
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

        // Archives accumulate forever without a cap (ADR-006 #6) — prune to
        // the newest 30, matching the timeline display truncation in `list`.
        self.prune_archives(app);

        Ok(id)
    }

    /// Delete all but the newest `keep` timestamped archives. Only files
    /// named `{millis}.json` are candidates — `latest.json`, `workspaces/`,
    /// and anything else is left untouched. Name order = time order because
    /// ids are millisecond timestamps.
    fn prune_archives(&self, app: &AppHandle) {
        const KEEP: usize = 30;
        let Ok(dir) = self.session_dir(app) else {
            return;
        };
        let Ok(entries) = fs::read_dir(&dir) else {
            return;
        };
        let mut archives: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.is_file()
                    && p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| {
                            !n.starts_with('.')
                                && n != "latest.json"
                                && n.ends_with(".json")
                                && n.strip_suffix(".json")
                                    .map(|stem| stem.parse::<u64>().is_ok())
                                    .unwrap_or(false)
                        })
                        .unwrap_or(false)
            })
            .collect();
        if archives.len() <= KEEP {
            return;
        }
        archives.sort(); // numeric-looking names sort like timestamps
        let excess = archives.len() - KEEP;
        for path in archives.into_iter().take(excess) {
            let _ = fs::remove_file(path);
        }
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

    // ─── Named workspaces ──────────────────────────────────────────────────
    // A workspace is a normal session snapshot kept under an explicit name in
    // `sessions/workspaces/`. Switching workspaces loads the file and replaces
    // the live tab graph (the chrome calls `restore` semantics).

    fn workspace_dir(&self, app: &AppHandle) -> Result<PathBuf, String> {
        let dir = self
            .session_dir(app)?
            .parent()
            .ok_or("no app config dir")?
            .join("workspaces");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir)
    }

    /// A filesystem-friendly slug derived from a workspace name.
    pub fn workspace_slug(name: &str) -> String {
        let slug: String = name
            .trim()
            .to_ascii_lowercase()
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
            .collect();
        let slug = slug.trim_matches('-').to_string();
        slug.chars().take(48).collect()
    }

    pub fn workspace_exists(&self, app: &AppHandle, name: &str) -> bool {
        self.workspace_dir(app)
            .map(|dir| dir.join(format!("{}.json", Self::workspace_slug(name))))
            .map(|p| p.exists())
            .unwrap_or(false)
    }

    /// Persist the live tab list under a named workspace. Returns the name.
    pub fn save_workspace(
        &self,
        app: &AppHandle,
        name: &str,
        tabs: Vec<TabRecord>,
        active: Option<String>,
        immersive: bool,
    ) -> Result<String, String> {
        let name = name.trim();
        if name.is_empty() {
            return Err("workspace needs a name".into());
        }
        let slug = Self::workspace_slug(name);
        if slug.is_empty() {
            return Err("workspace name has no usable characters".into());
        }
        let saved_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let snapshot = SessionSnapshot {
            id: slug.clone(),
            saved_at,
            tabs,
            active,
            immersive,
        };
        let path = self.workspace_dir(app)?.join(format!("{slug}.json"));
        fs::write(&path, serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        Ok(name.to_string())
    }

    pub fn load_workspace(&self, app: &AppHandle, name: &str) -> Option<SessionSnapshot> {
        let dir = self.workspace_dir(app).ok()?;
        let path = dir.join(format!("{}.json", Self::workspace_slug(name)));
        let raw = fs::read_to_string(path).ok()?;
        serde_json::from_str(&raw).ok()
    }

    pub fn delete_workspace(&self, app: &AppHandle, name: &str) -> Result<(), String> {
        let dir = self.workspace_dir(app)?;
        let path = dir.join(format!("{}.json", Self::workspace_slug(name)));
        if path.exists() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /// Every named workspace, newest first (for the workspace menu).
    pub fn list_workspaces(&self, app: &AppHandle) -> Vec<SessionSummary> {
        let Ok(dir) = self.workspace_dir(app) else {
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
            let slug = name.trim_end_matches(".json").to_string();
            let Ok(raw) = fs::read_to_string(entry.path()) else {
                continue;
            };
            let Ok(snapshot) = serde_json::from_str::<SessionSnapshot>(&raw) else {
                continue;
            };
            rows.push(SessionSummary {
                id: slug,
                saved_at: snapshot.saved_at,
                tabs: snapshot.tabs,
            });
        }
        rows.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
        rows
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Session files written before the rich fields existed (url/title only)
    /// must still load: scroll/history/index default instead of erroring.
    #[test]
    fn old_format_latest_loads_with_defaults() {
        let raw = r#"{"id":"0","saved_at":1700000000,"tabs":[{"url":"https://a.b","title":"a"}],"active":"tab-0"}"#;
        let snap: SessionSnapshot = serde_json::from_str(raw).expect("old format parses");
        assert_eq!(snap.tabs.len(), 1);
        assert_eq!(snap.active.as_deref(), Some("tab-0"));
        let tab = &snap.tabs[0];
        assert_eq!(tab.url, "https://a.b");
        assert!(tab.history.is_empty());
        assert_eq!(tab.idx, 0);
        assert_eq!(tab.scroll_y, 0.0);
        assert!(tab.vault_id.is_none());
        assert!(!snap.immersive);
    }

    /// Newer snapshots serialize with the vector-clock-free format intact.
    #[test]
    fn rich_snapshot_roundtrips() {
        let snap = SessionSnapshot {
            id: "s-1".into(),
            saved_at: 1,
            tabs: vec![TabRecord {
                url: "https://a.b/x".into(),
                title: "x".into(),
                history: vec!["https://a.b".into(), "https://a.b/x".into()],
                idx: 1,
                scroll_y: 33.0,
                vault_id: Some("vt-1".into()),
                pinned: false,
            }],
            active: Some("tab-0".into()),
            immersive: false,
        };
        let json = serde_json::to_string(&snap).unwrap();
        let back: SessionSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(back.tabs[0].vault_id.as_deref(), Some("vt-1"));
        assert_eq!(back.tabs[0].history.len(), 2);
    }
}