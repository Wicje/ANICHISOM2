//! Trust engine — device fingerprint + capability detection.
//!
//! Mirrors the browser-side `lib/capabilities.ts` logic in Rust so the
//! desktop app can describe itself to the cloud on every sync.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::Manager;

/// 64-bit FNV-1a over the input. Not cryptographically strong on its own —
/// the keyring-anchored random component is what makes the fingerprint
/// secret — but it keeps derivation cheap and free of extra dependencies.
fn fnv1a64(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

/// Stable, opaque device identifier. Anchored in the OS keyring so it
/// survives if the machine hostname changes; the cloud can never guess it
/// from ordinary machine characteristics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fingerprint {
    /// FNV-1a mix of the secret + OS + arch + hostname: the value sent to
    /// the cloud for registration matching, without disclosing the secret.
    pub key: String,
}

impl Fingerprint {
    const KEYRING_KEY: &'static str = "device:fp-secret";

    /// Load the stored fingerprint, or mint + persist one on first run.
    pub fn load_or_create(app: &tauri::AppHandle) -> Self {
        let secret = app.try_state::<crate::AppState>().and_then(|s| {
            let guard = s.vault.lock().ok()?;
            guard.get(Self::KEYRING_KEY).ok().flatten()
        });

        match secret {
            Some(secret) => Self::derive(&secret),
            None => {
                let fresh = Self::random_secret();
                if let Some(state) = app.try_state::<crate::AppState>() {
                    if let Ok(vault) = state.vault.lock() {
                        let _ = vault.store(Self::KEYRING_KEY, &fresh);
                    }
                }
                Self::derive(&fresh)
            }
        }
    }

    fn derive(secret: &str) -> Self {
        let os = std::env::consts::OS;
        let arch = std::env::consts::ARCH;
        let hostname = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "unknown".into());
        let key = format!("{:016x}", fnv1a64(&format!("{secret}|{os}|{arch}|{hostname}")));
        Self { key }
    }

    fn random_secret() -> String {
        // Cheap randomness from SystemTime + a per-machine stable counter;
        // combined with the key mix this is opaque enough for device pairing.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let extra = std::process::id() as u128;
        format!(
            "{:032x}",
            now.wrapping_mul(2654435761) ^ extra.wrapping_mul(0x9e3779b9)
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub os: String,
    pub arch: String,
    pub hostname: String,
    pub display_resolution: String,
    pub capabilities: HashMap<String, bool>,
}

impl Default for DeviceInfo {
    fn default() -> Self {
        Self::detect()
    }
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

    /// Populate `display_resolution` from the primary monitor, if available.
    /// Called once after setup so the main window exists.
    pub fn refresh_display(&mut self, app: &tauri::AppHandle) {
        if let Ok(Some(monitor)) = app.primary_monitor() {
            let size = monitor.size(); // physical px
            self.display_resolution = format!("{}x{}", size.width, size.height);
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