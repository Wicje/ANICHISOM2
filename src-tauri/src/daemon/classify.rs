//! Continua Event Classifiers (Phase I)
//!
//! Pure, deterministic diff→envelope logic. No tauri, no IO — the daemon
//! loop feeds observed sensors in and journal events out. Unit-tested
//! without any runtime.

use super::journal::{JournalEvent, Importance};
use super::sensors::GitProject;

/// Everything the classifiers diff against between ticks.
#[derive(Default)]
pub struct ObservedState {
    pub project_path: Option<String>,
    pub branch: Option<String>,
    pub last_commit_message: Option<String>,
    pub window_title: Option<String>,
    /// Millis of the last recorded window.title event (throttle).
    pub last_title_event_ms: i64,
}

impl ObservedState {
    /// Stable summary of cloud-relevant state; drives snapshot change-detection.
    pub fn fingerprint(&self) -> String {
        format!(
            "{}|{}|{}",
            self.project_path.as_deref().unwrap_or(""),
            self.branch.as_deref().unwrap_or(""),
            self.last_commit_message.as_deref().unwrap_or(""),
        )
    }
}

/// Window-title noise throttle: at most one title event per 5 minutes.
const TITLE_THROTTLE_MS: i64 = 300_000;

/// Emit journal events for everything that changed since the last tick.
/// Deterministic classification happens here, at capture time:
///   project switch → app.focus (L1)
///   branch change  → git.branch (L2)
///   new HEAD commit → git.commit (L3)
///   title change   → window.title (L0, throttled)
pub fn capture_changes(
    state: &mut ObservedState,
    project: &Option<GitProject>,
    window: &Option<String>,
    device: &str,
    now_ms: i64,
) -> Vec<JournalEvent> {
    let mut events = Vec::new();

    if let Some(p) = project {
        if state.project_path.as_deref() != Some(p.path.as_str()) {
            events.push(JournalEvent::new(
                device,
                super::journal::KIND_APP_FOCUS,
                Some(&p.name),
                serde_json::json!({ "window": window }),
            ));
            state.project_path = Some(p.path.clone());
        }
        if state.branch.as_deref() != Some(p.branch.as_str()) {
            events.push(JournalEvent::new(
                device,
                super::journal::KIND_GIT_BRANCH,
                Some(&p.name),
                serde_json::json!({ "branch": p.branch }),
            ));
            state.branch = Some(p.branch.clone());
        }
        if state.last_commit_message.as_deref() != p.last_commit_message.as_deref() {
            if let Some(subject) = &p.last_commit_message {
                // A new HEAD commit appeared since the previous tick.
                events.push(
                    JournalEvent::new(
                        device,
                        super::journal::KIND_GIT_COMMIT,
                        Some(&p.name),
                        serde_json::json!({ "branch": p.branch, "subject": subject }),
                    )
                    .with_importance(Importance::MILESTONE),
                );
            }
            state.last_commit_message = p.last_commit_message.clone();
        }
    }

    if let Some(title) = window {
        if state.window_title.as_deref() != Some(title.as_str()) {
            if now_ms - state.last_title_event_ms >= TITLE_THROTTLE_MS {
                state.last_title_event_ms = now_ms;
                events.push(
                    JournalEvent::new(device, super::journal::KIND_WINDOW_TITLE, None, serde_json::json!({ "title": title }))
                        .with_importance(Importance::NOISE),
                );
            }
            state.window_title = Some(title.clone());
        }
    }

    events
}

#[cfg(test)]
mod tests {
    use super::*;

    fn project(path: &str, branch: &str, commit: Option<&str>) -> GitProject {
        GitProject {
            path: path.into(),
            name: path.rsplit('/').next().unwrap_or("unknown").into(),
            branch: branch.into(),
            modified_count: 0,
            untracked_count: 0,
            last_commit_message: commit.map(String::from),
        }
    }

    #[test]
    fn first_observation_emits_focus_branch_and_title() {
        let mut st = ObservedState::default();
        let p = project("/home/u/proj", "main", None);
        let win = Some("editor — main.rs".to_string());

        let evs = capture_changes(&mut st, &Some(p), &win, "d1", 400_000);
        let kinds: Vec<&str> = evs.iter().map(|e| e.kind.as_str()).collect();
        assert!(kinds.contains(&super::super::journal::KIND_APP_FOCUS));
        assert!(kinds.contains(&super::super::journal::KIND_GIT_BRANCH));
        assert!(kinds.contains(&super::super::journal::KIND_WINDOW_TITLE));
    }

    #[test]
    fn unchanged_state_emits_nothing() {
        let mut st = ObservedState::default();
        let p = project("/home/u/proj", "main", None);
        let win = Some("editor".to_string());

        capture_changes(&mut st, &Some(p), &win, "d1", 1000);
        let again = project("/home/u/proj", "main", None);
        let win2 = Some("editor".to_string());
        assert!(capture_changes(&mut st, &Some(again), &win2, "d1", 2000).is_empty());
    }

    #[test]
    fn new_commit_is_a_milestone_with_payload() {
        let mut st = ObservedState::default();
        capture_changes(&mut st, &Some(project("/p/a", "main", None)), &None, "d1", 1000);

        let committed = project("/p/a", "main", Some("feat: navbar"));
        let evs = capture_changes(&mut st, &Some(committed), &None, "d1", 2000);
        let commit_ev = evs.iter().find(|e| e.kind == super::super::journal::KIND_GIT_COMMIT).expect("commit event");
        assert_eq!(commit_ev.importance.value(), 3);
        assert_eq!(commit_ev.project_tag.as_deref(), Some("a"));
        assert_eq!(commit_ev.payload["subject"], "feat: navbar");
    }

    #[test]
    fn commit_message_reverting_to_none_does_not_emit() {
        let mut st = ObservedState::default();
        capture_changes(&mut st, &Some(project("/p/a", "main", Some("v1"))), &None, "d1", 1000);
        // HEAD detached / message unavailable → no phantom commit event
        let evs = capture_changes(&mut st, &Some(project("/p/a", "main", None)), &None, "d1", 2000);
        assert!(!evs.iter().any(|e| e.kind == super::super::journal::KIND_GIT_COMMIT));
    }

    #[test]
    fn title_noise_is_throttled_but_still_updates_seen_state() {
        let mut st = ObservedState::default();
        capture_changes(&mut st, &None, &Some("w1".into()), "d1", 1000);
        // Rapid title churn inside the throttle window: no events…
        let evs = capture_changes(&mut st, &None, &Some("w2".into()), "d1", 2000);
        assert!(evs.is_empty());
        // …but after the window passes, a change records again.
        let evs = capture_changes(&mut st, &None, &Some("w3".into()), "d1", 1000 + TITLE_THROTTLE_MS);
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, super::super::journal::KIND_WINDOW_TITLE);
    }

    #[test]
    fn branch_switch_is_activity_level() {
        let mut st = ObservedState::default();
        capture_changes(&mut st, &Some(project("/p/a", "main", None)), &None, "d1", 1000);
        let evs = capture_changes(&mut st, &Some(project("/p/a", "feat/x", None)), &None, "d1", 2000);
        let br = evs.iter().find(|e| e.kind == super::super::journal::KIND_GIT_BRANCH).expect("branch event");
        assert_eq!(br.importance.value(), 2);
    }
}
