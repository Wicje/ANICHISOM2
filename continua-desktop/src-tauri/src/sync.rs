//! Sync client — pushes session state to the Continua backend.
//!
//! v1 rides the existing Context Protocol: session snapshots are stored as
//! the `browser` context domain, authenticated with a short-lived capability
//! token obtained through PIN pairing (`/api/connect/pair`). The server's
//! vector-clock kernel handles cross-device versioning / merge for us, so the
//! client just sends the whole snapshot and asks for newer ones.

use serde::Serialize;

#[derive(Serialize)]
struct ContextPayload {
    domain: String,
    data: serde_json::Value,
    version: u64,
    /// Server reads this field as camelCase `deviceId`.
    #[serde(rename = "deviceId")]
    device_id: String,
}

#[derive(Clone)]
pub struct SyncClient {
    client: reqwest::Client,
    /// Stable device key from the keyring fingerprint.
    pub device_id: Option<String>,
    /// Capability token minted during PIN pairing (present when paired).
    pub capability_token: Option<String>,
    /// Last version we successfully pushed/pulled, kept for pull().
    pub last_version: u64,
}

impl Default for SyncClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SyncClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .user_agent("continua-desktop/0.1")
            .build()
            .expect("failed to build http client");
        Self {
            client,
            device_id: None,
            capability_token: None,
            last_version: 0,
        }
    }

    /// Best-effort POST snapshot to the `browser` context domain.
    ///
    /// `snapshot` is the serialized `SessionSnapshot`; the caller is
    /// responsible for having redacted vault tabs to `vault_id` already
    /// (the desktop engine guarantees this on serialize).
    pub async fn push_session(
        &self,
        continua_url: &str,
        device_id: &str,
        token: &str,
        version: u64,
        snapshot: &serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let endpoint = format!(
            "{}/api/context/save",
            continua_url.trim_end_matches('/')
        );
        let payload = ContextPayload {
            domain: "browser".into(),
            data: snapshot.clone(),
            version,
            device_id: device_id.to_string(),
        };

        let resp = self
            .client
            .post(&endpoint)
            .header("Content-Type", "application/json")
            .header("x-capability-token", token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            resp.json().await.map_err(|e| e.to_string())
        } else {
            Err(format!("push failed: {}", resp.status()))
        }
    }

    /// Pull newer `browser` context (session snapshots) from the server.
    ///
    /// Returns the raw `{ domains: [...] }` body. The caller maps the first
    /// `browser` domain back onto a `SessionSnapshot`.
    pub async fn pull_session(
        &self,
        continua_url: &str,
        token: &str,
        since_version: u64,
    ) -> Result<serde_json::Value, String> {
        let endpoint = format!(
            "{}/api/context/pull?domains=browser&sinceVersion={}",
            continua_url.trim_end_matches('/'),
            since_version
        );

        let resp = self
            .client
            .get(&endpoint)
            .header("x-capability-token", token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            resp.json().await.map_err(|e| e.to_string())
        } else {
            Err(format!("pull failed: {}", resp.status()))
        }
    }

    /// Poll a PIN pairing session: `waiting` until the owner's mobile key
    /// approves (`approved`), which also carries the minted capability token.
    pub async fn poll_pairing(
        &self,
        continua_url: &str,
        pin: &str,
    ) -> Result<serde_json::Value, String> {
        let endpoint = format!(
            "{}/api/connect/pair?pin={}",
            continua_url.trim_end_matches('/'),
            pin.trim()
        );
        let resp = self
            .client
            .get(&endpoint)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if resp.status().is_success() {
            resp.json().await.map_err(|e| e.to_string())
        } else {
            Err(format!("pair poll failed: {}", resp.status()))
        }
    }
}
