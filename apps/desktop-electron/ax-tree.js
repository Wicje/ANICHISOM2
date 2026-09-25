/**
 * ax-tree.js — accessibility-tree snapshot shaping for the agent "see" tool.
 *
 * Pure logic, unit-testable (no Electron, no DOM). The host collects a
 * reduced accessibility/DOM snapshot from the live view (executeJavaScript),
 * then routes it through this module so the agent only ever receives:
 *   - finite, validated nodes (role, name, value, text, href, state),
 *   - a capped, redacted shape (no giant innerText dumps),
 *   - enough semantics to pick an act target ("button named Search").
 *
 * Security: page content is UNTRUSTED agent input. Every string is capped and
 * sanitized here; selectors/ids are never passed through verbatim — the agent
 * addresses nodes by stable snapshot node id (index path), never by page
 * selector, so page DOM can't smuggle an injection through an attribute.
 */

const MAX_NODES = 400;
const MAX_STRING = 120;
const MAX_TEXT = 4000;

/** Each snapshot node: role + accessible name + optional affordances. */
function cleanNode(n, fallbackId) {
  if (!n || typeof n !== "object") return null;
  const role = String(n.role || "unknown").toLowerCase().slice(0, 24);
  const name = String(n.name || n.label || n.textContent || "").trim().slice(0, MAX_STRING);
  const val = n.value !== undefined && n.value !== null
    ? String(n.value).slice(0, MAX_STRING) : undefined;
  const href = /^https?:\/\/[^\s]+$/i.test(String(n.href || ""))
    ? String(n.href).slice(0, 2000) : undefined;
  const visible = n.visible !== false;
  const disabled = !!n.disabled;
  const checked = n.checked === true ? true : n.checked === false ? false : undefined;
  const node = { id: fallbackId, role, name };
  if (visible === false) node.hidden = true;
  if (disabled) node.disabled = true;
  if (val !== undefined) node.value = val;
  if (checked !== undefined) node.checked = checked;
  if (href) node.href = href;
  if (Array.isArray(n.children)) node.children = [];
  if (n.edge !== undefined) node.edge = String(n.edge).slice(0, 40);
  return node;
}

/**
 * Build a compact tree from host-collected raw nodes. `raw` is an array of
 * { ...cleanNode, children: [...] } from the page. Returns { tree, count,
 * truncated }.
 */
function buildSnapshot(raw) {
  let trunc = false;
  let total = 0;
  const walk = (list, depth) => {
    if (depth > 12) { trunc = true; return []; }
    const arr = Array.isArray(list) ? list : [];
    const take = arr.slice(0, MAX_NODES);
    if (arr.length > take.length) trunc = true;
    const out = [];
    for (const n of take) {
      if (total >= MAX_NODES) { trunc = true; break; }
      const c = cleanNode(n, cleanNodeId(n.id));
      if (!c) continue;
      total++;
      if (Array.isArray(n.children)) c.children = walk(n.children, depth + 1);
      out.push(c);
    }
    return out;
  };
  const tree = walk(raw, 0);
  return { tree, count: tree.length, truncated: trunc, maxNodes: MAX_NODES };
}

/** Flatten the tree to [{id, role, name}] so the agent can address nodes. */
function index(tree) {
  const rows = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      const row = { id: n.id, role: n.role, name: n.name };
      if (n.value !== undefined) row.value = n.value;
      if (n.href) row.href = n.href;
      if (n.checked !== undefined) row.checked = n.checked;
      if (n.disabled) row.disabled = true;
      if (n.hidden) row.hidden = true;
      rows.push(row);
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  walk(tree);
  return rows;
}

/**
 * Compute one interactive affordance summary line for a node (what the agent
 * can do with it). Conservative: only well-known roles get verbs.
 */
function affordance(role) {
  switch (role) {
    case "button": case "link": return "click";
    case "textbox": case "searchbox": case "combobox": case "textarea": return "type (needs approval when value is set)";
    case "checkbox": case "menuitemcheckbox": case "switch": return "check/uncheck";
    case "radio": case "menuitemradio": return "select";
    case "option": return "choose";
    default: return "read";
  }
}

/** Sanitize a stable node id (index path) — never trust page-supplied ids. */
function cleanNodeId(id) {
  return /^\d+(\.\d+)*$/.test(String(id || "")) ? String(id).slice(0, 40) : null;
}

/** Short human summary for the top of a report. */
function summarize(tree) {
  const rows = index(tree);
  const counts = {};
  for (const r of rows) counts[r.role] = (counts[r.role] || 0) + 1;
  const editable = rows.filter((r) => ["textbox", "searchbox", "textarea", "combobox"].includes(r.role)).length;
  return {
    nodes: rows.length,
    interactive: rows.filter((r) => !r.disabled && !r.hidden && rolesInteractive(r.role)).length,
    roles: counts,
    editable,
    clickable: rows.filter((r) => ["button", "link"].includes(r.role) && !r.disabled && !r.hidden).length,
  };
}

function rolesInteractive(role) {
  return ["button", "link", "textbox", "searchbox", "textarea", "combobox", "checkbox", "radio", "menuitem", "menuitemcheckbox", "menuitemradio", "switch", "option", "tab", "listbox"].includes(role);
}

/** Extract the visible text of a node subtree (capped, trimmed lines). */
function nodeText(node, lines = 8) {
  let buf = "";
  const walk = (n, d) => {
    if (buf.length >= MAX_TEXT || d > 12) return;
    if (n.name) buf += `${n.name}\n`;
    if (Array.isArray(n.children)) for (const c of n.children) walk(c, d + 1);
  };
  walk(node, 0);
  return buf.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, lines).join(" · ");
}

module.exports = {
  MAX_NODES, MAX_STRING, MAX_TEXT,
  buildSnapshot, cleanNode, cleanNodeId, index, affordance, summarize, nodeText,
};