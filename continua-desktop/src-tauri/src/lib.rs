//! Continua Desktop — library crate.
//!
//! Wires the Rust core (tabs, sessions, vault, capture, trust, sync)
//! to the Tauri runtime and exposes commands for the React chrome UI.

mod capture;
mod session;
mod sync;
mod tab_engine;
mod trust;
mod vault;

use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;

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
    pub trust: DeviceInfo,
    pub sync: SyncClient,
    pub continua_url: Mutex<String>,
}

// ─── Commands ───────────────────────────────────────────────────────────────

#[tauri::command]
fn open_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, url: String) -> Result<String, String> {
    state
        .tabs
        .lock()
        .map_err(|e| e.to_string())?
        .open(&app, url)
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
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("no such tab: {label}"))?;
    window
        .eval("location.reload()")
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn back_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.back(&app, &label)
}

#[tauri::command]
fn forward_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.forward(&app, &label)
}

/// Navigate the active tab to a URL entered in the address bar (in place).
#[tauri::command]
fn navigate_tab(state: tauri::State<'_, AppState>, app: tauri::AppHandle, label: String, url: String) -> Result<(), String> {
    state.tabs.lock().map_err(|e| e.to_string())?.navigate(&app, &label, url)
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

/// Persist the current tab graph.
#[tauri::command]
fn save_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    tabs: Vec<TabRecord>,
) -> Result<String, String> {
    state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .save(&app, tabs)
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
    state.trust.clone()
}

#[tauri::command]
fn vault_store(state: tauri::State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.vault.lock().map_err(|e| e.to_string())?.store(&key, &value)
}

#[tauri::command]
fn vault_get(state: tauri::State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.vault.lock().map_err(|e| e.to_string())?.get(&key)
}

#[tauri::command]
async fn sync_context(state: tauri::State<'_, AppState>, url: String, title: String) -> Result<(), String> {
    let continua_url = state.continua_url.lock().map_err(|e| e.to_string())?.clone();
    state.sync.push_context(&continua_url, &url, &title).await
}

#[tauri::command]
fn set_continua_url(state: tauri::State<'_, AppState>, url: String) -> Result<(), String> {
    let mut guard = state.continua_url.lock().map_err(|e| e.to_string())?;
    *guard = url;
    Ok(())
}

#[tauri::command]
fn get_continua_url(state: tauri::State<'_, AppState>) -> String {
    state.continua_url.lock().map(|g| g.clone()).unwrap_or_default()
}

// ─── App entry ──────────────────────────────────────────────────────────────

/// Background worker: periodically snapshots the session to disk so a
/// crash/quit never loses the tab graph. Tab titles are event-driven now.
fn spawn_background(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut last_save = String::new();

        loop {
            std::thread::sleep(Duration::from_secs(5));

            let Some(state) = app.try_state::<AppState>() else {
                continue;
            };
            let Ok(mut tabs) = state.tabs.lock() else {
                continue;
            };

            // Periodic autosave, deduped by content so only real changes hit disk.
            if tabs.dirty() {
                let snap = tabs.snapshot();
                if !snap.is_empty() {
                    let key = serde_json::to_string(&snap).unwrap_or_default();
                    if key != last_save {
                        last_save = key;
                        if let Ok(session) = state.session.lock() {
                            let _ = session.save(&app, snap);
                        }
                    }
                }
                tabs.mark_clean();
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
            trust: DeviceInfo::detect(),
            sync: SyncClient::new(),
            continua_url: Mutex::new(DEFAULT_CONTINUA_URL.to_string()),
        })
        .setup(|app| {
            spawn_background(app.handle().clone());
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
            close_tab,
            activate_tab,
            reload_tab,
            back_tab,
            forward_tab,
            navigate_tab,
            nav_state,
            list_tabs,
            close_all_tabs,
            update_tab_layout,
            save_session,
            load_session,
            get_device_info,
            vault_store,
            vault_get,
            sync_context,
            set_continua_url,
            get_continua_url,
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building Continua");

    app.run(|app_handle, event| {
        // Persist the final tab graph before the app tears down.
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Some(state) = app_handle.try_state::<AppState>() {
                if let Ok(tabs) = state.tabs.lock() {
                    let snap = tabs.snapshot();
                    if !snap.is_empty() {
                        if let Ok(session) = state.session.lock() {
                            let _ = session.save(app_handle, snap);
                        }
                    }
                }
            }
        }
    });
}