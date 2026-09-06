//! Tab engine — each tab is a native `WebviewWindow` positioned below
//! the React chrome strip.
//!
//! Swap-in point for single-window multi-webview (wry) later: keep the
//! `TabManager` public surface identical and change only the internals.

use std::collections::VecDeque;

use serde::Serialize;
use tauri::{
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
    webview::{NewWindowResponse, PageLoadEvent},
};

use crate::session::TabRecord;

/// Per-tab metadata mirrored to the chrome and used for session snapshots.
#[derive(Clone)]
struct TabMeta {
    label: String,
    url: String,
    title: String,
    /// Page URLs in visit order (from page-load events); drives back/forward.
    history: Vec<String>,
    /// Current position in `history`.
    idx: usize,
    /// Saved scroll offset of the page in `scroll_url`, for resurrection.
    scroll_y: f64,
    /// The URL `scroll_y` was captured on; scroll is only reapplied to it.
    scroll_url: Option<String>,
    /// True right after a restore; settling loads must not clobber seeded
    /// history until the session's own pages actually diverge.
    restoring: bool,
}

/// Back/forward availability for the chrome's nav buttons.
#[derive(Clone, Copy, Serialize)]
pub struct NavState {
    pub back: bool,
    pub forward: bool,
}

/// A tab as mirrored to the chrome (and used for restore replies).
#[derive(Clone, Serialize)]
pub struct TabInfo {
    pub label: String,
    pub url: String,
    pub title: String,
}

pub struct TabManager {
    open: VecDeque<TabMeta>,
    /// Set on any mutation that should be persisted to disk.
    dirty: bool,
    next_id: u32,
    /// Height of the chrome strip in logical px. 0 = immersive/focus mode.
    chrome_height: f64,
    /// Last focused tab; restored as the active tab on the next launch.
    last_active: Option<String>,
}

impl TabManager {
    pub fn new() -> Self {
        Self {
            open: VecDeque::new(),
            dirty: false,
            next_id: 0,
            chrome_height: crate::CHROME_HEIGHT,
            last_active: None,
        }
    }

    /// Create a tab window loading `url`, focus it, return its label.
    pub fn open(&mut self, app: &AppHandle, url: String) -> Result<String, String> {
        let label = format!("tab-{}", self.next_id);
        self.next_id += 1;

        // Position the new tab under the chrome strip.
        let (x, y, w, h) = self.layout_rect(app)?;

        let parsed: url::Url = url
            .parse()
            .map_err(|_| format!("invalid URL: {url}"))?;

        let app_new = app.clone();
        let app_load = app.clone();
        let label_load = label.clone();
        let app_title = app.clone();
        let label_title = label.clone();

        WebviewWindowBuilder::new(app, label.clone(), WebviewUrl::External(parsed))
            .title("Continua")
            .decorations(false)
            .position(x, y)
            .inner_size(w, h)
            // window.open / target=_blank → open a managed tab in place.
            .on_new_window(move |url_to_open, _features| {
                if matches!(url_to_open.scheme(), "http" | "https") {
                    if let Some(state) = app_new.try_state::<crate::AppState>() {
                        if let Ok(mut tabs) = state.tabs.lock() {
                            let _ = tabs.open(&app_new, url_to_open.to_string());
                        }
                    }
                }
                NewWindowResponse::Deny
            })
            // Navigations fire page-load events; update the tab's URL + history.
            .on_page_load(move |_window, payload| {
                if payload.event() == PageLoadEvent::Finished {
                    if let Some(state) = app_load.try_state::<crate::AppState>() {
                        if let Ok(mut tabs) = state.tabs.lock() {
                            let url = payload.url().as_str().to_string();
                            tabs.record_navigation(&app_load, &label_load, &url);
                        }
                    }
                }
            })
            // Document title changes arrive live (no polling needed).
            .on_document_title_changed(move |_, title| {
                if let Some(state) = app_title.try_state::<crate::AppState>() {
                    if let Ok(mut tabs) = state.tabs.lock() {
                        tabs.record_title(&app_title, &label_title, &title);
                    }
                }
            })
            .build()
            .map_err(|e| e.to_string())?;

        self.open.push_back(TabMeta {
            label: label.clone(),
            url: url.clone(),
            title: url.clone(),
            history: vec![url],
            idx: 0,
            scroll_y: 0.0,
            scroll_url: None,
            restoring: false,
        });
        self.last_active = Some(label.clone());
        self.dirty = true;

        Ok(label)
    }

    pub fn close(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(label) {
            window.close().map_err(|e| e.to_string())?;
        }
        let before = self.open.len();
        self.open.retain(|m| m.label != label);
        if self.open.len() != before {
            self.dirty = true;
        }
        Ok(())
    }

    pub fn activate(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(window) = app.get_webview_window(label) else {
            return Err(format!("no such tab: {label}"));
        };
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;

        // Refresh the title in the chrome on every activation.
        if let Ok(title) = window.title() {
            if !title.trim().is_empty() {
                self.record_title(app, label, title.trim());
            }
        }

        // Bring the tab to the front of the z-order.
        if let Some(pos) = self.open.iter().position(|m| m.label == label) {
            let meta = self.open.remove(pos).unwrap();
            self.open.push_back(meta);
            self.dirty = true;
        }
        self.last_active = Some(label.to_string());
        Ok(())
    }

    /// Update a tab's title if it changed; push the change to the chrome.
    pub fn record_title(&mut self, app: &AppHandle, label: &str, title: &str) {
        let title = title.trim();
        // Skip the placeholder window title and empty documents.
        if title.is_empty() || title == "Continua" {
            return;
        }
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return;
        };
        if meta.title == title {
            return;
        }
        meta.title = title.to_string();
        self.dirty = true;
        emit_title(app, label, title);
    }

    /// Record a finished main-frame navigation. Builds a per-tab history stack
    /// that drives back/forward, and pushes the new URL to the chrome.
    pub fn record_navigation(&mut self, app: &AppHandle, label: &str, url: &str) {
        // Returns whether the page settled onto the tab's current (saved) URL.
        if self.record_navigation_inner(app, label, url) {
            self.apply_scroll(app, label);
        }
    }

    fn record_navigation_inner(&mut self, app: &AppHandle, label: &str, url: &str) -> bool {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return false;
        };

        // Freshly restored tab: history was seeded from the session; the
        // settle load must not clobber it unless the page actually diverges.
        if meta.restoring {
            let at_seed = meta.history.get(meta.idx).map(String::as_str) == Some(url);
            if at_seed {
                meta.url = url.to_string();
                meta.restoring = false;
                self.dirty = true;
                return true;
            }
            if let Some(pos) = meta.history.iter().position(|u| u == url) {
                // Redirect back into the seeded path — settle to that entry.
                meta.history.truncate(pos + 1);
                meta.idx = pos;
                meta.url = url.to_string();
                meta.restoring = false;
                self.dirty = true;
                emit_navigation(app, label, url);
                return true;
            }
            // A genuinely new page after restore — resume normal recording.
            meta.restoring = false;
        }

        // Same-page reload / page finish with no real navigation.
        if meta.history.last().map(String::as_str) == Some(url) && meta.idx + 1 == meta.history.len()
        {
            meta.url = url.to_string();
            emit_navigation(app, label, url);
            return true;
        }

        // Revisiting an earlier entry (back/forward landing) — drop forward rows.
        if let Some(pos) = meta.history.iter().position(|u| u == url) {
            meta.history.truncate(pos + 1);
            meta.idx = pos;
        } else {
            // New page — cut any forward entries, then append.
            meta.history.truncate(meta.idx + 1);
            meta.history.push(url.to_string());
            meta.idx = meta.history.len() - 1;
        }
        meta.url = url.to_string();
        self.dirty = true;
        emit_navigation(app, label, url);
        false
    }

    /// Reapply the saved scroll offset once the page it was captured on loads.
    fn apply_scroll(&self, app: &AppHandle, label: &str) {
        let Some(roll) = self.open.iter().find(|m| m.label == label) else {
            return;
        };
        if roll.scroll_y <= 0.0 || roll.scroll_url.as_deref() != Some(roll.url.as_str()) {
            return;
        }
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.eval(format!("window.scrollTo(0, {})", roll.scroll_y));
        }
    }

    /// Update the saved scroll offset for a tab (captured via polled eval).
    pub fn record_scroll(&mut self, label: &str, scroll: f64) {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return;
        };
        if (meta.scroll_y - scroll).abs() < 2.0 {
            return;
        }
        meta.scroll_y = scroll;
        meta.scroll_url = Some(meta.url.clone());
        self.dirty = true;
    }

    /// Navigate the tab one step back through its history.
    pub fn back(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        if meta.idx == 0 {
            return Ok(());
        }
        meta.idx -= 1;
        meta.restoring = false;
        let target = meta.history[meta.idx].clone();
        let window = app
            .get_webview_window(label)
            .ok_or_else(|| format!("no such tab: {label}"))?;
        window
            .navigate(target.parse().map_err(|e: url::ParseError| e.to_string())?)
            .map_err(|e| e.to_string())
    }

    /// Navigate the tab one step forward through its history.
    pub fn forward(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        if meta.idx + 1 >= meta.history.len() {
            return Ok(());
        }
        meta.idx += 1;
        meta.restoring = false;
        let target = meta.history[meta.idx].clone();
        let window = app
            .get_webview_window(label)
            .ok_or_else(|| format!("no such tab: {label}"))?;
        window
            .navigate(target.parse().map_err(|e: url::ParseError| e.to_string())?)
            .map_err(|e| e.to_string())
    }

    /// Navigate the tab (address bar) to a fresh URL.
    pub fn navigate(&mut self, app: &AppHandle, label: &str, url: String) -> Result<(), String> {
        if !self.open.iter().any(|m| m.label == label) {
            return Err(format!("no such tab: {label}"));
        }
        if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
            meta.restoring = false;
        }
        let parsed: url::Url = url
            .parse()
            .map_err(|_| format!("invalid URL: {url}"))?;
        let window = app
            .get_webview_window(label)
            .ok_or_else(|| format!("no such tab: {label}"))?;
        window.navigate(parsed).map_err(|e| e.to_string())
    }

    /// Whether the tab can go back / forward (for chrome button states).
    pub fn nav_state(&self, label: &str) -> Result<NavState, String> {
        let Some(meta) = self.open.iter().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        Ok(NavState {
            back: meta.idx > 0,
            forward: meta.idx + 1 < meta.history.len(),
        })
    }

    pub fn close_all(&mut self, app: &AppHandle) -> Result<(), String> {
        let labels: Vec<String> = self.open.iter().map(|m| m.label.clone()).collect();
        for label in &labels {
            self.close(app, label)?;
        }
        Ok(())
    }

    pub fn labels(&self) -> Vec<String> {
        self.open.iter().map(|m| m.label.clone()).collect()
    }

    /// Open a saved session's tabs with their full metadata so back/forward,
    /// focus and scroll all come back too. Returns the last restored label.
    pub fn restore_from_snapshot(
        &mut self,
        app: &AppHandle,
        records: Vec<crate::session::TabRecord>,
    ) -> Result<Option<String>, String> {
        let mut last: Option<String> = None;
        for rec in records {
            let label = self.open(app, rec.url.clone())?;
            if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
                meta.title = rec.title.clone();
                if !rec.history.is_empty() {
                    meta.history = rec.history;
                    meta.idx = rec.idx.min(meta.history.len().saturating_sub(1));
                }
                meta.scroll_y = rec.scroll_y;
                meta.scroll_url = Some(rec.url);
                meta.restoring = true;
                self.dirty = true;
            }
            last = Some(label);
        }
        Ok(last)
    }

    /// The tab that most recently had focus, if any.
    pub fn active_label(&self) -> Option<String> {
        self.last_active.clone()
    }

    /// Mirror every open tab to the chrome (or the restore reply).
    pub fn infos(&self) -> Vec<TabInfo> {
        self.open
            .iter()
            .map(|m| TabInfo {
                label: m.label.clone(),
                url: m.url.clone(),
                title: m.title.clone(),
            })
            .collect()
    }

    /// Snapshot of the current tab graph for the session file.
    pub fn snapshot(&self) -> Vec<TabRecord> {
        self.open
            .iter()
            .map(|m| TabRecord {
                url: m.url.clone(),
                title: m.title.clone(),
                history: m.history.clone(),
                idx: m.idx,
                scroll_y: m.scroll_y,
            })
            .collect()
    }

    /// Whether anything changed since the last snapshot.
    pub fn dirty(&self) -> bool {
        self.dirty
    }

    pub fn mark_clean(&mut self) {
        self.dirty = false;
    }

    /// Collapse (0) or restore (CHROME_HEIGHT) the chrome strip; tabs reflow
    /// to fill the freed space. Toggled by focus/immersive mode.
    pub fn set_chrome_height(&mut self, height: f64) {
        if self.chrome_height == height {
            return;
        }
        self.chrome_height = height;
        self.dirty = true;
    }

    /// True while the chrome strip is hidden (clean/focus mode).
    pub fn immersive(&self) -> bool {
        self.chrome_height < crate::CHROME_HEIGHT
    }

    /// Reposition every tab to fill the area below the chrome strip.
    pub fn relayout(&self, app: &AppHandle) -> Result<(), String> {
        let (x, y, w, h) = self.layout_rect(app)?;
        for label in &self.labels() {
            if let Some(window) = app.get_webview_window(label) {
                window
                    .set_position(tauri::LogicalPosition::new(x, y))
                    .ok();
                window
                    .set_size(tauri::LogicalSize::new(w, h))
                    .ok();
            }
        }
        Ok(())
    }

    /// Current layout rect for a newly created tab, derived from the main window.
    fn layout_rect(&self, app: &AppHandle) -> Result<(f64, f64, f64, f64), String> {
        let main = app
            .get_webview_window("main")
            .ok_or("main window unavailable")?;

        let pos = main.outer_position().map_err(|e| e.to_string())?;
        let size = main.inner_size().map_err(|e| e.to_string())?;

        Ok((
            pos.x as f64,
            pos.y as f64 + self.chrome_height,
            size.width as f64,
            (size.height as f64 - self.chrome_height).max(0.0),
        ))
    }
}

/// Push a tab title update to the chrome (main window) for rendering.
fn emit_title(app: &AppHandle, label: &str, title: &str) {
    let _ = app.emit_to(
        "main",
        "tab:title-changed",
        serde_json::json!({ "label": label, "title": title }),
    );
}

/// Push a tab URL update to the chrome so the address bar stays in sync.
fn emit_navigation(app: &AppHandle, label: &str, url: &str) {
    let _ = app.emit_to(
        "main",
        "tab:navigated",
        serde_json::json!({ "label": label, "url": url }),
    );
}