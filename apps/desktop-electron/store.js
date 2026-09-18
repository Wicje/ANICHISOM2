/**
 * Continua session store — local-first continuity (ADR-008).
 *
 * File-backed JSON today (zero native deps, <500ms restore), same method
 * shape a better-sqlite3 backend will implement. Single file:
 *   <userData>/continua-store.json  (atomic tmp+rename writes)
 *   <userData>/config.json          (device_id, token, continua_url)
 *
 * No encryption, no vault, no E2E — TLS + Supabase RLS only (privacy tax removed).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MAX_HISTORY = 2000;
const MAX_SNAPSHOTS = 100;

function atomicWrite(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

class Store {
  constructor(userDataPath, profileId) {
    // Per-profile sharding: `personal` reuses the legacy filename so existing
    // sessions migrate untouched; every other profile gets its own file.
    const legacy = !profileId || profileId === "personal" || profileId === "default";
    this.profileId = profileId || "personal";
    this.file = path.join(userDataPath, legacy ? "continua-store.json" : `continua-store-${this.profileId}.json`);
    this.cfgFile = path.join(userDataPath, "config.json");
    this.state = { tabs: [], active: null, bookmarks: [], history: [], workspaces: {}, snapshots: [], config: { search_engine: "google", theme: "dark", homepage: "", autosave_interval: 2 } };
    this.queue = [];
    this._load();
  }

  _load() {
    this.cfg = {};
    try { if (fs.existsSync(this.file)) this.state = { ...this.state, ...JSON.parse(fs.readFileSync(this.file, "utf8")) }; } catch {}
    try { if (fs.existsSync(this.cfgFile)) this.cfg = JSON.parse(fs.readFileSync(this.cfgFile, "utf8")); } catch { this.cfg = {}; }
    if (!this.cfg.device_id) { this.cfg.device_id = "dev-" + crypto.randomBytes(6).toString("hex"); this._saveCfg(); }
  }

  _save() { try { atomicWrite(this.file, this.state); } catch {} this._dirty = false; }
  /** Async debounced flush for hot paths (page loads): never block the loop. */
  _saveSoon() {
    this._dirty = true;
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      if (!this._dirty) return;
      const tmp = this.file + ".tmp";
      fs.writeFile(tmp, JSON.stringify(this.state), (err) => {
        if (err) return;
        fs.rename(tmp, this.file, () => {});
      });
      this._dirty = false;
    }, 400);
  }
  /** Synchronous flush for exit paths (quit must not lose state). */
  flush() {
    if (this._flushTimer) { clearTimeout(this._flushTimer); this._flushTimer = null; }
    if (this._dirty) this._save();
  }
  _saveCfg() { try { atomicWrite(this.cfgFile, this.cfg); } catch {} }

  // — session —
  saveSession(tabs, active) { this.state.tabs = tabs; this.state.active = active; this._save(); return "local"; }
  loadSession() { return this.state.tabs.length ? this.state.tabs : null; }
  snapshot(tabs, active) {
    this.state.snapshots.push({ id: "snap-" + Date.now(), saved_at: Date.now(), tabs, active });
    if (this.state.snapshots.length > MAX_SNAPSHOTS) this.state.snapshots = this.state.snapshots.slice(-MAX_SNAPSHOTS);
    this._save();
    return this.state.snapshots[this.state.snapshots.length - 1].id;
  }
  browseSessions() { return this.state.snapshots.slice().reverse().map(s => ({ id: s.id, saved_at: s.saved_at, tabs: s.tabs })); }
  restoreSession(id) {
    if (!id) return this.state.tabs;
    const s = this.state.snapshots.find(x => x.id === id);
    return s ? s.tabs : null;
  }

  // — history (FTS via substring, SQLite FTS later) —
  appendHistory(url, title) {
    if (!url || !url.startsWith("http")) return;
    this.state.history.unshift({ url, title: title || url, at: Math.floor(Date.now() / 1000) });
    if (this.state.history.length > MAX_HISTORY) this.state.history.length = MAX_HISTORY;
    this._saveSoon(); // hot path: async, never blocks navigation
  }
  getHistory() { return this.state.history; }
  searchHistory(term) {
    if (!term) return this.state.history.slice(0, 50);
    const t = term.toLowerCase();
    return this.state.history.filter(h => h.url.toLowerCase().includes(t) || (h.title || "").toLowerCase().includes(t)).slice(0, 50);
  }
  clearHistory() { this.state.history = []; this._saveSoon(); }

  // — bookmarks —
  getBookmarks() { return this.state.bookmarks; }
  addBookmark(url, title) {
    if (!this.state.bookmarks.find(b => b.url === url)) this.state.bookmarks.push({ label: title || url, url, added_at: Date.now() });
    this._saveSoon(); return this.state.bookmarks;
  }
  removeBookmark(url) { this.state.bookmarks = this.state.bookmarks.filter(b => b.url !== url); this._saveSoon(); return this.state.bookmarks; }

  // — config —
  getConfig() { return { ...this.state.config, bookmarks: this.state.bookmarks, history: this.state.history.slice(0, 300) }; }
  patchConfig(patch) { Object.assign(this.state.config, patch); this._saveSoon(); return this.getConfig(); }

  // — workspaces —
  listWorkspaces() { return Object.entries(this.state.workspaces).map(([name, tabs]) => ({ id: name, saved_at: Date.now(), tabs })); }
  saveWorkspace(name, tabs) { this.state.workspaces[name] = tabs; this._saveSoon(); return this.listWorkspaces(); }
  openWorkspace(name) { return this.state.workspaces[name] || null; }
  deleteWorkspace(name) { delete this.state.workspaces[name]; this._saveSoon(); return this.listWorkspaces(); }

  // — sync queue (delta ops, flushed to Supabase, TLS only) —
  enqueue(op) { this.queue.push({ ...op, device_id: this.cfg.device_id, at: Date.now() }); if (this.queue.length > 500) this.queue = this.queue.slice(-500); }
  pendingOps() { return this.queue; }
  clearFlushed(n) { this.queue = this.queue.slice(n); }
}

module.exports = { Store };
