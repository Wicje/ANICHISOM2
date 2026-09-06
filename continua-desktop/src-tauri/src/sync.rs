//! Sync client — pushes capture events to the Continua backend.

use serde::Serialize;

#[derive(Serialize)]
struct ContextPayload {
    domain: String,
    data: serde_json::Value,
}

pub struct SyncClient {
    client: reqwest::Client,
}

impl SyncClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .user_agent("continua-desktop/0.1")
            .build()
            .expect("failed to build http client");
        Self { client }
    }

    /// Best-effort POST to `/api/context/save`. Non-blocking on failure —
    /// offline is fine; contexts cache locally in the browser meanwhile.
    pub async fn push_context(
        &self,
        continua_url: &str,
        url: &str,
        title: &str,
    ) -> Result<(), String> {
        let endpoint = format!("{}/api/context/save", continua_url.trim_end_matches('/'));
        let payload = ContextPayload {
            domain: "browser".into(),
            data: serde_json::json!({
                "tabContext": {
                    "url": url,
                    "title": title,
                    "capturedAt": crate::capture::CaptureEngine::tab_event("tab", url, title).captured_at,
                    "source": "continua-desktop",
                },
            }),
        };

        let resp = self
            .client
            .post(&endpoint)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(format!("sync failed: {}", resp.status()))
        }
    }
}