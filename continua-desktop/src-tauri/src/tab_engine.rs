//! Tab engine — each tab is a native `WebviewWindow` positioned below
//! the React chrome strip.
//!
//! Swap-in point for single-window multi-webview (wry) later: keep the
//! `TabManager` public surface identical and change only the internals.

use std::collections::VecDeque;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::CHROME_HEIGHT;

pub struct TabManager {
    open: VecDeque<String>,
    next_id: u32,
}

impl TabManager {
    pub fn new() -> Self {
        Self {
            open: VecDeque::new(),
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
            .position(x, y)
            .inner_size(w, h)
            .build()
            .map_err(|e| e.to_string())?;

        self.open.push_back(label.clone());
        Ok(label)
    }

    pub fn close(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(label) {
            window.close().map_err(|e| e.to_string())?;
        }
        self.open.retain(|l| l != label);
        Ok(())
    }

    pub fn activate(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(window) = app.get_webview_window(label) else {
            return Err(format!("no such tab: {label}"));
        };
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;

        // Bring the tab to the front of the z-order.
        if let Some(pos) = self.open.iter().position(|l| l == label) {
            let l = self.open.remove(pos).unwrap();
            self.open.push_back(l);
        }
        Ok(())
    }

    pub fn close_all(&mut self, app: &AppHandle) -> Result<(), String> {
        let labels: Vec<String> = self.open.iter().cloned().collect();
        for label in &labels {
            self.close(app, label)?;
        }
        Ok(())
    }

    pub fn labels(&self) -> Vec<String> {
        self.open.iter().cloned().collect()
    }

    /// Reposition every tab to fill the area below the chrome strip.
    pub fn relayout(&self, app: &AppHandle) -> Result<(), String> {
        let (x, y, w, h) = self.layout_rect(app)?;
        for label in &self.open {
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