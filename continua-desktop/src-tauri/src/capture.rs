//! Capture engine — native context capture.
//!
//! This is the resurrection of the abandoned daemon: as part of the browser
//! process it gets native OS signals (active window title on Linux via
//! WebKitGTK/X11 utilities) without a separate process.

use std::process::Command;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureEvent {
    pub kind: String,
    pub uri: Option<String>,
    pub title: Option<String>,
    pub captured_at: u64,
}

pub struct CaptureEngine;

impl CaptureEngine {
    pub fn new() -> Self {
        Self
    }

    /// Best-effort active window title on Linux (X11).
    /// Falls back to `None` on Wayland / unsupported systems — the
    /// browser-level tab events are the primary capture path anyway.
    pub fn active_window_title(&self) -> Option<String> {
        if std::env::var("WAYLAND_DISPLAY").is_ok() {
            return None;
        }
        let out = Command::new("xdotool").arg("getactivewindow").arg("getwindowname").output().ok()?;
        if out.status.success() {
            let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !name.is_empty() {
                return Some(name);
            }
        }
        None
    }

    /// Synthesize a capture event from browser activity.
    pub fn tab_event(kind: &str, uri: &str, title: &str) -> CaptureEvent {
        CaptureEvent {
            kind: kind.to_string(),
            uri: Some(uri.to_string()),
            title: Some(title.to_string()),
            captured_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
        }
    }
}