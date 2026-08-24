//! Continua Background Context Daemon
//!
//! Runs a checkpoint loop every `interval_secs`: discovers the most recently
//! active git project across watched roots, reads metadata-only git state,
//! detects the active window title, builds a WorkContext-compatible payload
//! and submits it through the uplink (which honors pause / local-only modes).

use self::config::DaemonConfig;
use self::{sensors, uplink};
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
        let fresh: String = (0..8)
            .map(|_| format!("{:x}", rand_byte() % 16))
            .collect();
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

/// Spawn the recurring checkpoint loop on the Tauri async runtime.
pub fn spawn(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut config = config::load_config();

        loop {
            // Reload config each tick so token/config edits apply without restart
            let fresh = config::load_config();
            if fresh != config {
                log::info!("[daemon] configuration reloaded");
            }
            config = fresh;

            run_tick(&config, &app_handle).await;
            let interval = config.interval_secs.clamp(30, 300);
            tokio::time::sleep(Duration::from_secs(interval)).await;
        }
    });
}

async fn run_tick(config: &DaemonConfig, app_handle: &tauri::AppHandle) {
    if uplink::is_paused() {
        log::debug!("[daemon] paused — skipping tick");
        update_tray_status(app_handle, "Paused");
        return;
    }

    let project = sensors::find_active_project(&config.watch_paths);
    let window = sensors::active_window_title();

    let payload = match &project {
        Some(p) => uplink::build_checkpoint(
            &device_id(),
            &config.workspace,
            Some(&p.name),
            Some(&p.path),
            Some(&p.branch),
            p.modified_count,
            p.untracked_count,
            p.last_commit_message.as_deref(),
            window.as_deref(),
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
            window.as_deref(),
        ),
    };

    uplink::submit(config, payload).await;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    LAST_CHECKPOINT_TS.store(now, Ordering::SeqCst);

    match &project {
        Some(p) => update_tray_status(
            app_handle,
            &format!("{} ({})", p.name, p.branch),
        ),
        None => update_tray_status(app_handle, "No active project"),
    }
    log::info!("[daemon] checkpoint captured");
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
