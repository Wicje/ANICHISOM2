//! Continua Background Context Daemon (v2 — event journal)
//!
//! Architecture (docs/CONTINUA_CORE_ARCHITECTURE.md §S4 + invariant 4):
//!   - capture never blocks: sensors diff cheaply each tick and append
//!     journal events locally ONLY on change; idle ticks cost ~nothing
//!   - interpretation is asynchronous and deterministic first (classifiers
//!     assign L0–L4 importance at capture time)
//!   - sync is intentional: milestone+ events batch to /api/journal/ingest
//!     every `sync_interval_secs`; the WorkContext snapshot to context_graph
//!     only ships when observed state actually changed (or on a slow
//!     heartbeat), replacing the old poll-and-send-every-minute behavior
//!   - session termination writes an L4 checkpoint and attempts one final
//!     flush, so hard kills lose nothing that was already journaled

pub mod classify;
pub mod config;
pub mod journal;
pub mod sensors;
pub mod uplink;

use self::classify::{capture_changes, ObservedState};
use self::config::DaemonConfig;
use self::journal::JournalEvent;
use self::{journal, sensors, uplink};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

static LAST_CHECKPOINT_TS: AtomicU64 = AtomicU64::new(0);

pub fn last_checkpoint_secs_ago() -> Option<u64> {
    let ts = LAST_CHECKPOINT_TS.load(Ordering::SeqCst);
    if ts == 0 {
        return None;
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some(now.saturating_sub(ts))
}

fn device_id() -> String {
    // Stable per-machine id stored next to the config file.
    if let Some(path) = dirs::config_dir().map(|d| d.join("continua").join("device-id")) {
        if let Ok(id) = std::fs::read_to_string(&path) {
            let trimmed = id.trim().to_string();
            if !trimmed.is_empty() {
                return format!("daemon-{}", trimmed);
            }
        }
        let fresh: String = (0..8).map(|_| format!("{:x}", rand_byte() % 16)).collect();
        if std::fs::create_dir_all(path.parent().unwrap()).is_ok() {
            let _ = std::fs::write(&path, &fresh);
        }
        return format!("daemon-{}", fresh);
    }
    "daemon-anon".to_string()
}

fn rand_byte() -> u8 {
    // Lightweight entropy: timestamp nanos mixed with address entropy.
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    ((nanos as u8).wrapping_mul(31)) ^ (&nanos as *const _ as usize as u8)
}

/// Spawn the recurring capture loop plus its companions on the Tauri runtime.
pub fn spawn(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut config = config::load_config();

        // Startup retention sweep + session marker.
        let purged = journal::purge_older_than(config.journal_keep_days);
        if purged > 0 {
            log::info!("[daemon] retention purged {} day files", purged);
        }
        journal::append(&JournalEvent::new(
            &device_id(),
            journal::KIND_SESSION_START,
            None,
            serde_json::json!({}),
        ));
        set_status("Watching");

        tokio::select! {
            _ = capture_loop(app_handle) => {},
            _ = journal_sync_loop() => {},
            _ = shutdown_watcher() => {
                log::info!("[daemon] shutdown signal — writing session-end checkpoint");
                uplink::session_end(&config, "shutdown").await;
                set_status("Stopped");
            },
        }
    });
}

async fn capture_loop(app_handle: tauri::AppHandle) {
    let mut config = config::load_config();
    let mut state = ObservedState::default();
    let mut last_snapshot_fingerprint: Option<String> = None;
    let mut tick: u64 = 0;

    loop {
        // Reload config each tick so token/config edits apply without restart
        let fresh = config::load_config();
        if fresh != config {
            log::info!("[daemon] configuration reloaded");
            config = fresh;
        }

        last_snapshot_fingerprint =
            run_tick(&config, &app_handle, &mut state, last_snapshot_fingerprint, tick).await;
        tick += 1;

        let interval = config.interval_secs.clamp(30, 300);
        tokio::time::sleep(Duration::from_secs(interval)).await;
    }
}

/// Periodic journal cloud-sync (batched, watermark-guarded).
async fn journal_sync_loop() {
    loop {
        let config = config::load_config();
        uplink::flush_journal(&config).await;
        let interval = config.sync_interval_secs.clamp(15, 600);
        tokio::time::sleep(Duration::from_secs(interval)).await;
    }
}

/// Best-effort termination handling: Ctrl+C everywhere, SIGTERM on unix.
async fn shutdown_watcher() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut term = signal(SignalKind::terminate()).expect("install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = term.recv() => {},
        }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}

async fn run_tick(
    config: &DaemonConfig,
    app_handle: &tauri::AppHandle,
    state: &mut ObservedState,
    last_snapshot_fingerprint: Option<String>,
    tick: u64,
) -> Option<String> {
    if uplink::is_paused() {
        log::debug!("[daemon] paused — skipping tick");
        update_tray_status(app_handle, "Paused");
        return last_snapshot_fingerprint;
    }

    let project = sensors::find_active_project(&config.watch_paths);
    let window = sensors::active_window_title();

    // 1. Journal capture — local appends, only for actual changes.
    let now_ms = chrono::Utc::now().timestamp_millis();
    let changes = capture_changes(state, &project, &window, &device_id(), now_ms);
    for ev in &changes {
        journal::append(ev);
    }

    // 2. WorkContext snapshot — cloud write only when state changed, or a
    //    slow heartbeat (~every 10th tick) keeps the connect page fresh.
    let fingerprint = state.fingerprint();
    let changed = last_snapshot_fingerprint.as_deref() != Some(fingerprint.as_str());

    if changed || tick % 10 == 0 {
        let payload = build_payload(config, &project, window.as_deref());
        uplink::submit(config, payload).await;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        LAST_CHECKPOINT_TS.store(now, Ordering::SeqCst);

        Some(fingerprint)
    } else {
        log::debug!("[daemon] no state change — snapshot skipped");
        last_snapshot_fingerprint
    };

    match &project {
        Some(p) => update_tray_status(app_handle, &format!("{} ({})", p.name, p.branch)),
        None => update_tray_status(app_handle, "No active project"),
    }
}

fn build_payload(
    config: &DaemonConfig,
    project: &Option<sensors::GitProject>,
    window: Option<&str>,
) -> serde_json::Value {
    match project {
        Some(p) => uplink::build_checkpoint(
            &device_id(),
            &config.workspace,
            Some(&p.name),
            Some(&p.path),
            Some(&p.branch),
            p.modified_count,
            p.untracked_count,
            p.last_commit_message.as_deref(),
            window,
        ),
        None => uplink::build_checkpoint(
            &device_id(),
            &config.workspace,
            None,
            None,
            None,
            0,
            0,
            None,
            window,
        ),
    }
}

/// Reflect daemon status into the tray tooltip when available.
fn update_tray_status(_app_handle: &tauri::AppHandle, status: &str) {
    set_status(status);
}

// Process-wide status string the tray menu reads when rebuilt.
static STATUS: std::sync::OnceLock<std::sync::Mutex<String>> = std::sync::OnceLock::new();

fn status_cell() -> &'static std::sync::Mutex<String> {
    STATUS.get_or_init(|| std::sync::Mutex::new(String::from("Starting…")))
}

pub fn set_status(s: &str) {
    if let Ok(mut guard) = status_cell().lock() {
        *guard = s.to_string();
    }
}

pub fn current_status() -> String {
    status_cell().lock().map(|g| g.clone()).unwrap_or_default()
}
