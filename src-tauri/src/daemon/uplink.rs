//! Continua Daemon Uplink
//!
//! Posts metadata checkpoints to `/api/context/save` using the device
//! capability token. Includes a bounded offline queue persisted as JSONL
//! next to the config file; queued checkpoints flush on next success.

use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

static LOCAL_ONLY: AtomicBool = AtomicBool::new(false);
static PAUSED: AtomicBool = AtomicBool::new(false);

pub fn set_local_only(on: bool) {
    LOCAL_ONLY.store(on, Ordering::SeqCst);
}
pub fn is_local_only() -> bool {
    LOCAL_ONLY.load(Ordering::SeqCst)
}
pub fn set_paused(on: bool) {
    PAUSED.store(on, Ordering::SeqCst);
}
pub fn is_paused() -> bool {
    PAUSED.load(Ordering::SeqCst)
}

const QUEUE_MAX: usize = 200;

fn queue_path() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join("continua").join("daemon-queue.jsonl"))
}

/// Build the checkpoint payload matching the web client's WorkContext schema.
#[allow(clippy::too_many_arguments)]
pub fn build_checkpoint(
    device_id: &str,
    workspace: &str,
    project_name: Option<&str>,
    project_path: Option<&str>,
    branch: Option<&str>,
    modified_count: u32,
    untracked_count: u32,
    last_commit_message: Option<&str>,
    active_window: Option<&str>,
) -> serde_json::Value {
    let git = if let Some(branch) = branch {
        json!({
            "repo": project_path.unwrap_or_default(),
            "branch": branch,
            "modifiedCount": modified_count,
            "untrackedCount": untracked_count,
            "lastCommitMessage": last_commit_message,
        })
    } else {
        serde_json::Value::Null
    };

    json!({
        "id": format!("ctx_daemon_{}", chrono::Utc::now().timestamp_millis()),
        "projectId": project_path.unwrap_or("daemon-watch"),
        "projectName": project_name.unwrap_or("No Active Project"),
        "updatedAt": chrono::Utc::now().to_rfc3339(),
        "deviceId": device_id,
        "git": git,
        "editor": {
            "activeFile": active_window.unwrap_or(""),
            "cursorLine": 0,
            "cursorColumn": 0,
            "openFiles": [],
            "ideName": "Native Daemon",
        },
        "browserTabs": [],
        "tasks": [],
        "workspace": workspace,
    })
}

/// POST a checkpoint. Returns Ok on HTTP success.
async fn post_checkpoint(
    server_url: &str,
    token: &str,
    device_id: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    let url = format!("{}/api/context/save", server_url.trim_end_matches('/'));
    let body = json!({
        "domain": "context_graph",
        "data": payload,
        "version": chrono::Utc::now().timestamp_millis(),
        "deviceId": device_id,
        "vectorClock": { device_id: chrono::Utc::now().timestamp_millis() },
        "deleted": false,
    });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .timeout(std::time::Duration::from_secs(15))
        .header("x-capability-token", token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("network: {e}"))?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!("http {}", res.status()))
    }
}

fn enqueue(payload: &serde_json::Value) {
    let Some(path) = queue_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    // Read existing, append, trim to cap (drop oldest).
    let mut lines: Vec<String> = fs::read_to_string(&path)
        .map(|c| c.lines().map(String::from).collect())
        .unwrap_or_default();

    lines.push(payload.to_string());
    let len = lines.len();
    if len > QUEUE_MAX {
        lines = lines.split_off(len - QUEUE_MAX);
    }
    let _ = fs::write(&path, lines.join("\n"));
    log::info!("[uplink] queued offline checkpoint (queue size {})", lines.len());
}

/// Read and clear the offline queue, returning up to QUEUE_MAX payloads.
fn take_queue() -> Vec<serde_json::Value> {
    let Some(path) = queue_path() else {
        return Vec::new();
    };

    let contents = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    let _ = fs::remove_file(&path);

    contents
        .lines()
        .filter_map(|l| serde_json::from_str::<serde_json::Value>(l).ok())
        .take(QUEUE_MAX)
        .collect()
}

/// Main uplink entry: called once per sensor tick.
pub async fn submit(config: &super::config::DaemonConfig, payload: serde_json::Value) {
    if is_paused() {
        return; // private session: nothing recorded at all
    }
    if is_local_only() || config.capability_token.is_empty() {
        log::debug!("[uplink] local-only mode — checkpoint kept on disk only");
        return;
    }

    match post_checkpoint(&config.server_url, &config.capability_token, "native-daemon", &payload).await
    {
        Ok(()) => {
            // Flush any previously queued checkpoints (bounded).
            for queued in take_queue() {
                log::info!("[uplink] flushing queued checkpoint");
                let _ = post_checkpoint(
                    &config.server_url,
                    &config.capability_token,
                    "native-daemon",
                    &queued,
                )
                .await;
            }
        }
        Err(e) => {
            log::warn!("[uplink] failed ({e}) — enqueueing");
            enqueue(&payload);
        }
    }
}

// ─── Journal batch sync (Phase I) ───────────────────────────────────────

use super::journal::{self, Importance, JournalEvent};

/// POST a batch of journal envelopes to /api/journal/ingest.
async fn post_journal_batch(
    server_url: &str,
    token: &str,
    events: &[JournalEvent],
) -> Result<(), String> {
    let url = format!("{}/api/journal/ingest", server_url.trim_end_matches('/'));
    let body = json!({ "events": events });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .timeout(std::time::Duration::from_secs(20))
        .header("x-capability-token", token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("network: {e}"))?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!("http {}", res.status()))
    }
}

/// Batched journal sync: ship unsynced events at/above `min` importance.
/// Watermark advances only on success so failures retry naturally.
pub async fn flush_journal(config: &super::config::DaemonConfig) -> usize {
    if is_paused() || is_local_only() || config.capability_token.is_empty() {
        return 0;
    }

    let pending = journal::unsynced_above(Importance::MILESTONE);
    if pending.is_empty() {
        return 0;
    }

    // Bounded batches: ingest caps at 500; take the oldest slice.
    let batch: Vec<JournalEvent> = pending.iter().take(500).cloned().collect();
    let newest_ts = batch.last().map(|e| e.ts).unwrap_or(0);

    match post_journal_batch(&config.server_url, &config.capability_token, &batch).await {
        Ok(()) => {
            journal::confirm_synced(newest_ts);
            log::info!("[uplink] synced {} journal events", batch.len());
            batch.len()
        }
        Err(e) => {
            log::warn!("[uplink] journal sync failed ({e}) — will retry");
            0
        }
    }
}

/// Session-end hook: write an L4 checkpoint locally and attempt one final
/// best-effort sync. Called from the shutdown signal watcher.
pub async fn session_end(config: &super::config::DaemonConfig, reason: &str) {
    journal::append(
        &JournalEvent::new(
            "native-daemon",
            journal::KIND_SESSION_END,
            None,
            json!({ "reason": reason }),
        )
        .with_importance(Importance::CHECKPOINT),
    );
    flush_journal(config).await;
}
