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

/// Persist the current tab graph (as mirrored by the chrome).
#[tauri::command]
fn save_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    tabs: Vec<TabRecord>,
    active: Option<String>,
) -> Result<String, String> {
    let immersive = state.tabs.lock().map(|t| t.immersive()).unwrap_or(false);
    state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .save(&app, tabs, active, immersive)
}

/// Reopen a workspace checkpoint (the most recent session by default, or a
/// chosen id from the memory timeline) with its full state — per-tab history,
/// scroll positions, active tab and clean/focus mode all come back.
#[tauri::command]
fn restore_session(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    id: Option<String>,
) -> Result<Option<Vec<tab_engine::TabInfo>>, String> {
    let session = state.session.lock().map_err(|e| e.to_string())?;
    let snap = match id {
        Some(ref sid) => session.load_snapshot(&app, sid),
        None => session.load_latest(&app),
    };
    drop(session);
    let Some(snap) = snap else {
        return Ok(None);
    };

    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    if !tabs.labels().is_empty() {
        return Ok(None);
    }
    tabs.set_chrome_height(if snap.immersive { 0.0 } else { CHROME_HEIGHT });
    let last = tabs.restore_from_snapshot(&app, snap.tabs)?;
    tabs.relayout(&app)?;
    let active = last.or(snap.active);
    drop(tabs);

    if let Some(label) = &active {
        if let Ok(mut tabs) = state.tabs.lock() {
            let _ = tabs.activate(&app, label);
        }
    } else if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }

    if snap.immersive {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.hide();
        }
    }

    let tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    Ok(Some(tabs.infos()))
}

/// The workspace-memory timeline: every archived checkpoint, newest first.
#[tauri::command]
fn browse_sessions(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<crate::session::SessionSummary>, String> {
    Ok(state.session.lock().map_err(|e| e.to_string())?.list(&app))
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

/// Collapse or restore the chrome strip (clean/focus mode). With the strip
/// gone, tabs reflow to fill the whole main-window rect and the chrome
/// window hides, giving a chrome-less view without native fullscreen.
fn set_immersive_inner(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let Some(state) = app.try_state::<AppState>() else {
        return Ok(());
    };
    let mut tabs = state.tabs.lock().map_err(|e| e.to_string())?;
    tabs.set_chrome_height(if enabled { 0.0 } else { CHROME_HEIGHT });
    tabs.relayout(app)?;
    drop(tabs);
    if let Some(main) = app.get_webview_window("main") {
        if enabled {
            main.hide().map_err(|e| e.to_string())?;
        } else {
            main.show().map_err(|e| e.to_string())?;
            main.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn set_immersive(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    set_immersive_inner(&app, enabled)
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
/// exits it. Kept as a free fn so it can be owned by the builder's fallback.
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
    let escape = shortcut.key == Code::Escape;
    let mut immersive = false;
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            immersive = tabs.immersive();
        }
    }
    if toggle {
        let _ = set_immersive_inner(app, !immersive);
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

/// Background worker: periodically captures scroll positions and snapshots
/// the session to disk, so a crash/quit never loses the tab graph — and a
/// relaunch can resurrect scroll + history exactly. Titles are event-driven.
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

            // Capture each tab's scroll position via polled eval so the
            // session file can restore it without any page cooperation.
            for label in tabs.labels() {
                let Some(webview) = app.get_webview_window(&label) else {
                    continue;
                };
                let app_c = app.clone();
                let label_c = label.clone();
                let _ = webview.eval_with_callback(
                    "(document.scrollingElement?document.scrollingElement.scrollTop:0)||window.pageYOffset||0",
                    move |res| {
                        if let Ok(v) = res.trim().parse::<f64>() {
                            if let Some(state) = app_c.try_state::<AppState>() {
                                if let Ok(mut tab_state) = state.tabs.lock() {
                                    tab_state.record_scroll(&label_c, v);
                                }
                            }
                        }
                    },
                );
            }

            // Periodic autosave, deduped by content so only real changes hit disk.
            if tabs.dirty() {
                let snap = tabs.snapshot();
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
        .plugin({
            // Global shortcuts so clean/focus mode survives focus living on
            // a tab (remote pages — we never expose IPC to them).
            let base =
                tauri_plugin_global_shortcut::Builder::new().with_handler(on_global_shortcut);
            match base.with_shortcuts(["ctrl+shift+f", "escape"]) {
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
            set_immersive,
            list_tabs,
            close_all_tabs,
            update_tab_layout,
            save_session,
            load_session,
            restore_session,
            browse_sessions,
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