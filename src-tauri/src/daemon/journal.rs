//! Continua Event Journal (Rust) — S4 contract mirror
//!
//! Append-only local journal at `~/.continua/journal/YYYY-MM-DD.events`
//! (JSONL, one envelope per line). Capture is cheap and never blocks:
//! writers append and return; sync is a separate, batched concern.
//!
//! Sync bookkeeping uses a single watermark file (`synced-watermark`)
//! holding the highest synced event timestamp. Retention purges raw day
//! files older than `keep_days`.

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// L0 noise … L4 checkpoint. Mirrors lib/journal/envelope.ts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "u8")]
pub struct Importance(u8);

impl Importance {
    pub const NOISE: Importance = Importance(0);
    pub const LOW: Importance = Importance(1);
    pub const ACTIVITY: Importance = Importance(2);
    pub const MILESTONE: Importance = Importance(3);
    pub const CHECKPOINT: Importance = Importance(4);

    pub fn value(self) -> u8 {
        self.0
    }
}

impl TryFrom<u8> for Importance {
    type Error = String;
    fn try_from(v: u8) -> Result<Self, Self::Error> {
        if v <= 4 {
            Ok(Importance(v))
        } else {
            Err(format!("importance {v} out of range 0..=4"))
        }
    }
}

/// Closed kind set. Mirrors JOURNAL_EVENT_KINDS in lib/journal/envelope.ts;
/// update both together plus the DB check constraint.
pub const KIND_SESSION_START: &str = "session.start";
pub const KIND_SESSION_END: &str = "session.end";
pub const KIND_APP_FOCUS: &str = "app.focus";
pub const KIND_WINDOW_TITLE: &str = "window.title";
pub const KIND_GIT_BRANCH: &str = "git.branch";
pub const KIND_GIT_COMMIT: &str = "git.commit";
pub const KIND_GIT_PUSH: &str = "git.push";
pub const KIND_CHECKPOINT_MANUAL: &str = "checkpoint.manual";

/// Deterministic capture-time classification (mirrors classifyImportance).
pub fn classify_importance(kind: &str) -> Importance {
    match kind {
        KIND_SESSION_END | KIND_CHECKPOINT_MANUAL => Importance::CHECKPOINT,
        KIND_GIT_COMMIT | KIND_GIT_PUSH => Importance::MILESTONE,
        KIND_GIT_BRANCH | KIND_SESSION_START => Importance::ACTIVITY,
        KIND_APP_FOCUS => Importance::LOW,
        _ => Importance::NOISE,
    }
}

/// S4 envelope. Field names are the wire format — do not rename casually.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEvent {
    pub id: String,
    /// Epoch milliseconds (device clock).
    pub ts: i64,
    pub device: String,
    pub kind: String,
    pub importance: Importance,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_tag: Option<String>,
    #[serde(default, skip_serializing_if = "serde_json::Value::is_null")]
    pub payload: serde_json::Value,
}

impl JournalEvent {
    pub fn new(device: &str, kind: &str, project_tag: Option<&str>, payload: serde_json::Value) -> Self {
        let ts = Utc::now().timestamp_millis();
        JournalEvent {
            id: fresh_id(ts),
            ts,
            device: device.to_string(),
            kind: kind.to_string(),
            importance: classify_importance(kind),
            project_tag: project_tag.map(|s| s.chars().take(256).collect()),
            payload,
        }
    }

    /// Override a classified importance (e.g. manual checkpoints).
    pub fn with_importance(mut self, imp: Importance) -> Self {
        self.importance = imp;
        self
    }
}

fn fresh_id(ts: i64) -> String {
    // Compact unique-enough id: millis + nanos + pointer entropy, hex.
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    format!("{:x}-{:x}", ts, (nanos as u64) ^ ((&ts as *const i64 as usize) as u64))
}

// ─── Storage layout ─────────────────────────────────────────────────────

pub fn journal_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(".continua").join("journal"))
}

fn day_file_name(date: &NaiveDate) -> String {
    format!("{}.events", date.format("%Y-%m-%d"))
}

fn parse_day_file(name: &str) -> Option<NaiveDate> {
    name.strip_suffix(".events").and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
}

/// Append one event to today's day file. Never blocks on network; IO errors
/// are logged and swallowed (capture must not take the app down).
pub fn append(event: &JournalEvent) {
    append_to(&journal_dir_or_default(), event);
}

fn journal_dir_or_default() -> PathBuf {
    journal_dir().unwrap_or_else(|| PathBuf::from("/tmp/continua-journal"))
}

fn append_to(dir: &std::path::Path, event: &JournalEvent) {
    let date = millis_to_date(event.ts);
    let path = dir.join(day_file_name(&date));
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            log::warn!("[journal] cannot create dir {:?}: {}", parent, e);
            return;
        }
    }
    match fs::OpenOptions::new().create(true).append(true).open(&path) {
        Ok(mut f) => {
            if let Ok(line) = serde_json::to_string(event) {
                if let Err(e) = writeln!(f, "{}", line) {
                    log::warn!("[journal] append failed: {}", e);
                }
            }
        }
        Err(e) => log::warn!("[journal] open failed {:?}: {}", path, e),
    }
}

fn millis_to_date(millis: i64) -> NaiveDate {
    DateTime::from_timestamp_millis(millis)
        .unwrap_or_default()
        .date_naive()
}

/// Read all events from local files, oldest first. Used by tests and by
/// `unsynced_above`.
pub fn read_all() -> Vec<JournalEvent> {
    read_all_in(&journal_dir_or_default())
}

fn read_all_in(dir: &std::path::Path) -> Vec<JournalEvent> {
    let mut dates: Vec<NaiveDate> = list_day_files(dir);
    dates.sort();

    let mut events = Vec::new();
    for date in dates {
        let path = dir.join(day_file_name(&date));
        if let Ok(contents) = fs::read_to_string(&path) {
            for line in contents.lines() {
                if let Ok(ev) = serde_json::from_str::<JournalEvent>(line) {
                    events.push(ev);
                }
            }
        }
    }
    events
}

fn list_day_files(dir: &std::path::Path) -> Vec<NaiveDate> {
    let mut dates = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if let Some(date) = parse_day_file(&name) {
                dates.push(date);
            }
        }
    }
    dates
}

// ─── Sync watermark ─────────────────────────────────────────────────────

fn watermark_path(dir: &std::path::Path) -> PathBuf {
    dir.join("synced-watermark")
}

fn load_watermark(dir: &std::path::Path) -> i64 {
    fs::read_to_string(watermark_path(dir))
        .ok()
        .and_then(|c| c.trim().parse::<i64>().ok())
        .unwrap_or(0)
}

fn save_watermark(dir: &std::path::Path, ts: i64) {
    let current = load_watermark(dir);
    if ts > current {
        let _ = fs::write(watermark_path(dir), ts.to_string());
    }
}

/// Events at/above `min_importance` newer than the watermark, oldest first.
/// The watermark only advances via `confirm_synced`, so failed batches retry.
pub fn unsynced_above(min_importance: Importance) -> Vec<JournalEvent> {
    unsynced_above_in(&journal_dir_or_default(), min_importance)
}

fn unsynced_above_in(dir: &std::path::Path, min_importance: Importance) -> Vec<JournalEvent> {
    let watermark = load_watermark(dir);
    read_all_in(dir)
        .into_iter()
        .filter(|ev| ev.ts > watermark && ev.importance.value() >= min_importance.value())
        .collect()
}

/// Advance the watermark to the newest confirmed timestamp (monotonic).
pub fn confirm_synced(confirmed_newest_ts: i64) {
    if let Some(dir) = journal_dir() {
        save_watermark(&dir, confirmed_newest_ts);
    }
}

// ─── Retention ──────────────────────────────────────────────────────────

/// Delete raw day files older than `keep_days`. Returns removed count.
pub fn purge_older_than(keep_days: i64) -> usize {
    purge_older_than_in(&journal_dir_or_default(), keep_days)
}

fn purge_older_than_in(dir: &std::path::Path, keep_days: i64) -> usize {
    let cutoff = Utc::now().date_naive() - chrono::Duration::days(keep_days);
    let mut removed = 0;
    for date in list_day_files(dir) {
        if date < cutoff {
            if fs::remove_file(dir.join(day_file_name(&date))).is_ok() {
                removed += 1;
            }
        }
    }
    removed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tempdir() -> PathBuf {
        use std::sync::atomic::{AtomicU32, Ordering};
        static SEQ: AtomicU32 = AtomicU32::new(0);
        let d = std::env::temp_dir().join(format!(
            "continua-journal-test-{}-{}",
            std::process::id(),
            SEQ.fetch_add(1, Ordering::SeqCst)
        ));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    fn ev(kind: &str, ts: i64, tag: Option<&str>) -> JournalEvent {
        JournalEvent {
            id: fresh_id(ts),
            ts,
            device: "daemon-test".into(),
            kind: kind.into(),
            importance: classify_importance(kind),
            project_tag: tag.map(String::from),
            payload: serde_json::json!({}),
        }
    }

    #[test]
    fn classification_matches_contract() {
        assert_eq!(classify_importance(KIND_GIT_COMMIT), Importance::MILESTONE);
        assert_eq!(classify_importance(KIND_SESSION_END), Importance::CHECKPOINT);
        assert_eq!(classify_importance(KIND_APP_FOCUS), Importance::LOW);
        assert_eq!(classify_importance(KIND_WINDOW_TITLE), Importance::NOISE);
    }

    #[test]
    fn appends_and_reads_back_across_day_files() {
        let dir = tempdir();
        // Two days of events
        let day1 = Utc::now().timestamp_millis() - 86_400_000 * 3;
        let today = Utc::now().timestamp_millis();
        append_to(&dir, &ev(KIND_APP_FOCUS, day1, None));
        append_to(&dir, &ev(KIND_GIT_COMMIT, today, Some("repo-a")));

        let all = read_all_in(&dir);
        assert_eq!(all.len(), 2);
        assert!(all[0].ts < all[1].ts); // oldest first
        assert_eq!(all[1].project_tag.as_deref(), Some("repo-a"));
        assert_eq!(list_day_files(&dir).len(), 2);
    }

    #[test]
    fn watermark_selects_unsynced_and_advances_monotonically() {
        let dir = tempdir();
        let base = Utc::now().timestamp_millis();
        append_to(&dir, &ev(KIND_WINDOW_TITLE, base - 100, None)); // noise
        append_to(&dir, &ev(KIND_APP_FOCUS, base - 50, None));     // below bar
        append_to(&dir, &ev(KIND_GIT_COMMIT, base - 10, None));    // eligible

        let pending = unsynced_above_in(&dir, Importance::MILESTONE);
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].kind, KIND_GIT_COMMIT);

        confirm_synced_in(&dir, base - 10);
        assert!(unsynced_above_in(&dir, Importance::MILESTONE).is_empty());

        // Older confirmations must never rewind the watermark.
        confirm_synced_in(&dir, base - 9999);
        append_to(&dir, &ev(KIND_GIT_COMMIT, base + 5, None));
        assert_eq!(unsynced_above_in(&dir, Importance::MILESTONE).len(), 1);
    }

    fn confirm_synced_in(dir: &std::path::Path, ts: i64) {
        save_watermark(dir, ts);
    }

    #[test]
    fn retention_purges_old_days_only() {
        let dir = tempdir();
        let old = Utc::now().date_naive() - chrono::Duration::days(10);
        let recent = Utc::now().date_naive();
        fs::write(dir.join(day_file_name(&old)), "").unwrap();
        fs::write(dir.join(day_file_name(&recent)), "").unwrap();
        fs::write(dir.join("synced-watermark"), "0").unwrap(); // untouched

        let removed = purge_older_than_in(&dir, 7);
        assert_eq!(removed, 1);
        assert!(!dir.join(day_file_name(&old)).exists());
        assert!(dir.join(day_file_name(&recent)).exists());
        assert!(dir.join("synced-watermark").exists());
    }
}
