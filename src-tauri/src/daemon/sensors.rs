//! Continua Context Sensors (Rust)
//!
//! Metadata-first, privacy-preserving sensors:
//!  - git project discovery across watched roots
//!  - branch + dirty-state via the `git` CLI (no repo content is ever read)
//!  - best-effort active window title detection per platform

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct GitProject {
    pub path: String,
    pub name: String,
    pub branch: String,
    pub modified_count: u32,
    pub untracked_count: u32,
    pub last_commit_message: Option<String>,
}

fn run_git(repo: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

/// Read git metadata for a single repository directory.
pub fn read_git_state(repo: &Path) -> Option<GitProject> {
    if !repo.join(".git").exists() {
        return None;
    }

    let branch = run_git(repo, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|| "HEAD".to_string());

    let mut modified_count: u32 = 0;
    let mut untracked_count: u32 = 0;
    if let Some(status) = run_git(repo, &["status", "--porcelain"]) {
        for line in status.lines() {
            match line.trim() {
                l if l.starts_with("??") => untracked_count += 1,
                l if !l.is_empty() => modified_count += 1,
                _ => {}
            }
        }
    }

    let last_commit_message =
        run_git(repo, &["log", "-1", "--pretty=%s"]);

    Some(GitProject {
        path: repo.display().to_string(),
        name: repo
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string()),
        branch,
        modified_count,
        untracked_count,
        last_commit_message,
    })
}

/// Discover git repositories under `root` up to MAX_SCAN_DEPTH levels deep.
fn discover_repos(root: &Path) -> Vec<PathBuf> {
    let mut found = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else {
        return found;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if path.join(".git").exists() {
            found.push(path);
        }
    }
    found
}

/// Find the most recently active git project across all watch paths.
///
/// "Most recently active" = highest .git mtime, which tracks recent commits,
/// checkouts and index writes without reading any file contents.
pub fn find_active_project(watch_paths: &[String]) -> Option<GitProject> {
    let roots: Vec<PathBuf> = if watch_paths.is_empty() {
        // Sensible defaults per platform
        let home = dirs::home_dir()?;
        vec![home.join("projects"), home.join("code"), home.join("dev"), home.join("src")]
    } else {
        watch_paths.iter().map(PathBuf::from).collect()
    };

    let mut best: Option<(SystemTime, PathBuf)> = None;
    for root in roots {
        if !root.exists() {
            continue;
        }
        for repo in discover_repos(&root) {
            let stamp = fs_mtime(&repo.join(".git")).unwrap_or(UNIX_EPOCH);
            if best.as_ref().map(|(t, _)| stamp > *t).unwrap_or(true) {
                best = Some((stamp, repo));
            }
        }
        // one nested level of grouping folders (e.g. projects/work/repo)
        if let Ok(subdirs) = std::fs::read_dir(&root) {
            for sub in subdirs.flatten().take(64) {
                let sp = sub.path();
                if sp.is_dir() && !sp.join(".git").exists() {
                    for repo in discover_repos(&sp).into_iter().take(32) {
                        let stamp = fs_mtime(&repo.join(".git")).unwrap_or(UNIX_EPOCH);
                        if best.as_ref().map(|(t, _)| stamp > *t).unwrap_or(true) {
                            best = Some((stamp, repo));
                        }
                    }
                }
            }
        }
    }

    best.and_then(|(_, path)| read_git_state(&path))
}

fn fs_mtime(path: &Path) -> Option<SystemTime> {
    let meta = std::fs::metadata(path).ok()?;
    meta.modified().ok()
}

/// Best-effort active window title. Uses platform CLI tools so no fragile
/// FFI is required. Returns None when tools are unavailable.
pub fn active_window_title() -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        let attempts: [(&str, &[&str]); 2] = [
            ("xdotool", &["getactivewindow", "getwindowname"]),
            ("kdotool", &["getactivewindowname"]),
        ];
        for (bin, args) in attempts {
            if let Ok(out) = Command::new(bin).args(args).output() {
                if out.status.success() {
                    let t = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !t.is_empty() {
                        return Some(t);
                    }
                }
            }
        }
        None
    }

    #[cfg(target_os = "macos")]
    {
        let script = r#"tell application "System Events" to get name of first application process whose frontmost is true"#;
        if let Ok(out) = Command::new("osascript").arg("-e").arg(script).output() {
            if out.status.success() {
                let t = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !t.is_empty() {
                    return Some(t);
                }
            }
        }
        None
    }

    #[cfg(target_os = "windows")]
    {
        let ps = "(Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle";
        if let Ok(out) = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps])
            .output()
        {
            if out.status.success() {
                let t = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !t.is_empty() {
                    return Some(t);
                }
            }
        }
        None
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        None
    }
}
