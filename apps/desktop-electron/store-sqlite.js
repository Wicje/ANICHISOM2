/**
 * Continua SQLite store — FTS5 history, same API as store.js (ADR-008 P1).
 *
 * Tries `better-sqlite3` (optionalDependency). If unavailable, falls back to
 * the JSON Store so the browser runs without native builds.
 *
 * Schema:
 *   meta(k,v) — version counters, device prefs mirror
 *   tabs(label,url,title,pinned,idx) + active in meta
 *   history(url,title,at) + history_fts(title,url) FTS5
 *   bookmarks(url,label,added_at)
 *   workspaces(name,tabs_json)
 *   snapshots(id,saved_at,tabs_json,active)
 *   sync_queue(id,op_json,at)
 */
const path = require("path");

function createJsonFallback(userDataPath) {
  const { Store } = require("./store");
  const s = new Store(userDataPath);
  s.backend = "json-fallback";
  return s;
}

function create(userDataPath) {
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch {
    return createJsonFallback(userDataPath);
  }
  const fs = require("fs");
  try { fs.mkdirSync(userDataPath, { recursive: true }); } catch {}
  const db = new Database(path.join(userDataPath, "continua.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS tabs(label TEXT PRIMARY KEY, url TEXT, title TEXT, pinned INTEGER DEFAULT 0, idx INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS history(url TEXT, title TEXT, at INTEGER);
    CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(title, url);
    CREATE TABLE IF NOT EXISTS bookmarks(url TEXT PRIMARY KEY, label TEXT, added_at INTEGER);
    CREATE TABLE IF NOT EXISTS workspaces(name TEXT PRIMARY KEY, tabs_json TEXT);
    CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY, saved_at INTEGER, tabs_json TEXT, active TEXT);
    CREATE TABLE IF NOT EXISTS sync_queue(id INTEGER PRIMARY KEY AUTOINCREMENT, op_json TEXT, at INTEGER);
  `);
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_history_at ON history(at DESC)"); } catch {}

  const get = (k, d = null) => {
    const r = db.prepare("SELECT v FROM meta WHERE k=?").get(k);
    return r ? r.v : d;
  };
  const set = (k, v) => db.prepare("INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(k, String(v));

  // migrate JSON store once
  if (!get("migrated")) {
    try {
      const { Store } = require("./store");
      const j = new Store(userDataPath);
      if (j.state.tabs?.length) {
        const tx = db.transaction(() => {
          j.state.tabs.forEach((t, i) => db.prepare("INSERT OR REPLACE INTO tabs(label,url,title,pinned,idx) VALUES(?,?,?,?,?)").run(t.label || `tab-${i}`, t.url, t.title || t.url, t.pinned ? 1 : 0, i));
          j.state.history?.slice(0, 2000).forEach(h => {
            db.prepare("INSERT INTO history(url,title,at) VALUES(?,?,?)").run(h.url, h.title || h.url, h.at);
            try { db.prepare("INSERT INTO history_fts(title,url) VALUES(?,?)").run(h.title || h.url, h.url); } catch {}
          });
          j.state.bookmarks?.forEach(b => db.prepare("INSERT OR IGNORE INTO bookmarks(url,label,added_at) VALUES(?,?,?)").run(b.url, b.label || b.url, b.added_at || Date.now()));
          Object.entries(j.state.workspaces || {}).forEach(([n, t]) => db.prepare("INSERT OR REPLACE INTO workspaces(name,tabs_json) VALUES(?,?)").run(n, JSON.stringify(t)));
          j.state.snapshots?.slice(-100).forEach(s => db.prepare("INSERT OR REPLACE INTO snapshots(id,saved_at,tabs_json,active) VALUES(?,?,?,?)").run(s.id, s.saved_at, JSON.stringify(s.tabs), s.active || null));
        });
        tx();
      }
      if (j.state.active) set("active", j.state.active);
    } catch {}
    set("migrated", "1");
  }

  const crypto = require("crypto");
  const fs2 = require("fs");
  const cfgFile = path.join(userDataPath, "config.json");
  let cfg = {};
  try { if (fs2.existsSync(cfgFile)) cfg = JSON.parse(fs2.readFileSync(cfgFile, "utf8")); } catch {}
  if (!cfg.device_id) {
    cfg.device_id = "dev-" + crypto.randomBytes(6).toString("hex");
    try { fs2.writeFileSync(cfgFile, JSON.stringify(cfg)); } catch {}
  }

  const api = {
    backend: "sqlite-fts5",
    cfg,
    state: {}, // compat: main.js reads store.state.active on restore
    _saveCfg() { try { fs2.writeFileSync(cfgFile, JSON.stringify(this.cfg)); } catch {} },
    _syncActive() { try { this.state.active = get("active"); } catch {} },

    saveSession(tabs, active) {
      const tx = db.transaction(() => {
        db.exec("DELETE FROM tabs");
        tabs.forEach((t, i) => db.prepare("INSERT INTO tabs(label,url,title,pinned,idx) VALUES(?,?,?,?,?)").run(t.label || `tab-${i}`, t.url, t.title || t.url, t.pinned ? 1 : 0, i));
        if (active !== undefined) set("active", active || "");
      });
      tx();
      this._syncActive();
      return "local-sqlite";
    },
    loadSession() {
      const rows = db.prepare("SELECT label,url,title,pinned FROM tabs ORDER BY idx").all();
      this._syncActive();
      return rows.length ? rows.map(r => ({ label: r.label, url: r.url, title: r.title, pinned: !!r.pinned })) : null;
    },
    snapshot(tabs, active) {
      const id = "snap-" + Date.now();
      db.prepare("INSERT INTO snapshots(id,saved_at,tabs_json,active) VALUES(?,?,?,?)").run(id, Date.now(), JSON.stringify(tabs), active || null);
      db.exec("DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY saved_at DESC LIMIT 100)");
      return id;
    },
    browseSessions() {
      return db.prepare("SELECT id,saved_at,tabs_json FROM snapshots ORDER BY saved_at DESC").all()
        .map(r => ({ id: r.id, saved_at: r.saved_at, tabs: JSON.parse(r.tabs_json) }));
    },
    restoreSession(id) {
      if (!id) return this.loadSession();
      const r = db.prepare("SELECT tabs_json FROM snapshots WHERE id=?").get(id);
      return r ? JSON.parse(r.tabs_json) : null;
    },
    appendHistory(url, title) {
      if (!url || !url.startsWith("http")) return;
      const at = Math.floor(Date.now() / 1000);
      db.prepare("INSERT INTO history(url,title,at) VALUES(?,?,?)").run(url, title || url, at);
      try { db.prepare("INSERT INTO history_fts(title,url) VALUES(?,?)").run(title || url, url); } catch {}
      db.exec("DELETE FROM history WHERE rowid NOT IN (SELECT rowid FROM history ORDER BY at DESC LIMIT 2000)");
    },
    getHistory() {
      return db.prepare("SELECT url,title,at FROM history ORDER BY at DESC LIMIT 500").all();
    },
    searchHistory(term) {
      if (!term) return this.getHistory().slice(0, 50);
      try {
        return db.prepare("SELECT url,title,0 AS at FROM history_fts WHERE history_fts MATCH ? LIMIT 50").all(term.replace(/["*]/g, " ").trim().split(/\s+/).map(t => `"${t}"`).join(" OR "));
      } catch {
        const t = `%${term}%`;
        return db.prepare("SELECT url,title,at FROM history WHERE title LIKE ? OR url LIKE ? ORDER BY at DESC LIMIT 50").all(t, t);
      }
    },
    clearHistory() { db.exec("DELETE FROM history"); try { db.exec("DELETE FROM history_fts"); } catch {} },
    getBookmarks() {
      return db.prepare("SELECT url,label,added_at FROM bookmarks ORDER BY added_at DESC").all()
        .map(r => ({ url: r.url, label: r.label, added_at: r.added_at }));
    },
    addBookmark(url, title) {
      db.prepare("INSERT INTO bookmarks(url,label,added_at) VALUES(?,?,?) ON CONFLICT(url) DO UPDATE SET label=excluded.label").run(url, title || url, Date.now());
      return this.getBookmarks();
    },
    removeBookmark(url) { db.prepare("DELETE FROM bookmarks WHERE url=?").run(url); return this.getBookmarks(); },
    getConfig() {
      const c = {};
      try {
        const rows = db.prepare("SELECT k,v FROM meta WHERE k IN ('search_engine','theme','homepage','autosave_interval')").all();
        rows.forEach(r => { c[r.k] = r.v; });
      } catch {}
      return {
        search_engine: c.search_engine || "google", theme: c.theme || "dark",
        homepage: c.homepage || "", autosave_interval: Number(c.autosave_interval || 2),
        vertical_tabs: c.vertical_tabs === "1" || c.vertical_tabs === true,
        bookmarks: this.getBookmarks(), history: this.getHistory().slice(0, 300),
      };
    },
    patchConfig(patch) {
      Object.entries(patch || {}).forEach(([k, v]) => {
        if (["search_engine", "theme", "homepage", "autosave_interval", "vertical_tabs", "reader_font", "reader_width", "link_preview", "speed_dial", "active_workspace"].includes(k))
          set(k, typeof v === "object" ? JSON.stringify(v) : v);
      });
      return this.getConfig();
    },
    listWorkspaces() {
      return db.prepare("SELECT name,tabs_json FROM workspaces").all()
        .map(r => ({ id: r.name, saved_at: Date.now(), tabs: JSON.parse(r.tabs_json) }));
    },
    saveWorkspace(name, tabs) {
      db.prepare("INSERT INTO workspaces(name,tabs_json) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET tabs_json=excluded.tabs_json").run(name, JSON.stringify(tabs));
      return this.listWorkspaces();
    },
    openWorkspace(name) {
      const r = db.prepare("SELECT tabs_json FROM workspaces WHERE name=?").get(name);
      return r ? JSON.parse(r.tabs_json) : null;
    },
    deleteWorkspace(name) { db.prepare("DELETE FROM workspaces WHERE name=?").run(name); return this.listWorkspaces(); },
    enqueue(op) {
      db.prepare("INSERT INTO sync_queue(op_json,at) VALUES(?,?)").run(JSON.stringify(op), Date.now());
      const n = db.prepare("SELECT COUNT(*) c FROM sync_queue").get().c;
      if (n > 500) db.exec("DELETE FROM sync_queue WHERE id NOT IN (SELECT id FROM sync_queue ORDER BY id DESC LIMIT 500)");
    },
    pendingOps() {
      return db.prepare("SELECT id,op_json FROM sync_queue ORDER BY id LIMIT 100").all().map(r => ({ _id: r.id, ...JSON.parse(r.op_json) }));
    },
    clearFlushed(n) {
      const ids = db.prepare("SELECT id FROM sync_queue ORDER BY id LIMIT ?").all(n).map(r => r.id);
      if (ids.length) db.prepare(`DELETE FROM sync_queue WHERE id IN (${ids.map(() => "?").join(",")})`).run(...ids);
    },
    queueDepth() { try { return db.prepare("SELECT COUNT(*) c FROM sync_queue").get().c; } catch { return 0; } },
  };
  api._syncActive();
  return api;
}

module.exports = { createStore: create };
