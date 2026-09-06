//! Trust engine — device fingerprint + capability detection.
//!
//! Mirrors the browser-side `lib/capabilities.ts` logic in Rust so the
//! desktop app can describe itself to the cloud on every sync.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub os: String,
    pub arch: String,
    pub hostname: String,
    pub display_resolution: String,
    pub capabilities: HashMap<String, bool>,
}

impl DeviceInfo {
    /// Detect device characteristics at startup.
    pub fn detect() -> Self {
        let os = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();
        let hostname = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "unknown".into());

        let mut capabilities = HashMap::new();
        capabilities.insert("native_window_title".to_string(), Self::has_binary("xdotool"));
        capabilities.insert("os_keyring".to_string(), true); // libsecret/kwallet presumed on Linux
        capabilities.insert("localhost_http".to_string(), true);

        Self {
            os,
            arch,
            hostname,
            display_resolution: "unknown".into(),
            capabilities,
        }
    }

    fn has_binary(name: &str) -> bool {
        std::process::Command::new("which")
            .arg(name)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}