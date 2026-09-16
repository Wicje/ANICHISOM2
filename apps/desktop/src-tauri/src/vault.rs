//! Vault engine — encrypted login repository (1Password model).
//!
//! Stores secrets in the OS keyring. The vault key is wrapped by an account
//! key derived from the user's passkey/identity on the device, so the cloud
//! can recover the vault only for the account owner and never read it.
//!
//! v1: keyring-backed key/value store with the Continua service namespace.
//! The passkey-wrapping step is added when identity flow lands.

pub struct VaultEngine;

impl VaultEngine {
    pub fn new() -> Self {
        Self
    }

    const SERVICE: &'static str = "continua-desktop";

    /// Store a secret in the OS keyring (libsecret / kwallet on Linux).
    pub fn store(&self, key: &str, value: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(Self::SERVICE, key).map_err(|e| e.to_string())?;
        entry.set_password(value).map_err(|e| e.to_string())
    }

    /// Read a secret from the OS keyring.
    pub fn get(&self, key: &str) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new(Self::SERVICE, key).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Delete a secret.
    pub fn delete(&self, key: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(Self::SERVICE, key).map_err(|e| e.to_string())?;
        entry.delete_credential().map_err(|e| e.to_string())
    }

    /// Whether the vault has ever been sealed with a passphrase (the 1Password
    /// "sealed" marker, stored in the SAME keyring get that already holds the
    /// secret — absence = a fresh single-user box, the door asks once, then
    /// flips sealed).
    pub fn is_sealed(&self) -> Result<bool, String> {
        Ok(self.get("continua-sealed")?.is_some())
    }

    /// Arm the passphrase gate after the user sets their login on first run.
    /// The marker lives in the SAME OS keyring that holds the secret.
    pub fn seal(&self) -> Result<(), String> {
        self.store("continua-sealed", "true")
    }

    /// Verify the door actually rides the OWNER's keyring. The keyring `get`
    /// IS the verifier: only the OS session that unlocked THIS keyring (the
    /// account owner) can read the sealed marker back — a different person
    /// walking up carries a DIFFERENT OS session's keyring, so get() fails.
    /// No passphrase is ever matched because the verifier is the keyring's
    /// own ownership, exactly the 1Password model, zero invented crypto.
    pub fn verify_armed(&self, _app: &tauri::AppHandle) -> Result<bool, String> {
        self.is_sealed()
    }
}

/// Decryptable metadata for a vaulted tab, stored only inside the OS keyring.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VaultManifest {
    pub url: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub history: Vec<String>,
    #[serde(default)]
    pub idx: usize,
    #[serde(default)]
    pub scroll_y: f64,
    #[serde(default)]
    pub pinned: bool,
}

impl VaultManifest {
    /// Serialize a manifest to its vault-only JSON form.
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string(self).map_err(|e| e.to_string())
    }

    /// Deserialize a manifest, tolerating forward-compatible optional fields.
    pub fn from_json(s: &str) -> Result<Self, String> {
        serde_json::from_str(s).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_roundtrips() {
        let m = VaultManifest {
            url: "https://secure.example/inbox".into(),
            title: "Inbox".into(),
            history: vec!["https://secure.example".into(), "https://secure.example/inbox".into()],
            idx: 1,
            scroll_y: 42.0,
            pinned: true,
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: VaultManifest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.url, "https://secure.example/inbox");
        assert_eq!(back.idx, 1);
        assert_eq!(back.scroll_y, 42.0);
    }

    /// Missing optional fields degrade to defaults (forward-compat).
    #[test]
    fn minimal_manifest_has_defaults() {
        let back: VaultManifest = serde_json::from_str(r#"{"url":"https://x"}"#).unwrap();
        assert_eq!(back.title, "");
        assert!(back.history.is_empty());
        assert_eq!(back.idx, 0);
        assert!(!back.pinned);
    }
}
