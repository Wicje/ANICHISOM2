//! Continua Daemon Configuration
//!
//! Stored at `<config_dir>/continua/daemon.json` (platform config dir, e.g.
//! ~/.config/continua/daemon.json on Linux). The user pastes a device
//! capability token minted from their authenticated web session
//! (`POST /api/connect/device-token`).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DaemonConfig {
    /// Base URL of the Continua server, e.g. "https://continua.app"
    #[serde(default = "default_server_url")]
    pub server_url: String,
    /// Device capability token (30-day JWT) — no raw API keys ever.
    #[serde(default)]
    pub capability_token: String,
    /// User id filled automatically from the token claims after first sync.
    #[serde(default)]
    pub workspace: String,
    /// Folders to scan for git projects. Empty = use sensible defaults.
    #[serde(default)]
    pub watch_paths: Vec<String>,
    /// Checkpoint cadence in seconds (30–300).
    #[serde(default = "default_interval")]
    pub interval_secs: u64,
    /// Journal cloud-sync cadence in seconds (batched, not per-event).
    #[serde(default = "default_sync_interval")]
    pub sync_interval_secs: u64,
    /// Local journal retention in days for raw event files.
    #[serde(default = "default_journal_keep_days")]
    pub journal_keep_days: i64,
}

fn default_server_url() -> String {
    "http://localhost:3000".to_string()
}

fn default_interval() -> u64 {
    60
}

fn default_sync_interval() -> u64 {
    45
}

fn default_journal_keep_days() -> i64 {
    7
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            server_url: default_server_url(),
            capability_token: String::new(),
            workspace: "Continua OS".to_string(),
            watch_paths: Vec::new(),
            interval_secs: default_interval(),
            sync_interval_secs: default_sync_interval(),
            journal_keep_days: default_journal_keep_days(),
        }
    }
}

pub fn config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join("continua").join("daemon.json"))
}

pub fn load_config() -> DaemonConfig {
    if let Some(path) = config_path() {
        if let Ok(contents) = fs::read_to_string(&path) {
            match serde_json::from_str(&contents) {
                Ok(cfg) => return cfg,
                Err(e) => {
                    log::warn!("[daemon] corrupt config at {:?}: {}", path, e);
                }
            }
        }
    }
    DaemonConfig::default()
}

pub fn save_config(config: &DaemonConfig) -> std::io::Result<()> {
    let Some(path) = config_path() else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "no config dir",
        ));
    };
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, serde_json::to_string_pretty(config)?)?;
    log::info!("[daemon] config saved to {:?}", path);
    Ok(())
}
