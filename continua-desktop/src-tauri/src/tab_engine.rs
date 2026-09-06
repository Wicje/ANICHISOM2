//! Tab engine — each tab is a native `WebviewWindow` positioned below
//! the React chrome strip.
//!
//! Swap-in point for single-window multi-webview (wry) later: keep the
//! `TabManager` public surface identical and change only the internals.

use std::collections::VecDeque;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::session::TabRecord;
use crate::CHROME_HEIGHT;

/// Per-tab metadata mirrored to the chrome and used for session snapshots.
#[derive(Clone)]
struct TabMeta {
    label: String,
    url: String,
    title: String,
}

pub struct TabManager {
    open: VecDeque<TabMeta>,
    /// Set on any mutation that should be persisted to disk.
    dirty: bool,
    next_id: u32,
}

impl TabManager {
    pub fn new() -> Self {
        Self {
            open: VecDeque::new(),
            dirty: false,
            next_id: 0,
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

        WebviewWindowBuilder::new(app, label.clone(), WebviewUrl::External(parsed))
            .title("Continua")
            .decorations(false)
            .position(x, y)
            .inner_size(w, h)
            .build()
            .map_err(|e| e.to_string())?;

        self.open.push_back(TabMeta {
            label: label.clone(),
            url: url.clone(),
            title: url,
        });
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
        Ok(())
    }

    /// Update a tab's title if it changed; push the change to the chrome.
    pub fn record_title(&mut self, app: &AppHandle, label: &str, title: &str) {
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

    /// Snapshot of the current tab graph for the session file.
    pub fn snapshot(&self) -> Vec<TabRecord> {
        self.open
            .iter()
            .map(|m| TabRecord {
                url: m.url.clone(),
                title: m.title.clone(),
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
            pos.y as f64 + CHROME_HEIGHT,
            size.width as f64,
            (size.height as f64 - CHROME_HEIGHT).max(0.0),
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