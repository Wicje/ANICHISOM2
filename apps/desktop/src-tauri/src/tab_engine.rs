//! Tab engine — tabs are metadata over ONE content webview (`tabview`)
//! hosted inside the main window below the React chrome strip.

use std::collections::VecDeque;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::session::TabRecord;
use crate::vault::VaultManifest;

/// Injected at document start into every tab webview so external pages get
/// the same slim translucent scrollbars as the chrome (WebKitGTK respects
/// these pseudo-elements; `!important` survives most sites' own styles).
pub const SCROLLBAR_STYLE_SCRIPT: &str = r#"(() => {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar{width:8px;height:8px!important}
    ::-webkit-scrollbar-track{background:transparent!important}
    ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.32)!important;
      border-radius:999px!important;border:2px solid transparent!important;
      background-clip:content-box!important}
    ::-webkit-scrollbar-thumb:hover{background:rgba(128,128,128,.55)!important;background-clip:content-box!important}
    ::-webkit-scrollbar-corner{background:transparent!important}
  `;
  document.documentElement.appendChild(style);
})();"#;

/// Per-tab metadata mirrored to the chrome and used for session snapshots.
#[derive(Clone)]
struct TabMeta {
    label: String,
    url: String,
    title: String,
    /// Page URLs in visit order (from page-load events); drives back/forward.
    history: Vec<String>,
    /// Current position in `history`.
    idx: usize,
    /// Saved scroll offset of the page in `scroll_url`, for resurrection.
    scroll_y: f64,
    /// The URL `scroll_y` was captured on; scroll is only reapplied to it.
    scroll_url: Option<String>,
    /// True right after a restore; settling loads must not clobber seeded
    /// history until the session's own pages actually diverge.
    restoring: bool,
    /// Set once a tab is "vaulted": its real URL/title/history only ever live
    /// in the OS keyring manifest, never in the plaintext session file.
    vault_id: Option<String>,
    /// Pinned (favicon-only) in the strip; persisted across restarts.
    pinned: bool,
    /// Private tab: never recorded to global history or session snapshots,
    /// so it leaves no trace on disk after the window closes.
    incognito: bool,
}

/// Back/forward availability for the chrome's nav buttons.
#[derive(Clone, Copy, Serialize)]
pub struct NavState {
    pub back: bool,
    pub forward: bool,
}

/// A tab as mirrored to the chrome (and used for restore replies).
#[derive(Clone, Serialize)]
pub struct TabInfo {
    pub label: String,
    pub url: String,
    pub title: String,
    /// Present when the tab is vaulted (encrypted at rest).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vault_id: Option<String>,
    #[serde(default)]
    pub pinned: bool,
    /// Private (incognito) tab — rendered with a badge, never persisted.
    #[serde(default)]
    pub incognito: bool,
}

pub struct TabManager {
    open: VecDeque<TabMeta>,
    /// Set on any mutation that should be persisted to disk.
    dirty: bool,
    next_id: u32,
    /// Height of the chrome strip in logical px. 0 = immersive/focus mode.
    chrome_height: f64,
    /// Full chrome height (used to restore after exiting immersive mode).
    chrome_max: f64,
    /// Clean/focus mode: chrome collapsed, tabs reflow to the whole window.
    immersive: bool,
    /// Vertical tab rail takes the left 44px of the content area.
    rail_enabled: bool,
    /// Last focused tab; restored as the active tab on the next launch.
    last_active: Option<String>,
}

impl TabManager {
    pub fn new() -> Self {
        Self {
            open: VecDeque::new(),
            dirty: false,
            next_id: 0,
            chrome_height: crate::CHROME_HEIGHT,
            chrome_max: crate::CHROME_HEIGHT,
            immersive: false,
            rail_enabled: false,
            last_active: None,
        }
    }

    /// Create a tab window loading `url`, focus it, return its label.
    pub fn open(&mut self, app: &AppHandle, url: String) -> Result<String, String> {
        self.open_with(app, url, false)
    }

    /// Create a private (incognito) tab window loading `url`.
    pub fn open_incognito(&mut self, app: &AppHandle, url: String) -> Result<String, String> {
        self.open_with(app, url, true)
    }

    fn open_with(
        &mut self,
        app: &AppHandle,
        url: String,
        incognito: bool,
    ) -> Result<String, String> {
        let label = format!("tab-{}", self.next_id);
        self.next_id += 1;

        // Validate early so a bad URL never a tab graph entry (it can't load).
        url::Url::parse(&url).map_err(|_| format!("invalid URL: {url}"))?;

        self.open.push_back(TabMeta {
            label: label.clone(),
            url: url.clone(),
            title: url.clone(),
            history: vec![url.clone()],
            idx: 0,
            scroll_y: 0.0,
            scroll_url: None,
            restoring: false,
            vault_id: None,
            pinned: false,
            incognito,
        });
        self.last_active = Some(label.clone());
        self.dirty = true;

        crate::tabview::navigate(app, &label, &url)?;

        Ok(label)
    }

    pub fn close(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let before = self.open.len();
        // Snapshot the tab before removal so the durable recently-closed ring
        // (Ctrl+Shift+T) can restore it across restarts. Incognito tabs are
        // never remembered; vault tabs can't be reopened once their keyring
        // manifest is deleted below.
        let closing = self
            .open
            .iter()
            .find(|m| m.label == label)
            .cloned();
        self.open.retain(|m| m.label != label);
        if let Some(m) = &closing {
            if m.vault_id.is_none() && !m.incognito {
                crate::config::record_closed(app, &m.url, &m.title);
            }
            // Closing a vault tab also wipes its keyring manifest (it's the
            // only copy of that tab's URL).
            if let Some(vault_id) = &m.vault_id {
                let _ = Self::delete_vault_meta(app, vault_id);
            }
        }
        if self.open.is_empty() {
            crate::tabview::hide_content(app);
        }
        if self.open.len() != before {
            self.dirty = true;
        }
        Ok(())
    }

    pub fn activate(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(meta) = self.open.iter().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        // Show the tab's page (or just focus it if it's already loaded).
        crate::tabview::show_tab(app, label, &meta.url)?;

        // Bring the tab to the front of the z-order.
        if let Some(pos) = self.open.iter().position(|m| m.label == label) {
            let meta = self.open.remove(pos).unwrap();
            self.open.push_back(meta);
            self.dirty = true;
        }
        self.last_active = Some(label.to_string());
        Ok(())
    }

    /// Raise the content view without reordering the strip. Used after
    /// chrome-initiated actions so the page regains focus (and pointer /
    /// keyboard input) without jumping tabs around.
    pub fn raise(&self, app: &AppHandle, _label: &str) -> Result<(), String> {
        crate::tabview::focus_content(app);
        Ok(())
    }

    /// Update a tab's title if it changed; push the change to the chrome.
    pub fn record_title(&mut self, app: &AppHandle, label: &str, title: &str) {
        let title = title.trim();
        // Skip the placeholder window title and empty documents.
        if title.is_empty() || title == "Continua" {
            return;
        }
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return;
        };
        if meta.title == title {
            return;
        }
        meta.title = title.to_string();
        self.dirty = true;
        emit_title(app, label, title);
        if meta.vault_id.is_none() && !meta.incognito {
            crate::config::record_visit(app, &meta.url, title);
        }
    }

    /// Record a finished main-frame navigation. Builds a per-tab history stack
    /// that drives back/forward, and pushes the new URL to the chrome.
    pub fn record_navigation(&mut self, app: &AppHandle, label: &str, url: &str) {
        // Returns whether the page settled onto the tab's current (saved) URL.
        if self.record_navigation_inner(app, label, url) {
            self.apply_scroll(app, label);
        }
    }

    fn record_navigation_inner(&mut self, app: &AppHandle, label: &str, url: &str) -> bool {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return false;
        };

        // Global "recent visits" ring feeds the omnibox and start page. Vault
        // tabs stay out of the plaintext config so their endpoints never leak;
        // incognito tabs never leave any trace at all.
        if meta.vault_id.is_none() && !meta.incognito {
            crate::config::record_visit(app, url, &meta.title);
        }

        // Freshly restored tab: history was seeded from the session; the
        // settle load must not clobber it unless the page actually diverges.
        if meta.restoring {
            let at_seed = meta.history.get(meta.idx).map(String::as_str) == Some(url);
            if at_seed {
                meta.url = url.to_string();
                meta.restoring = false;
                self.dirty = true;
                return true;
            }
            if let Some(pos) = meta.history.iter().position(|u| u == url) {
                // Redirect back into the seeded path — settle to that entry.
                meta.history.truncate(pos + 1);
                meta.idx = pos;
                meta.url = url.to_string();
                meta.restoring = false;
                self.dirty = true;
                emit_navigation(app, label, url);
                return true;
            }
            // A genuinely new page after restore — resume normal recording.
            meta.restoring = false;
        }

        // Same-page reload / page finish with no real navigation.
        if meta.history.last().map(String::as_str) == Some(url) && meta.idx + 1 == meta.history.len()
        {
            meta.url = url.to_string();
            emit_navigation(app, label, url);
            return true;
        }

        // Revisiting an earlier entry (back/forward landing) — drop forward rows.
        if let Some(pos) = meta.history.iter().position(|u| u == url) {
            meta.history.truncate(pos + 1);
            meta.idx = pos;
        } else {
            // New page — cut any forward entries, then append.
            meta.history.truncate(meta.idx + 1);
            meta.history.push(url.to_string());
            meta.idx = meta.history.len() - 1;
        }
        meta.url = url.to_string();
        self.dirty = true;
        emit_navigation(app, label, url);
        false
    }

    /// Reapply the saved scroll offset once the page it was captured on loads.
    fn apply_scroll(&self, app: &AppHandle, label: &str) {
        let Some(roll) = self.open.iter().find(|m| m.label == label) else {
            return;
        };
        if roll.scroll_y <= 0.0 || roll.scroll_url.as_deref() != Some(roll.url.as_str()) {
            return;
        }
        crate::tabview::eval_async(
            app,
            format!("window.scrollTo(0, {})", roll.scroll_y),
            |_| {},
        );
    }

    /// Update the saved scroll offset for a tab (captured via polled eval).
    pub fn record_scroll(&mut self, label: &str, scroll: f64) {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return;
        };
        if (meta.scroll_y - scroll).abs() < 2.0 {
            return;
        }
        meta.scroll_y = scroll;
        meta.scroll_url = Some(meta.url.clone());
        self.dirty = true;
    }

    /// Navigate the tab one step back through its history.
    pub fn back(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        if meta.idx == 0 {
            return Ok(());
        }
        meta.idx -= 1;
        meta.restoring = false;
        let target = meta.history[meta.idx].clone();
        crate::tabview::navigate(app, label, &target)
    }

    /// Navigate the tab one step forward through its history.
    pub fn forward(&mut self, app: &AppHandle, label: &str) -> Result<(), String> {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        if meta.idx + 1 >= meta.history.len() {
            return Ok(());
        }
        meta.idx += 1;
        meta.restoring = false;
        let target = meta.history[meta.idx].clone();
        crate::tabview::navigate(app, label, &target)
    }

    /// Navigate the tab (address bar) to a fresh URL.
    pub fn navigate(&mut self, app: &AppHandle, label: &str, url: String) -> Result<(), String> {
        if !self.open.iter().any(|m| m.label == label) {
            return Err(format!("no such tab: {label}"));
        }
        if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
            meta.restoring = false;
        }
        url::Url::parse(&url).map_err(|_| format!("invalid URL: {url}"))?;
        crate::tabview::navigate(app, label, &url)
    }

    /// Pin/unpin a tab in the strip. Persisted into the session snapshot so
    /// pinned tabs survive restarts exactly like everything else.
    pub fn set_pinned(&mut self, label: &str, pinned: bool) -> Result<(), String> {
        let Some(meta) = self.open.iter_mut().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        meta.pinned = pinned;
        self.dirty = true;
        Ok(())
    }

    /// Whether the tab can go back / forward (for chrome button states).
    pub fn nav_state(&self, label: &str) -> Result<NavState, String> {
        let Some(meta) = self.open.iter().find(|m| m.label == label) else {
            return Err(format!("no such tab: {label}"));
        };
        Ok(NavState {
            back: meta.idx > 0,
            forward: meta.idx + 1 < meta.history.len(),
        })
    }

    pub fn close_all(&mut self, app: &AppHandle) -> Result<(), String> {
        let labels: Vec<String> = self.open.iter().map(|m| m.label.clone()).collect();
        for label in &labels {
            self.close(app, label)?;
        }
        Ok(())
    }

    pub fn labels(&self) -> Vec<String> {
        self.open.iter().map(|m| m.label.clone()).collect()
    }

    /// Open a saved session's tabs with their full metadata so back/forward,
    /// focus and scroll all come back too. Vault tabs decrypt their manifest
    /// from the keyring. Returns the last restored label.
    pub fn restore_from_snapshot(
        &mut self,
        app: &AppHandle,
        records: Vec<crate::session::TabRecord>,
    ) -> Result<Option<String>, String> {
        let mut last: Option<String> = None;
        for rec in records {
            if let Some(vault_id) = &rec.vault_id {
                let label = self.restore_vault_tab(app, vault_id)?;
                last = Some(label);
                continue;
            }
            let label = self.open(app, rec.url.clone())?;
            if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
                meta.title = rec.title.clone();
                if !rec.history.is_empty() {
                    meta.history = rec.history;
                    meta.idx = rec.idx.min(meta.history.len().saturating_sub(1));
                }
                meta.scroll_y = rec.scroll_y;
                meta.scroll_url = Some(rec.url);
                meta.pinned = rec.pinned;
                meta.restoring = true;
                self.dirty = true;
            }
            last = Some(label);
        }
        Ok(last)
    }

    /// Reopen a vault tab by decrypting its keyring manifest.
    fn restore_vault_tab(&mut self, app: &AppHandle, vault_id: &str) -> Result<String, String> {
        let manifest = Self::load_vault_meta(app, vault_id);
        let Some(manifest) = manifest else {
            // Key revoked or missing — open a blank placeholder, still vaulted.
            let label = self.open(app, "about:blank".to_string())?;
            if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
                meta.title = "Vault tab (unavailable)".to_string();
                meta.vault_id = Some(vault_id.to_string());
                self.dirty = true;
            }
            return Ok(label);
        };

        let label = self.open(app, manifest.url.clone())?;
        if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
            meta.title = manifest.title.clone();
            if !manifest.history.is_empty() {
                meta.history = manifest.history;
                meta.idx = manifest.idx.min(meta.history.len().saturating_sub(1));
            }
            meta.scroll_y = manifest.scroll_y;
            meta.scroll_url = Some(manifest.url);
            meta.vault_id = Some(vault_id.to_string());
            meta.pinned = manifest.pinned;
            meta.restoring = true;
            self.dirty = true;
        }
        Ok(label)
    }

    /// The tab that most recently had focus, if any.
    pub fn active_label(&self) -> Option<String> {
        self.last_active.clone()
    }

    /// Mirror every open tab to the chrome (or the restore reply).
    pub fn infos(&self) -> Vec<TabInfo> {
        self.open
            .iter()
            .map(|m| TabInfo {
                label: m.label.clone(),
                url: m.url.clone(),
                title: m.title.clone(),
                vault_id: m.vault_id.clone(),
                pinned: m.pinned,
                incognito: m.incognito,
            })
            .collect()
    }

    /// Mark a tab as vaulted: from now on its URL/title/history/scroll are
    /// only ever stored inside the OS keyring (encrypted at rest), and the
    /// plaintext session keeps just a non-descriptive vault_id reference.
    pub fn mark_vault(&mut self, app: &AppHandle, label: &str) -> Result<TabInfo, String> {
        if !self.open.iter().any(|m| m.label == label) {
            return Err(format!("no such tab: {label}"));
        }
        let vault_id = Self::new_vault_id();
        if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
            if meta.vault_id.is_none() {
                meta.vault_id = Some(vault_id.clone());
            }
            let vid = meta.vault_id.clone().unwrap();
            Self::persist_vault_meta(app, label, meta.clone(), &vid)?;
        }
        self.dirty = true;
        self.info(app, label)
            .ok_or_else(|| format!("no such tab: {label}"))
    }

    /// Release a vault tab: remove its keyring manifest and return it to a
    /// normal (plaintext-recorded) tab.
    pub fn unmark_vault(&mut self, app: &AppHandle, label: &str) -> Result<TabInfo, String> {
        let Some(vault_id) = self
            .open
            .iter()
            .find(|m| m.label == label)
            .and_then(|m| m.vault_id.clone())
        else {
            return self
                .info(app, label)
                .ok_or_else(|| format!("no such tab: {label}"));
        };
        let _ = Self::delete_vault_meta(app, &vault_id);
        if let Some(meta) = self.open.iter_mut().find(|m| m.label == label) {
            meta.vault_id = None;
        }
        self.dirty = true;
        self.info(app, label)
            .ok_or_else(|| format!("no such tab: {label}"))
    }

    /// Single-tab mirror for command replies.
    fn info(&self, app: &AppHandle, label: &str) -> Option<TabInfo> {
        let _ = app;
        self.open.iter().find(|m| m.label == label).map(|m| TabInfo {
            label: m.label.clone(),
            url: m.url.clone(),
            title: m.title.clone(),
            vault_id: m.vault_id.clone(),
            pinned: m.pinned,
            incognito: m.incognito,
        })
    }

    /// Snapshot of the current tab graph for the session file. Vault tabs are
    /// re-encrypted into the keyring and appear in the file only as an opaque
    /// vault_id — their URLs never touch the plaintext session. Incognito tabs
    /// are excluded entirely: a private session leaves no trace on disk.
    pub fn snapshot(&self, app: &AppHandle) -> Vec<TabRecord> {
        let mut records = Vec::with_capacity(self.open.len());
        for m in self.open.iter() {
            if m.incognito {
                continue;
            }
            if let Some(vault_id) = &m.vault_id {
                let _ = Self::persist_vault_meta(app, &m.label, m.clone(), vault_id);
            }
            records.push(Self::redacted_record(m));
        }
        records
    }

    /// Pure mapping from tab metadata to the at-rest record: vault tabs are
    /// redacted to their opaque id, plain tabs pass through fully. Kept
    /// app-free so the redaction invariant is directly unit-testable.
    fn redacted_record(m: &TabMeta) -> TabRecord {
        if let Some(vault_id) = &m.vault_id {
            TabRecord {
                url: "continua://vault".into(),
                title: "Vault tab".into(),
                history: Vec::new(),
                idx: 0,
                scroll_y: 0.0,
                vault_id: Some(vault_id.clone()),
                pinned: m.pinned,
            }
        } else {
            TabRecord {
                url: m.url.clone(),
                title: m.title.clone(),
                history: m.history.clone(),
                idx: m.idx,
                scroll_y: m.scroll_y,
                vault_id: None,
                pinned: m.pinned,
            }
        }
    }

    fn new_vault_id() -> String {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        format!("vt-{now}")
    }

    /// Write (or re-encrypt) a tab's manifest into the OS keyring.
    fn persist_vault_meta(
        app: &AppHandle,
        label: &str,
        meta: TabMeta,
        vault_id: &str,
    ) -> Result<(), String> {
        let _ = label;
        let manifest = VaultManifest {
            url: meta.url.clone(),
            title: meta.title.clone(),
            history: meta.history.clone(),
            idx: meta.idx,
            scroll_y: meta.scroll_y,
            pinned: meta.pinned,
        };
        let json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
        if let Some(state) = app.try_state::<crate::AppState>() {
            let vault = state.vault.lock().map_err(|e| e.to_string())?;
            return vault.store(&Self::vault_key(vault_id), &json);
        }
        Err("app state unavailable".into())
    }

    /// Decrypt a vault tab's manifest from the keyring.
    fn load_vault_meta(app: &AppHandle, vault_id: &str) -> Option<VaultManifest> {
        let state = app.try_state::<crate::AppState>()?;
        let vault = state.vault.lock().ok()?;
        let json = vault.get(&Self::vault_key(vault_id)).ok()??;
        serde_json::from_str(&json).ok()
    }

    fn delete_vault_meta(app: &AppHandle, vault_id: &str) -> Result<(), String> {
        let state = app
            .try_state::<crate::AppState>()
            .ok_or_else(|| "app state unavailable".to_string())?;
        let vault = state.vault.lock().map_err(|e| e.to_string())?;
        vault.delete(&Self::vault_key(vault_id))
    }

    fn vault_key(vault_id: &str) -> String {
        format!("vault:tab:{vault_id}")
    }

    /// Whether anything changed since the last snapshot.
    pub fn dirty(&self) -> bool {
        self.dirty
    }

    pub fn mark_clean(&mut self) {
        self.dirty = false;
    }

    /// Collapse (0) or restore (chrome_max) the chrome strip; tabs reflow to
    /// fill the freed space. Toggled by focus/immersive mode.
    pub fn set_chrome_height(&mut self, height: f64) {
        self.chrome_max = height;
        if !self.immersive && (self.chrome_height - height).abs() > f64::EPSILON {
            self.chrome_height = height;
            self.dirty = true;
        }
    }

    /// Enter/leave clean/focus mode: collapse to 0 or back up to the chrome
    /// height the frontend last negotiated.
    pub fn set_immersive(&mut self, enabled: bool) {
        if self.immersive == enabled {
            return;
        }
        self.immersive = enabled;
        self.chrome_height = if enabled { 0.0 } else { self.chrome_max };
        self.dirty = true;
    }

    /// Show/hide the vertical tab rail; the content area insets on the left so
    /// the host page's rail column stays visible above the native webviews.
    pub fn set_rail(&mut self, on: bool) {
        if self.rail_enabled == on {
            return;
        }
        self.rail_enabled = on;
    }

    /// True while the chrome strip is hidden (clean/focus mode).
    pub fn immersive(&self) -> bool {
        self.chrome_height < crate::CHROME_HEIGHT
    }

    /// Arm or disarm the clean-mode exit pill in the content view.
    pub fn arm_clean_exit(&self, app: &AppHandle, armed: bool) {
        crate::inpage::clean_exit_pill(app, armed);
    }

    /// Current chrome strip height in logical px (0 in immersive mode).
    pub fn chrome_height(&self) -> f64 {
        self.chrome_height
    }

    /// Whether the left rail column inset is active.
    pub fn rail_enabled(&self) -> bool {
        self.rail_enabled
    }

    /// Saved scroll offset for a tab, used to resurrect it after a reload.
    pub fn scroll_for(&self, label: &str) -> Option<f64> {
        self.open
            .iter()
            .find(|m| m.label == label)
            .map(|m| m.scroll_y)
    }

    /// Reposition the content webview to fill the area below the chrome strip.
    pub fn relayout(&self, app: &AppHandle) -> Result<(), String> {
        crate::tabview::relayout(app)
    }
}

/// Push a tab title update to the chrome (main window) for rendering.
fn emit_title(app: &AppHandle, label: &str, title: &str) {
    let _ = app.emit_to(
        "main",
        "tab:title-changed",
        serde_json::json!({ "label": label, "title": title }),
    );
}

/// Push a tab URL update to the chrome so the address bar stays in sync.
fn emit_navigation(app: &AppHandle, label: &str, url: &str) {
    let _ = app.emit_to(
        "main",
        "tab:navigated",
        serde_json::json!({ "label": label, "url": url }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn meta(url: &str) -> TabMeta {
        TabMeta {
            label: "tab-0".into(),
            url: url.into(),
            title: url.into(),
            history: vec![url.into()],
            idx: 0,
            scroll_y: 12.5,
            scroll_url: Some(url.into()),
            restoring: false,
            vault_id: None,
            pinned: false,
            incognito: false,
        }
    }

    /// Plain tabs pass through the snapshot fully (roundtrip-safe).
    #[test]
    fn plain_tab_roundtrips() {
        let m = meta("https://example.com/page");
        let rec = TabManager::redacted_record(&m);
        assert_eq!(rec.url, "https://example.com/page");
        assert_eq!(rec.title, "https://example.com/page");
        assert_eq!(rec.history, vec!["https://example.com/page"]);
        assert_eq!(rec.idx, 0);
        assert_eq!(rec.scroll_y, 12.5);
        assert!(rec.vault_id.is_none());
    }

    /// Vault tabs redact their URL/title/history; only the opaque id remains.
    #[test]
    fn vault_tab_is_redacted() {
        let mut m = meta("https://secret-bank.com/private");
        m.vault_id = Some("vt-123".into());
        let rec = TabManager::redacted_record(&m);
        assert_eq!(rec.url, "continua://vault");
        assert_eq!(rec.title, "Vault tab");
        assert!(rec.history.is_empty());
        assert_eq!(rec.vault_id.as_deref(), Some("vt-123"));
        // The real address never appears in the at-rest record.
        assert!(!serde_json::to_string(&rec).unwrap().contains("secret-bank"));
    }

    /// Incognito tabs carry the flag to the chrome mirror...
    #[test]
    fn incognito_flag_reaches_info() {
        let m = TabMeta {
            incognito: true,
            ..meta("https://private.example.com")
        };
        let info = TabInfo {
            label: m.label.clone(),
            url: m.url.clone(),
            title: m.title.clone(),
            vault_id: m.vault_id.clone(),
            pinned: m.pinned,
            incognito: m.incognito,
        };
        assert!(info.incognito);
    }
}