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
}