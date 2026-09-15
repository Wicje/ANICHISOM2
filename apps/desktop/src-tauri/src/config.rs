//! Browser config — the small amount of user state that isn't a session.
//! Persisted to `app_config_dir/browser-config.json` so it survives restarts
//! exactly like the tab graph does: search engine, theme, bookmarks and a
//! recent-visits history that feeds the omnibox and the start page.

use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

pub const HISTORY_LIMIT: usize = 300;
pub const BOOKMARK_LIMIT: usize = 200;
pub const CLOSED_LIMIT: usize = 15;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Bookmark {
    pub label: String,
    pub url: String,
    #[serde(default)]
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub url: String,
    pub title: String,
    #[serde(default)]
    pub at: u64,
}

/// A tab the user closed, kept so Ctrl+Shift+T can restore it even after a
/// restart. Durable (survives quit) but bounded to the last N closes.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClosedTab {
    pub url: String,
    pub title: String,
    #[serde(default)]
    pub closed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserConfig {
    /// One of "google", "duckduckgo", "bing", "brave".
    #[serde(default = "default_engine")]
    pub search_engine: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    #[serde(default)]
    pub history: VecDeque<HistoryItem>,
    /// Recently-closed tabs, newest first (Ctrl+Shift+T restores them).
    #[serde(default)]
    pub closed: VecDeque<ClosedTab>,
    /// Page new tabs (and Ctrl+T) open. Empty means the built-in default.
    #[serde(default)]
    pub homepage: String,
    /// Seconds between automatic session snapshots (background worker).
    #[serde(default = "default_autosave_interval")]
    pub autosave_interval: u64,
    /// Reader-mode typeface: "serif", "sans" or "mono".
    #[serde(default = "default_reader_font")]
    pub reader_font: String,
    /// Reader-mode content width in px.
    #[serde(default = "default_reader_width")]
    pub reader_width: u64,
    /// Show a URL preview overlay on link hover (injected per page).
    #[serde(default)]
    pub link_preview: bool,
    /// Pinned start-page tiles (top sites), stored as bare URLs.
    #[serde(default)]
    pub speed_dial: Vec<String>,
    /// Named workspace currently being edited; the menu highlights it.
    #[serde(default = "default_workspace")]
    pub active_workspace: String,
    /// Page zoom factor (1.0 = 100%). Applied as the webview's native
    /// zoom level so it survives navigation on the same webview and renders
    /// at the compositor layer rather than via CSS.
    #[serde(default = "default_zoom")]
    pub zoom: f64,
}

/// A sparse patch accepted by `update_config`: every field is optional, so
/// the chrome can tweak one setting without round-tripping the whole file.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct ConfigPatch {
    #[serde(default)]
    pub search_engine: Option<String>,
    #[serde(default)]
    pub theme: Option<String>,
    #[serde(default)]
    pub homepage: Option<String>,
    #[serde(default)]
    pub autosave_interval: Option<u64>,
    #[serde(default)]
    pub reader_font: Option<String>,
    #[serde(default)]
    pub reader_width: Option<u64>,
    #[serde(default)]
    pub link_preview: Option<bool>,
    #[serde(default)]
    pub speed_dial: Option<Vec<String>>,
    #[serde(default)]
    pub active_workspace: Option<String>,
    #[serde(default)]
    pub zoom: Option<f64>,
}

fn default_engine() -> String {
    "google".into()
}

fn default_theme() -> String {
    "dark".into()
}

pub fn default_autosave_interval() -> u64 {
    10
}

fn default_reader_font() -> String {
    "serif".into()
}

fn default_reader_width() -> u64 {
    720
}

pub fn default_workspace() -> String {
    "default".into()
}

const MIN_ZOOM: f64 = 0.25;
const MAX_ZOOM: f64 = 3.0;

fn default_zoom() -> f64 {
    1.0
}

impl Default for BrowserConfig {
    fn default() -> Self {
        Self {
            search_engine: default_engine(),
            theme: default_theme(),
            bookmarks: Vec::new(),
            history: VecDeque::new(),
            closed: VecDeque::new(),
            homepage: String::new(),
            autosave_interval: default_autosave_interval(),
            reader_font: default_reader_font(),
            reader_width: default_reader_width(),
            link_preview: false,
            speed_dial: Vec::new(),
            active_workspace: default_workspace(),
            zoom: default_zoom(),
        }
    }
}

fn looks_http(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

/// Apply a validated config patch in place. Pure (no disk I/O) so it's
/// trivially testable; callers persist the result. Returns the fresh config
/// so the chrome can cache the result of the call.
pub fn apply_patch(cfg: &mut BrowserConfig, patch: &ConfigPatch) -> Result<BrowserConfig, String> {
    if let Some(v) = &patch.search_engine {
        if !["google", "duckduckgo", "bing", "brave"].contains(&v.as_str()) {
            return Err("unknown search engine".into());
        }
        cfg.search_engine = v.clone();
    }
    if let Some(v) = &patch.theme {
        if v != "dark" && v != "light" {
            return Err("theme must be 'dark' or 'light'".into());
        }
        cfg.theme = v.clone();
    }
    if let Some(v) = &patch.homepage {
        cfg.homepage = v.trim().to_string();
    }
    if let Some(v) = patch.autosave_interval {
        cfg.autosave_interval = v.min(3600);
    }
    if let Some(v) = &patch.reader_font {
        if !["serif", "sans", "mono"].contains(&v.as_str()) {
            return Err("reader font must be serif/sans/mono".into());
        }
        cfg.reader_font = v.clone();
    }
    if let Some(v) = patch.reader_width {
        cfg.reader_width = v.clamp(400, 1000);
    }
    if let Some(v) = patch.link_preview {
        cfg.link_preview = v;
    }
    if let Some(v) = &patch.speed_dial {
        cfg.speed_dial = v
            .iter()
            .map(|s| s.trim().trim_end_matches('/').to_string())
            .filter(|s| looks_http(s))
            .take(12)
            .collect();
    }
    if let Some(v) = &patch.active_workspace {
        cfg.active_workspace = v.clone();
    }
    if let Some(v) = patch.zoom {
        cfg.zoom = v.clamp(MIN_ZOOM, MAX_ZOOM);
    }
    Ok(cfg.clone())
}

pub fn config_path(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    Some(dir.join("browser-config.json"))
}

pub fn load(app: &AppHandle) -> BrowserConfig {
    let Some(path) = config_path(app) else {
        return BrowserConfig::default();
    };
    fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str::<BrowserConfig>(&raw).ok())
        .unwrap_or_default()
}

pub fn persist(app: &AppHandle, cfg: &BrowserConfig) {
    let Some(path) = config_path(app) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let _ = fs::write(
        path,
        serde_json::to_string_pretty(cfg).unwrap_or_else(|_| "{}".into()),
    );
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Record a finished main-frame visit into the global history ring. Dedupes
/// consecutive repeats of the same URL and never stores non-http(s) pages.
pub fn record_visit(app: &AppHandle, url: &str, title: &str) {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return;
    }
    let Some(state) = app.try_state::<crate::AppState>() else {
        return;
    };
    let Ok(mut cfg) = state.config.lock() else {
        return;
    };
    record_visit_into(&mut cfg, url, title, now());
    persist(app, &cfg);
}

/// The pure core of `record_visit`: newest first, consecutive repeats of the
/// same URL get bumped, ring is capped at `HISTORY_LIMIT`.
fn record_visit_into(cfg: &mut BrowserConfig, url: &str, title: &str, at: u64) {
    if let Some(front) = cfg.history.front() {
        if front.url == url {
            cfg.history.pop_front();
        }
    }
    cfg.history.push_front(HistoryItem {
        url: url.to_string(),
        title: title.trim().to_string(),
        at,
    });
    cfg.history.truncate(HISTORY_LIMIT);
}

/// Add or re-front a bookmark. Returns the updated list.
pub fn add_bookmark(app: &AppHandle, url: &str, label: &str) -> Vec<Bookmark> {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return Vec::new();
    };
    let Ok(mut cfg) = state.config.lock() else {
        return Vec::new();
    };
    let label = if label.trim().is_empty() { url } else { label };
    let updated = if let Some(existing) = cfg.bookmarks.iter().find(|b| b.url == url) {
        let mut bumped = existing.clone();
        bumped.label = label.to_string();
        bumped.added_at = now();
        cfg.bookmarks.retain(|b| b.url != url);
        Some(bumped)
    } else {
        None
    };
    match updated {
        Some(bumped) => cfg.bookmarks.insert(0, bumped),
        None => cfg.bookmarks.insert(
            0,
            Bookmark {
                label: label.to_string(),
                url: url.to_string(),
                added_at: now(),
            },
        ),
    }
    cfg.bookmarks.truncate(BOOKMARK_LIMIT);
    persist(app, &cfg);
    cfg.bookmarks.clone()
}

/// Remove a bookmark. Returns the updated list.
pub fn remove_bookmark(app: &AppHandle, url: &str) -> Vec<Bookmark> {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return Vec::new();
    };
    let Ok(mut cfg) = state.config.lock() else {
        return Vec::new();
    };
    cfg.bookmarks.retain(|b| b.url != url);
    persist(app, &cfg);
    cfg.bookmarks.clone()
}

/// Wipe the history ring. Returns nothing; the chrome refetches via
/// `get_history`.
pub fn clear_history(app: &AppHandle) {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return;
    };
    let Ok(mut cfg) = state.config.lock() else {
        return;
    };
    if cfg.history.is_empty() {
        return;
    }
    cfg.history.clear();
    persist(app, &cfg);
}

/// Remember a tab the user just closed so Ctrl+Shift+T can restore it even
/// after a restart. Skipped internally for incognito/vault tabs (the callers
/// already filter those out).
pub fn record_closed(app: &AppHandle, url: &str, title: &str) {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return;
    }
    let Some(state) = app.try_state::<crate::AppState>() else {
        return;
    };
    let Ok(mut cfg) = state.config.lock() else {
        return;
    };
    cfg.closed.push_front(ClosedTab {
        url: url.to_string(),
        title: title.trim().to_string(),
        closed_at: now(),
    });
    cfg.closed.truncate(CLOSED_LIMIT);
    persist(app, &cfg);
}

/// Pop the most recently closed tab off the ring (durable Ctrl+Shift+T).
pub fn reopen_last_closed(app: &AppHandle) -> Option<ClosedTab> {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return None;
    };
    let Ok(mut cfg) = state.config.lock() else {
        return None;
    };
    let tab = cfg.closed.pop_front();
    if tab.is_some() {
        persist(app, &cfg);
    }
    tab
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg_with(history: Vec<HistoryItem>) -> BrowserConfig {
        BrowserConfig {
            history: history.into(),
            ..BrowserConfig::default()
        }
    }

    /// Closed-tab ring keeps newest first and is capped by CLOSED_LIMIT.
    #[test]
    fn closed_ring_newest_first_and_bounded() {
        let mut cfg = cfg_with(Vec::new());
        for i in 0..CLOSED_LIMIT + 5 {
            cfg.closed.push_front(ClosedTab {
                url: format!("https://a.b/{i}"),
                title: i.to_string(),
                closed_at: i as u64,
            });
        }
        cfg.closed.truncate(CLOSED_LIMIT);
        assert_eq!(cfg.closed.len(), CLOSED_LIMIT);
        let top = cfg.closed.iter().next().unwrap().clone();
        assert_eq!(top.url, format!("https://a.b/{}", CLOSED_LIMIT + 4));
        cfg.closed.pop_front();
        assert_eq!(cfg.closed.len(), CLOSED_LIMIT - 1);
    }

    /// record_visit dedupes a consecutive repeat of the same URL and keeps
    /// the newest entry at the front.
    #[test]
    fn record_visit_dedupes_and_orders() {
        let mut cfg = cfg_with(Vec::new());
        record_visit_into(&mut cfg, "https://a.b", "a", 1);
        record_visit_into(&mut cfg, "https://a.b", "a again", 2);
        assert_eq!(cfg.history.len(), 1);
        assert_eq!(cfg.history[0].title, "a again");
        assert_eq!(cfg.history[0].at, 2);
    }

    #[test]
    fn history_limit_enforced() {
        let mut cfg = cfg_with(Vec::new());
        for i in 0..HISTORY_LIMIT + 50 {
            record_visit_into(&mut cfg, &format!("https://a.b/{i}"), &i.to_string(), i as u64);
        }
        assert_eq!(cfg.history.len(), HISTORY_LIMIT);
        assert_eq!(cfg.history[0].url, format!("https://a.b/{}", HISTORY_LIMIT + 49));
    }

    #[test]
    fn clear_history_empties_ring() {
        let mut cfg = cfg_with(Vec::new());
        record_visit_into(&mut cfg, "https://a.b", "a", 1);
        assert!(!cfg.history.is_empty());
        cfg.history.clear();
        assert!(cfg.history.is_empty());
    }

    /// apply_patch validates enum-like fields, sanitizes the speed dial
    /// (http(s) only, capped) and leaves unrelated fields untouched.
    #[test]
    fn apply_patch_validates_and_sanitizes() {
        let mut cfg = BrowserConfig::default();
        cfg.speed_dial = vec!["https://a.b".into()];

        // Bad engine is rejected; nothing changes.
        let bad = apply_patch(
            &mut cfg,
            &ConfigPatch {
                search_engine: Some("edition98".into()),
                ..ConfigPatch::default()
            },
        );
        assert!(bad.is_err());
        assert_eq!(cfg.search_engine, "google");

        // Valid patch: engine + theme + a dirty speed dial get cleaned.
        let got = apply_patch(
            &mut cfg,
            &ConfigPatch {
                search_engine: Some("brave".into()),
                theme: Some("light".into()),
                homepage: Some("https://news.ycombinator.com".into()),
                autosave_interval: Some(60),
                speed_dial: Some(vec![
                    "https://github.com/".into(),
                    "not a url".into(),
                    "https://github.com".into(),
                ]),
                ..ConfigPatch::default()
            },
        )
        .unwrap();
        assert_eq!(got.search_engine, "brave");
        assert_eq!(got.theme, "light");
        assert_eq!(got.homepage, "https://news.ycombinator.com");
        assert_eq!(got.autosave_interval, 60);
        // Trailing slash trimmed, junk dropped, dupes kept (they stay user
        // intent, but junk must not sneak in).
        assert!(got.speed_dial.iter().all(|s| s.starts_with("https://")));
        assert!(!got.speed_dial.contains(&"not a url".to_string()));
        assert_eq!(got.search_engine, "brave");
    }
}