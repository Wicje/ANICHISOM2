//! Continua Desktop — library crate.
//!
//! Wires the Rust core (tabs, sessions, vault, capture, trust, sync)
//! to the Tauri runtime and exposes commands for the React chrome UI.

mod capture;
mod config;
mod inpage;
mod session;
mod sync;
mod tab_engine;
mod tabview;
mod trust;
mod vault;

use std::sync::Mutex;
use std::time::Duration;

use tauri::{Emitter, Manager};

use crate::config::BrowserConfig;
use crate::session::{SessionManager, TabRecord};
use crate::sync::SyncClient;
use crate::tab_engine::{NavState, TabManager};
use crate::trust::DeviceInfo;
use crate::vault::VaultEngine;

/// Height of the React chrome toolbar in logical pixels.
/// Tab webviews are positioned below this strip.
pub const CHROME_HEIGHT: f64 = 96.0;

/// Default Continua backend. Overridden by the chrome UI on first launch.
pub const DEFAULT_CONTINUA_URL: &str = "https://continuaos.cc";

/// Shared application state.
pub struct AppState {
    pub tabs: Mutex<TabManager>,
    pub session: Mutex<SessionManager>,
    pub vault: Mutex<VaultEngine>,
    pub trust: Mutex<DeviceInfo>,
    pub sync: Mutex<SyncClient>,
    pub continua_url: Mutex<String>,
    pub config: Mutex<BrowserConfig>,
    /// Keyed device id derived from the keyring fingerprint. Populated in
    /// `setup` once the app handle (and keyring) is available.
    pub device_id: Mutex<Option<String>>,
}

// ─── Commands ───────────────────────────────────────────────────────────────

#[tauri::command]
fn open_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, url: String) -> Result<String, String> {
    let label = state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .open(&app, url)?;
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(label)
}

/// Open a private (incognito) tab. Private tabs skip the global history ring
/// and are excluded from every session snapshot, so no trace survives.
#[tauri::command]
fn open_incognito_tab(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    url: String,
) -> Result<String, String> {
    let label = state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .open_incognito(&app, url)?;
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(label)
}

#[tauri::command]
fn close_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .close(&app, &label)
}

#[tauri::command]
fn activate_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .activate(&app, &label)
}

/// Reload a tab's page (F5). Eval runs inside the tab's own webview so the
/// reload works regardless of the page origin.
#[tauri::command]
fn reload_tab(app: tauri::AppHandle, label: String) -> Result<(), String> {
    crate::tabview::reload(&app, &label)?;
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            let _ = tabs.raise(&app, &label);
        }
    }
    Ok(())
}

#[tauri::command]
fn back_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.back(&app, &label)?;
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(())
}

#[tauri::command]
fn forward_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.forward(&app, &label)?;
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(())
}

/// Navigate the active tab to a URL entered in the address bar (in place).
#[tauri::command]
fn navigate_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String, url: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.navigate(&app, &label, url)?;
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(())
}

#[tauri::command]
fn nav_state(state: tauri::State<'_, AppState>, label: String) -> Result<NavState, String> {
    state.tabs.lock().map_err(|e| e.to_string())?.nav_state(&label)
}

#[tauri::command]
fn list_tabs(state: tauri::State<'_, AppState>) -> Vec<String> {
    state.tabs.lock().map(|t| t.labels()).unwrap_or_default()
}

#[tauri::command]
fn close_all_tabs(state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.close_all(&app)
}

/// Keep existing tab webviews filling the area below the chrome strip.
/// Triggered by the frontend on any window resize/move; geometry is derived
/// entirely from the main window so source-of-truth stays in Rust.
#[tauri::command]
fn update_tab_layout(state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<(), String> {
    state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .relayout(&app)
}

/// Pop the most recently closed tab from the durable ring (Ctrl+Shift+T) and
/// reopen it as a normal tab. Returns the fresh tab's mirror.
#[tauri::command]
fn reopen_last_closed(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Option<crate::tab_engine::TabInfo>, String> {
    let Some(tab) = crate::config::reopen_last_closed(&app) else {
        return Ok(None);
    };
    let label = state.tabs.lock().map_err(|e| e.to_string())?.open(&app, tab.url)?;
    let info = state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .infos()
        .into_iter()
        .find(|i| i.label == label);
    if let Ok(tabs) = state.tabs.lock() {
        let _ = tabs.raise(&app, &label);
    }
    Ok(info)
}

/// Persist the current tab graph (as mirrored by the chrome).
#[tauri::command]
fn save_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    _tabs: Vec<TabRecord>,
    active: Option<String>,
) -> Result<String, String> {
    let tabs_guard = state.tabs.lock().map_err(|e| e.to_string())?;
    // Records derive from the engine so vault tabs stay redacted to their
    // vault_id; the chrome payload could leak a vault URL in plaintext.
    let snap = tabs_guard.snapshot(&app);
    let immersive = tabs_guard.immersive();
    drop(tabs_guard);
    state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .save(&app, snap, active, immersive)
}

/// Reopen a workspace checkpoint (the most recent session by default, or a
/// chosen id from the memory timeline) with its full state — per-tab history,
/// scroll positions, active tab and clean/focus mode all come back.
/// Tear down the current tab graph and rebuild it from a snapshot (the shared
/// core of `restore_session`, `open_workspace` and cloud pulls). Returns the
/// restored tabs (empty when tabs already existed and `replace` was false).
fn apply_snapshot(
    state: &AppState,
    app: &tauri::AppHandle,
    snap: crate::session::SessionSnapshot,
    replace: bool,
) -> Result<Option<Vec<tab_engine::TabInfo>>, String> {
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    // Imported/legacy checkpoints adopt the workspace wholesale.
    if replace {
        let existing = tabs.labels();
        for label in existing {
            let _ = tabs.close(app, &label);
        }
    }
    if !tabs.labels().is_empty() {
        return Ok(None);
    }
    // Always restore in normal (non-immersive) mode — a relaunch should never
    // drop the user straight into a chrome-less window without warning.
    tabs.set_immersive(false);
    let last = tabs.restore_from_snapshot(app, snap.tabs)?;
    tabs.relayout(app)?;
    let active = last.or(snap.active);
    drop(tabs);

    if let Some(label) = &active {
        if let Ok(mut tabs) = state.tabs.lock() {
            let _ = tabs.activate(app, label);
        }
    } else if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }

    let tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    Ok(Some(tabs.infos()))
}

#[tauri::command]
fn restore_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    id: Option<String>,
    replace: Option<bool>,
) -> Result<Option<Vec<tab_engine::TabInfo>>, String> {
    let snap = {
        let session = state.session.lock().map_err(|e| e.to_string())?;
        match id {
            Some(ref sid) => session.load_snapshot(&app, sid),
            None => session.load_latest(&app),
        }
    };
    let Some(snap) = snap else {
        return Ok(None);
    };
    apply_snapshot(&state, &app, snap, replace.unwrap_or(false))
}

/// The workspace-memory timeline: every archived checkpoint, newest first.
#[tauri::command]
fn browse_sessions(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<crate::session::SessionSummary>, String> {
    Ok(state.session.lock().map_err(|e| e.to_string())?.list(&app))
}

/// Export a checkpoint to the exports folder as a portable .json file and
/// reveal it in the file manager. Returns the absolute path. Local-first
/// sharing: the JSON is the same shape as the session store.
#[tauri::command]
fn export_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    id: Option<String>,
) -> Result<String, String> {
    let snapshot = {
        let session = state.session.lock().map_err(|e| e.to_string())?;
        match id {
            Some(sid) => session.load_snapshot(&app, &sid),
            None => session.load_latest(&app),
        }
    };
    let Some(snapshot) = snapshot else {
        return Err("no session to export".into());
    };

    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("exports");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(format!("continua-{}.json", snapshot.saved_at));

    let body = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    std::fs::write(&file, body).map_err(|e| e.to_string())?;

    // Best-effort reveal in the system file manager.
    let _ = std::process::Command::new("xdg-open")
        .arg(&dir)
        .spawn();
    let _ = app.emit("session:exported", snapshot.saved_at);
    Ok(file.display().to_string())
}

/// Adopt a portable checkpoint whose JSON was read by the chrome (HTML file
/// input — no native dialog dependency). Saves it as the latest session;
/// restore_session(replace) reopens the workspace. Returns the tab count.
#[tauri::command]
fn import_session_json(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    raw: String,
) -> Result<usize, String> {
    let snapshot: crate::session::SessionSnapshot =
        serde_json::from_str(&raw).map_err(|e| format!("not a valid session file: {e}"))?;
    if snapshot.tabs.is_empty() {
        return Err("session file has no tabs".into());
    }
    let n = snapshot.tabs.len();
    let _ = state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .save(&app, snapshot.tabs, snapshot.active, snapshot.immersive);
    let _ = app.emit("session:imported", ());
    Ok(n)
}

/// Load the most recent session so the chrome can reopen tabs.
#[tauri::command]
fn load_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Option<Vec<TabRecord>>, String> {
    let loaded = state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .load_latest(&app);
    Ok(loaded.map(|s| s.tabs))
}

#[tauri::command]
fn get_device_info(state: tauri::State<'_, AppState>) -> DeviceInfo {
    state.trust.lock().map(|g| g.clone()).unwrap_or_default()
}

/// Collapse or restore the chrome strip (clean/focus mode). With the strip
/// gone, tabs reflow to fill the whole main-window rect and the chrome
/// window hides, giving a chrome-less view without native fullscreen.
fn set_immersive_inner(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let Some(state) = app.try_state::<AppState>() else {
        return Ok(());
    };
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.set_immersive(enabled);
    tabs.relayout(app)?;
    tabs.arm_clean_exit(app, enabled);
    drop(tabs);
    // Single window: the chrome stays mounted; immersive just makes the
    // content view cover the whole window and moves focus to the page.
    if enabled {
        crate::tabview::focus_content(app);
    } else if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn set_immersive(
    app: tauri::AppHandle,
    enabled: Option<bool>,
) -> Result<(), String> {
    let mode = match enabled {
        Some(v) => v,
        None => {
            let current = if let Some(state) = app.try_state::<AppState>() {
                if let Ok(tabs) = state.tabs.lock() {
                    tabs.immersive()
                } else {
                    false
                }
            } else {
                false
            };
            !current
        }
    };
    set_immersive_inner(&app, mode)
}

/// Negotiate the chrome strip height from the frontend's measured layout.
/// The chrome draws its own height in CSS; Rust just needs the same number so
/// tabs reflow below it (especially with the bookmarks row added/removed).
#[tauri::command]
fn set_chrome_height(app: tauri::AppHandle, height: f64) -> Result<(), String> {
    let Some(state) = app.try_state::<AppState>() else {
        return Ok(());
    };
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.set_chrome_height(height);
    tabs.relayout(&app)
}

/// Enable/disable the vertical tab rail's left column inset.
#[tauri::command]
fn set_tab_rail(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let Some(state) = app.try_state::<AppState>() else {
        return Ok(());
    };
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.set_rail(enabled);
    tabs.relayout(&app)
}

/* Whether any Continua window (chrome or a tab) currently has focus.
 * Gates the global shortcuts so they don't fire while another app is active.
 */
fn app_is_focused(app: &tauri::AppHandle) -> bool {
    let focused = |label: &str| {
        app.get_webview_window(label)
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false)
    };
    if focused("main") {
        return true;
    }
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            return tabs.labels().iter().any(|l| focused(l));
        }
    }
    false
}

/// Global shortcut handler: Ctrl+Shift+F toggles clean/focus mode; Escape
/// exits it; Ctrl+K (or Ctrl+Shift+K) toggles the command palette. Kept as a
/// free fn so it can be owned by the builder's fallback.
fn on_global_shortcut(
    app: &tauri::AppHandle,
    shortcut: &tauri_plugin_global_shortcut::Shortcut,
    event: tauri_plugin_global_shortcut::ShortcutEvent,
) {
    use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
    if event.state() != ShortcutState::Pressed || !app_is_focused(app) {
        return;
    }
    let toggle = shortcut.key == Code::KeyF
        && shortcut.mods.contains(Modifiers::CONTROL | Modifiers::SHIFT);
    let palette = shortcut.key == Code::KeyK
        && shortcut.mods.contains(Modifiers::CONTROL | Modifiers::SHIFT);
    let escape = shortcut.key == Code::Escape;
    let mut immersive = false;
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            immersive = tabs.immersive();
        }
    }
    if toggle {
        let _ = set_immersive_inner(app, !immersive);
    } else if palette {
        // The chrome listens for this and opens the command palette.
        let _ = app.emit("palette:toggle", ());
    } else if escape && immersive {
        let _ = set_immersive_inner(app, false);
    }
}

#[tauri::command]
fn vault_store(state: tauri::State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.vault.lock().map_err(|e| e.to_string())?.store(&key, &value)
}

#[tauri::command]
fn vault_get(state: tauri::State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.vault.lock().map_err(|e| e.to_string())?.get(&key)
}

/// Encrypt a tab into the vault: from now on the session file records only an
/// opaque vault_id; URL/title/history/scroll live exclusively in the keyring.
#[tauri::command]
fn mark_vault(app: tauri::AppHandle, label: String) -> Result<crate::tab_engine::TabInfo, String> {
    let state = app.state::<AppState>();
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.mark_vault(&app, &label)
}

/// Release a tab from the vault (removes its keyring manifest).
#[tauri::command]
fn unmark_vault(app: tauri::AppHandle, label: String) -> Result<crate::tab_engine::TabInfo, String> {
    let state = app.state::<AppState>();
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.unmark_vault(&app, &label)
}

#[tauri::command]
fn set_continua_url(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
) -> Result<(), String> {
    let url = normalize_url(&url);
    // Persist so the override survives restarts without a rebuild.
    if let Ok(dir) = app.path().app_config_dir() {
        if let Ok(()) = std::fs::create_dir_all(&dir) {
            let _ = std::fs::write(
                url_file(&dir),
                serde_json::json!({ "url": url }).to_string(),
            );
        }
    }
    let mut guard = state.continua_url.lock().map_err(|e| e.to_string())?;
    *guard = url;
    Ok(())
}

/// Path to the Continua URL override file (default: `app_config_dir/url.json`).
fn url_file(dir: &std::path::Path) -> std::path::PathBuf {
    dir.join("url.json")
}

/// Normalize a backend URL: strip trailing slashes, tolerate a bare host.
fn normalize_url(url: &str) -> String {
    let mut u = url.trim().trim_end_matches('/').to_string();
    if !u.starts_with("http://") && !u.starts_with("https://") {
        u = format!("https://{u}");
    }
    u
}

#[tauri::command]
fn get_continua_url(state: tauri::State<'_, AppState>) -> String {
    state.continua_url.lock().map(|g| g.clone()).unwrap_or_default()
}

// ─── Browser config: search engine, theme, bookmarks, history ─────────────

#[tauri::command]
fn get_browser_config(state: tauri::State<'_, AppState>) -> crate::config::BrowserConfig {
    state.config.lock().map(|c| c.clone()).unwrap_or_default()
}

#[tauri::command]
fn set_search_engine(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    engine: String,
) -> Result<crate::config::BrowserConfig, String> {
    if !["google", "duckduckgo", "bing", "brave"].contains(&engine.as_str()) {
        return Err("unknown search engine".into());
    }
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    cfg.search_engine = engine;
    crate::config::persist(&app, &cfg);
    Ok(cfg.clone())
}

#[tauri::command]
fn set_theme(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    theme: String,
) -> Result<crate::config::BrowserConfig, String> {
    if theme != "dark" && theme != "light" {
        return Err("theme must be 'dark' or 'light'".into());
    }
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    cfg.theme = theme;
    crate::config::persist(&app, &cfg);
    Ok(cfg.clone())
}

#[tauri::command]
fn add_bookmark(app: tauri::AppHandle, url: String, title: Option<String>) -> Result<Vec<crate::config::Bookmark>, String> {
    Ok(crate::config::add_bookmark(&app, &url, title.unwrap_or_default().as_str()))
}

#[tauri::command]
fn remove_bookmark(app: tauri::AppHandle, url: String) -> Result<Vec<crate::config::Bookmark>, String> {
    Ok(crate::config::remove_bookmark(&app, &url))
}

#[tauri::command]
fn get_bookmarks(state: tauri::State<'_, AppState>) -> Vec<crate::config::Bookmark> {
    state
        .config
        .lock()
        .map(|c| c.bookmarks.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn is_bookmarked(app: tauri::AppHandle, url: String) -> bool {
    crate::config::is_bookmarked(&app, &url)
}

#[tauri::command]
fn get_history(state: tauri::State<'_, AppState>) -> Vec<crate::config::HistoryItem> {
    state
        .config
        .lock()
        .map(|c| c.history.iter().cloned().collect())
        .unwrap_or_default()
}

/// Wipe the browsing history ring (config file, not the tab graph).
#[tauri::command]
fn clear_history(app: tauri::AppHandle) {
    crate::config::clear_history(&app);
}

// ─── Settings, search suggestions, workspaces, app windows ────────────────

/// Apply a sparse config patch (homepage, autosave interval, reader style,
/// privacy toggles, speed dial…). Returns the fresh config.
#[tauri::command]
fn update_config(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    patch: crate::config::ConfigPatch,
) -> Result<crate::config::BrowserConfig, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    let updated = crate::config::apply_patch(&mut cfg, &patch)?;
    crate::config::persist(&app, &cfg);
    Ok(updated)
}

/// Live suggestions straight from the active search engine for the omnibox.
/// Fetched server-side so remote pages (which have no IPC) don't need to.
#[tauri::command]
async fn search_suggestions(engine: String, query: String) -> Result<Vec<String>, String> {
    let q = query.trim();
    if q.chars().count() < 2 {
        return Ok(Vec::new());
    }
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;
    let request = match engine.as_str() {
        "duckduckgo" => http
            .get("https://duckduckgo.com/ac/")
            .query(&[("q", q)]),
        "bing" => http
            .get("https://api.bing.com/osjson.aspx")
            .query(&[("query", q)]),
        "brave" => http
            .get("https://search.brave.com/api/suggest")
            .query(&[("q", q)]),
        _ => http
            .get("https://suggestqueries.google.com/complete/search")
            .query(&[("client", "firefox"), ("q", q)]),
    };
    let resp = request.send().await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(extract_suggestions(&text))
}

/// Pull the string suggestions out of the engine responses, which share a
/// `[query, [suggestion, …]]` array shape (with a couple of object variants).
fn extract_suggestions(text: &str) -> Vec<String> {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(text) else {
        return Vec::new();
    };
    let mut out: Vec<String> = Vec::new();
    let push = |out: &mut Vec<String>, s: &str| {
        if out.len() < 8 && !s.trim().is_empty() {
            out.push(s.to_string());
        }
    };
    if let Some(arr) = v.as_array() {
        if let Some(items) = arr.get(1).and_then(|x| x.as_array()) {
            for it in items {
                if let Some(s) = it.as_str() {
                    push(&mut out, s);
                } else if let Some(s) = it.get("phrase").and_then(|x| x.as_str()) {
                    push(&mut out, s);
                }
            }
        }
    } else if let Some(results) = v.get("results").and_then(|x| x.as_array()) {
        for it in results {
            if let Some(s) = it.as_str() {
                push(&mut out, s);
            } else if let Some(s) = it.get("phrase").and_then(|x| x.as_str()) {
                push(&mut out, s);
            } else if let Some(s) = it.get("q").and_then(|x| x.as_str()) {
                push(&mut out, s);
            }
        }
    }
    out
}

#[tauri::command]
fn set_link_preview(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut cfg) = state.config.lock() {
            cfg.link_preview = enabled;
            crate::config::persist(&app, &cfg);
        }
    }
    crate::inpage::link_preview(&app, enabled)
}

// ─── Named workspaces ──────────────────────────────────────────────────────

/// Snapshot the live tab graph under a named workspace and remember it as the
/// active workspace. Returns the full workspace list for the chrome menu.
#[tauri::command]
fn save_workspace(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    name: String,
) -> Result<Vec<crate::session::SessionSummary>, String> {
    let (snap, active, immersive) = {
        let tabs = state.tabs.lock().map_err(|e| e.to_string())?;
        (tabs.snapshot(&app), tabs.active_label(), tabs.immersive())
    };
    let session = state.session.lock().map_err(|e| e.to_string())?;
    session.save_workspace(&app, &name, snap, active, immersive)?;
    drop(session);
    if let Ok(mut cfg) = state.config.lock() {
        if cfg.active_workspace != name {
            cfg.active_workspace = name;
            crate::config::persist(&app, &cfg);
        }
    }
    Ok(state.session.lock().map_err(|e| e.to_string())?.list_workspaces(&app))
}

/// Switch to a named workspace: replaces the live tab graph with its snapshot
/// and re-activates it.
#[tauri::command]
fn open_workspace(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    name: String,
) -> Result<Option<Vec<tab_engine::TabInfo>>, String> {
    let snap = state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .load_workspace(&app, &name);
    let Some(snap) = snap else {
        return Ok(None);
    };
    if let Ok(mut cfg) = state.config.lock() {
        if cfg.active_workspace != name {
            cfg.active_workspace = name;
            crate::config::persist(&app, &cfg);
        }
    }
    apply_snapshot(&state, &app, snap, true)
}

#[tauri::command]
fn list_workspaces(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<crate::session::SessionSummary>, String> {
    Ok(state.session.lock().map_err(|e| e.to_string())?.list_workspaces(&app))
}

#[tauri::command]
fn delete_workspace(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    name: String,
) -> Result<Vec<crate::session::SessionSummary>, String> {
    let session = state.session.lock().map_err(|e| e.to_string())?;
    session.delete_workspace(&app, &name)?;
    if let Ok(mut cfg) = state.config.lock() {
        if cfg.active_workspace == name {
            cfg.active_workspace = crate::config::default_workspace();
            crate::config::persist(&app, &cfg);
        }
    }
    Ok(session.list_workspaces(&app))
}

// ─── Open a site in its own native window ("floating app") ─────────────────

static APP_WIN_SEQ: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

/// Open `url` in a fresh decorated OS window, independent of the tab strip —
/// a lightweight "install this site as an app" without any chrome.
#[tauri::command]
fn open_app_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let parsed: url::Url = url.parse().map_err(|_| format!("invalid URL: {url}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("only http(s) URLs can open in their own window".into());
    }
    let seq = APP_WIN_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let label = format!("appwin-{seq}");
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        label,
        tauri::WebviewUrl::External(parsed),
    )
    .title("Continua")
    .decorations(true)
    .inner_size(1120.0, 780.0)
    .initialization_script(crate::tab_engine::SCROLLBAR_STYLE_SCRIPT)
    .build()
    .map_err(|e| e.to_string())?;
    // Cascade artfully off the main window rather than stacking on its origin.
    if let Some(main) = app.get_webview_window("main") {
        if let Ok(pos) = main.outer_position() {
            let _ = window
                .set_position(tauri::PhysicalPosition::new(pos.x + 36, pos.y + 36));
        }
    }
    let _ = window.set_focus();
    Ok(())
}

// ─── In-page tools: find, zoom, reader, dark flip ─────────────────────────

#[derive(serde::Serialize)]
struct FindResult {
    count: usize,
    idx: i32,
}

#[tauri::command]
fn find_in_tab(app: tauri::AppHandle, label: String, query: String) -> Result<FindResult, String> {
    let (count, idx) = crate::inpage::find(&app, &label, &query, 0)?;
    Ok(FindResult { count, idx })
}

#[tauri::command]
fn find_next(app: tauri::AppHandle, label: String, query: String) -> Result<FindResult, String> {
    let (count, idx) = crate::inpage::find(&app, &label, &query, 1)?;
    Ok(FindResult { count, idx })
}

#[tauri::command]
fn find_prev(app: tauri::AppHandle, label: String, query: String) -> Result<FindResult, String> {
    let (count, idx) = crate::inpage::find(&app, &label, &query, -1)?;
    Ok(FindResult { count, idx })
}

#[tauri::command]
fn zoom_tab(app: tauri::AppHandle, label: String, step: f64) -> Result<f64, String> {
    crate::inpage::zoom(&app, &label, step)
}

#[tauri::command]
fn reader_toggle(app: tauri::AppHandle, label: String) -> Result<(), String> {
    crate::inpage::reader(&app, &label)
}

#[tauri::command]
fn dark_toggle(app: tauri::AppHandle, label: String) -> Result<(), String> {
    crate::inpage::dark(&app, &label)
}

#[tauri::command]
fn set_tab_pinned(
    state: tauri::State<'_, AppState>,
    label: String,
    pinned: bool,
) -> Result<(), String> {
    state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .set_pinned(&label, pinned)
}

/// Poll a PIN pairing session. Returns `waiting`, `approved`, or `expired`.
/// On `approved` the minted capability token is stored for all later syncs.
#[tauri::command]
async fn pair_device(state: tauri::State<'_, AppState>, pin: String) -> Result<String, String> {
    let continua_url = state.continua_url.lock().map_err(|e| e.to_string())?.clone();
    let sync = state.sync.lock().map_err(|e| e.to_string())?.clone();
    let resp = sync.poll_pairing(&continua_url, &pin).await?;
    let status = resp
        .get("status")
        .and_then(|s| s.as_str())
        .unwrap_or("expired")
        .to_string();

    if status == "approved" {
        let token = resp
            .get("data")
            .and_then(|d| d.get("capabilityToken"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| "approved but no token received".to_string())?
            .to_string();
        let mut sync = state.sync.lock().map_err(|e| e.to_string())?;
        sync.capability_token = Some(token);
        sync.last_version = 0;
        return Ok("approved".into());
    }
    Ok(status)
}

/// Push the current local session snapshot to the cloud (the `browser`
/// context domain). Vault tabs are already redacted by the tab engine.
#[tauri::command]
async fn sync_session(state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let continua_url = state.continua_url.lock().map_err(|e| e.to_string())?.clone();
    let device_id = state
        .device_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "device not initialized".to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?.clone();
    let token = sync
        .capability_token
        .clone()
        .ok_or_else(|| "not paired - use the Pair action in the palette".to_string())?;
    let version = sync.last_version + 1;

    let snapshot_json = {
        let tabs_guard = state.tabs.lock().map_err(|e| e.to_string())?;
        let snapshot = crate::session::SessionSnapshot {
            id: "cloud".into(),
            saved_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            tabs: tabs_guard.snapshot(&app),
            active: tabs_guard.active_label(),
            immersive: tabs_guard.immersive(),
        };
        serde_json::to_value(&snapshot).map_err(|e| e.to_string())?
    };

    let result = sync
        .push_session(&continua_url, &device_id, &token, version, &snapshot_json)
        .await?;

    // Record the server version so the next pull knows how far we are.
    if let Some(v) = result
        .get("data")
        .and_then(|d| d.get("version"))
        .and_then(|v| v.as_u64())
    {
        state.sync.lock().map_err(|e| e.to_string())?.last_version = v;
    }
    Ok(result)
}

/// Pull a newer remote session and restore it (closing local tabs first).
#[tauri::command]
async fn pull_session(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<Vec<crate::tab_engine::TabInfo>, String> {
    let continua_url = state.continua_url.lock().map_err(|e| e.to_string())?.clone();
    let sync = state.sync.lock().map_err(|e| e.to_string())?.clone();
    let token = sync
        .capability_token
        .clone()
        .ok_or_else(|| "not paired - use the Pair action in the palette".to_string())?;
    let since = sync.last_version;

    let body = sync
        .pull_session(&continua_url, &token, since)
        .await?;

    let domains = body
        .get("domains")
        .and_then(|d| d.as_array())
        .ok_or_else(|| "unexpected pull response".to_string())?;
    let browser = domains
        .iter()
        .find(|r| r.get("domain").and_then(|d| d.as_str()) == Some("browser"))
        .ok_or_else(|| "no remote session yet".to_string())?;

    let snapshot: crate::session::SessionSnapshot =
        serde_json::from_value(browser["data"].clone()).map_err(|e| e.to_string())?;
    let version = browser["version"].as_u64().unwrap_or(since);

    let restored = {
        let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
        tabs.close_all(&app)?;
        let _ = tabs.restore_from_snapshot(&app, snapshot.tabs)?;
        let infos = tabs.infos();
        drop(tabs);
        let _ = set_immersive_inner(&app, snapshot.immersive);
        infos
    };

    state.sync.lock().map_err(|e| e.to_string())?.last_version = version;
    Ok(restored)
}

/// Sync state for the chrome: paired? device id? last version?
#[tauri::command]
fn sync_status(state: tauri::State<'_, AppState>) -> serde_json::Value {
    let sync = state.sync.lock().map(|g| g.clone()).unwrap_or_default();
    let device_id = state.device_id.lock().map(|g| g.clone()).unwrap_or_default();
    serde_json::json!({
        "paired": sync.capability_token.is_some(),
        "deviceId": device_id.unwrap_or_default(),
        "serverDeviceId": sync.server_device_id.unwrap_or_default(),
        "trustLevel": sync.trust_level.unwrap_or_else(|| "unknown".into()),
        "lastVersion": sync.last_version,
    })
}

/// Register this machine under its keyring fingerprint (moat device-auth).
/// Idempotent: the server upserts by fingerprint and returns trust level.
#[tauri::command]
async fn register_device(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let continua_url = state.continua_url.lock().map_err(|e| e.to_string())?.clone();
    let device_key = state
        .device_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "device not initialized".to_string())?;
    let info = state.trust.lock().map_err(|e| e.to_string())?.clone();
    let sync = state.sync.lock().map_err(|e| e.to_string())?.clone();
    let token = sync
        .capability_token
        .clone()
        .ok_or_else(|| "not paired - use the Pair action in the palette".to_string())?;

    let result = sync
        .register_device(&continua_url, &token, &device_key, &info)
        .await?;

    // Mirror the server's device UUID + trust level for status / future gates.
    let server_id = result
        .get("deviceId")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let trust = result
        .get("trustLevel")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    if let Ok(mut sync) = state.sync.lock() {
        sync.server_device_id = server_id.or(sync.server_device_id.clone());
        sync.trust_level = trust.or(sync.trust_level.clone());
    }
    Ok(result)
}

/// Background worker for the moat: while paired, re-register (heartbeat) so
/// the server keeps `last_seen_at` and trust fresh.
fn spawn_heartbeat(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        // Heartbeat every 5 minutes (60 x 5s ticks).
        let mut tick: u64 = 0;
        loop {
            std::thread::sleep(Duration::from_secs(5));
            tick += 1;
            if tick % 60 != 0 {
                continue;
            }
            let Some(state) = app.try_state::<AppState>() else {
                continue;
            };
            // Only interesting once a visitor is actually paired.
            let paired = state
                .sync
                .lock()
                .map(|s| s.capability_token.is_some())
                .unwrap_or(false);
            if !paired {
                continue;
            }
            let _ = tauri::async_runtime::block_on(async {
                let app_handle = app.clone();
                let result = tauri::async_runtime::spawn(async move {
                    let state = app_handle.state::<AppState>();
                    register_device(state).await
                })
                .await;
                result.unwrap_or_else(|e| Err(e.to_string()))
            });
        }
    });
}

// ─── App entry ──────────────────────────────────────────────────────────────

/// Background worker: periodically captures scroll positions and snapshots
/// the session to disk, so a crash/quit never loses the tab graph — and a
/// relaunch can resurrect scroll + history exactly. Titles are event-driven.
fn spawn_background(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut last_save = String::new();
        let mut last_autosave = std::time::Instant::now();

        loop {
            std::thread::sleep(Duration::from_secs(5));

            let Some(state) = app.try_state::<AppState>() else {
                continue;
            };
            let Ok(mut tabs) = state.tabs.lock() else {
                continue;
            };

            // Capture the active tab's scroll position via polled eval so the
            // session file can restore it without any page cooperation. Only
            // the one tab currently loaded in the content view has a live page.
            if let Some(label) = tabs.active_label() {
                let v = crate::tabview::eval_sync(&app, crate::tabview::SCROLL_READ_JS);
                if let Ok(scroll) = v.trim().parse::<f64>() {
                    tabs.record_scroll(&label, scroll);
                }
            }

            // Periodic autosave, deduped by content so only real changes hit
            // disk, honoring the user-configurable interval from Settings.
            let interval = state
                .config
                .lock()
                .map(|c| c.autosave_interval)
                .unwrap_or_else(|_| crate::config::default_autosave_interval());
            if tabs.dirty() && last_autosave.elapsed().as_secs() as u64 >= interval {
                let snap = tabs.snapshot(&app);
                if !snap.is_empty() {
                    let key = serde_json::to_string(&snap).unwrap_or_default();
                    if key != last_save {
                        last_save = key;
                        let active = tabs.active_label();
                        let immersive = tabs.immersive();
                        if let Ok(session) = state.session.lock() {
                            let _ = session.save(&app, snap, active, immersive);
                        }
                    }
                }
                tabs.mark_clean();
                last_autosave = std::time::Instant::now();
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(AppState {
            tabs: Mutex::new(TabManager::new()),
            session: Mutex::new(SessionManager::new()),
            vault: Mutex::new(VaultEngine::new()),
            trust: Mutex::new(DeviceInfo::detect()),
            sync: Mutex::new(SyncClient::new()),
            continua_url: Mutex::new(DEFAULT_CONTINUA_URL.to_string()),
            config: Mutex::new(BrowserConfig::default()),
            device_id: Mutex::new(None),
        })
        // Second launch must focus the running window, not panic on a
        // duplicate Ctrl+Shift+F registration. Registered before the
        // shortcut plugin so the newcomer exits cleanly.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin({
            // Global shortcuts so clean/focus mode survives focus living on
            // a tab (remote pages — we never expose IPC to them).
            let base =
                tauri_plugin_global_shortcut::Builder::new().with_handler(on_global_shortcut);
            match base.with_shortcuts(["ctrl+shift+f", "ctrl+k", "ctrl+shift+k", "escape"]) {
                Ok(b) => b.build(),
                Err(e) => {
                    eprintln!("continua: global shortcuts unavailable: {e}");
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(on_global_shortcut)
                        .build()
                }
            }
        })
        .setup(|app| {
            // Derive the stable device id from the keyring anchor.
            let fp = crate::trust::Fingerprint::load_or_create(app.handle());
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut device_id) = state.device_id.lock() {
                    *device_id = Some(fp.key);
                }
                if let Ok(mut trust) = state.trust.lock() {
                    trust.refresh_display(app.handle());
                }
                // Continua backend: persisted override wins over the baked-in
                // default, so the real domain can be pointed at without any
                // rebuild (drop `url.json` in the config dir or use the
                // palette action).
                let mut url = DEFAULT_CONTINUA_URL.to_string();
                if let Ok(dir) = app.path().app_config_dir() {
                    if let Ok(raw) = std::fs::read_to_string(url_file(&dir)) {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                            if let Some(u) = v.get("url").and_then(|u| u.as_str()) {
                                url = normalize_url(u);
                            }
                        }
                    }
                }
                if let Ok(mut guard) = state.continua_url.lock() {
                    *guard = url;
                }
                // Browser config (search engine, theme, bookmarks, history).
                if let Ok(mut cfg) = state.config.lock() {
                    *cfg = crate::config::load(app.handle());
                }
            }
            spawn_background(app.handle().clone());
            spawn_heartbeat(app.handle().clone());
            // Reparent the chrome webview into the single-window overlay and
            // capture the GTK main context for worker→main marshalling.
            crate::tabview::install(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Tab webviews track the chrome on any move/resize.
            if window.label() == "main"
                && matches!(event, tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_))
            {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    if let Ok(tabs) = state.tabs.lock() {
                        let _ = tabs.relayout(window.app_handle());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_tab,
            open_incognito_tab,
            close_tab,
            activate_tab,
            reload_tab,
            back_tab,
            forward_tab,
            navigate_tab,
            nav_state,
            set_immersive,
            set_chrome_height,
            set_tab_rail,
            list_tabs,
            close_all_tabs,
            update_tab_layout,
            save_session,
            load_session,
            restore_session,
            reopen_last_closed,
            browse_sessions,
            export_session,
            import_session_json,
            get_device_info,
            vault_store,
            vault_get,
            mark_vault,
            unmark_vault,
            set_continua_url,
            get_continua_url,
            get_browser_config,
            set_search_engine,
            set_theme,
            add_bookmark,
            remove_bookmark,
            get_bookmarks,
            is_bookmarked,
            get_history,
            clear_history,
            update_config,
            search_suggestions,
            set_link_preview,
            save_workspace,
            open_workspace,
            list_workspaces,
            delete_workspace,
            open_app_window,
            find_in_tab,
            find_next,
            find_prev,
            zoom_tab,
            reader_toggle,
            dark_toggle,
            set_tab_pinned,
            pair_device,
            sync_session,
            pull_session,
            sync_status,
            register_device,
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building Continua");

    app.run(|app_handle, event| {
        // Persist the final tab graph before the app tears down.
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Some(state) = app_handle.try_state::<AppState>() {
                if let Ok(tabs) = state.tabs.lock() {
                    let snap = tabs.snapshot(&app_handle);
                    if !snap.is_empty() {
                        let active = tabs.active_label();
                        let immersive = tabs.immersive();
                        if let Ok(session) = state.session.lock() {
                            let _ = session.save(app_handle, snap, active, immersive);
                        }
                    }
                }
            }
        }
    });
}