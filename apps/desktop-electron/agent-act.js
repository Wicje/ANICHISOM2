/**
 * agent-act.js — action manager for the agent "work" tool.
 *
 * Pure logic, unit-testable. Turns an agent intent (verb + node id + value)
 * into a whitelisted, approval-gated, injection-safe action plan. The host
 * executes the emitted JS template (which embeds only JSON.stringify'd
 * values), never page-provided snippets.
 *
 * Security posture (policy):
 *   - reads (focus, scroll, observe) are free,
 *   - every mutating verb (click, type, select, check, uncheck, press)
 *     requires user approval by default — page content can never auto-approve,
 *   - node ids are validated index-paths only (never page-supplied selectors),
 *   - typed values are embedded with JSON.stringify (string-literal safe).
 */

/** Allowed verbs the agent may attempt. Unknown verbs are rejected outright. */
const VALID_VERBS = ["click", "type", "select", "check", "uncheck", "press", "focus", "scroll"];

/** Verbs that mutate the page → need approval. focus/scroll are read-class. */
const WRITE_VERBS = new Set(["click", "type", "select", "check", "uncheck", "press"]);

/** press targets a named key only — no arbitrary key chords through agents. */
const PRESS_KEYS = new Set(["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]);

const REASON = {
  unknownVerb: "not-a-known-action",
  badNode: "invalid-node-id",
  badKey: "invalid-key",
  writeNeedsApproval: "write-action-needs-approval",
  disabledNode: "node-disabled",
  pageAutoApprove: "page-content-cannot-approve",
};

/**
 * Classify an agent action.
 * @param {{verb:string, id?:string, value?:string}} act
 * @param {{approved?:boolean, auto?:boolean}} ctx — whether a user approved
 *        this exact action; `ctx.auto` guards against page-driven auto-approval
 *        (only the UI can set approved=true; see REASON.pageAutoApprove).
 * @returns {{ok:boolean, tier:"read"|"write", needsApproval:boolean,
 *            approved:boolean, reason?:string}}
 */
function classify(act, ctx = {}) {
  const verb = String(act?.verb || "").toLowerCase();
  if (!VALID_VERBS.includes(verb)) return { ok: false, tier: "write", needsApproval: true, approved: false, reason: REASON.unknownVerb };
  // Index-paths only, bounded: no 1000-digit segments, no deep walks that turn
  // executeJavaScript into a DoS string. Mirrors ax-tree cleanNodeId (40 chars).
  if (act.id !== undefined && act.id !== null) {
    const s = String(act.id);
    const parts = s.split(".");
    const bounded = s.length <= 64 && parts.length <= 12 && parts.every((p) => /^\d{1,6}$/.test(p) && Number(p) < 1000000);
    if (!bounded) {
      return { ok: false, tier: "write", needsApproval: true, approved: false, reason: REASON.badNode };
    }
  }
  // press names one key from the allowlist — anything else is not an action.
  if (verb === "press" && !PRESS_KEYS.has(String(act?.value ?? ""))) {
    return { ok: false, tier: "write", needsApproval: true, approved: false, reason: REASON.badKey };
  }
  const tier = WRITE_VERBS.has(verb) ? "write" : "read";
  if (tier === "read") return { ok: true, tier, needsApproval: false, approved: true };
  // write tier — approval must come from the UI/host, never auto-flowed from page text
  const approved = !!(ctx.approved && !ctx.auto);
  return { ok: true, tier, needsApproval: !approved, approved, reason: approved ? undefined : REASON.writeNeedsApproval };
}

/** Validate an id path + verb against one snapshot row. */
function guardNode(act, node) {
  if (!node) return { ok: false, reason: REASON.badNode };
  if (node.disabled) return { ok: false, reason: REASON.disabledNode };
  return { ok: true };
}

/** Shared walker template: children of a node, starting from [document.body]. */
const WALK_JS = (dir) =>
  `let n = null, kids = [document.body], ok = true; ` +
  `const st = ${dir}; for (let d = 0; d < st.length; d++) { if (!kids || Number(st[d]) >= kids.length) { ok = false; break; } ` +
  `n = kids[Number(st[d])]; kids = n ? n.querySelectorAll(':scope > *') : []; } ` +
  `if (!ok || !n) return { ok:false }; ` +
  // The snapshot may be stale (page mutated between see and act): a disabled
  // control must refuse at execution time, not just at classify time.
  `if (n.disabled || (n.getAttribute && n.getAttribute('aria-disabled') === 'true')) return { ok:false, reason:'node-disabled' }; `;

/**
 * Emit the host JS for a click: re-walk the snapshot index-path and .click().
 * Numbers only — each element of `path` passed as a JSON-literal number in a
 * string array, so the page can never inject code through a node id.
 */
function clickJs(path) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  const js =
    `(() => { ${WALK_JS(dir)}` +
    `n.scrollIntoView({ block:'center', inline:'nearest' }); ` +
    `n.click(); return { ok:true, tag: n.tagName, href: n.href || null }; })()`;
  return js;
}

/** Emit the host JS for typing: focus the node and set value + dispatch input. */
function typeJs(path, value) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  const v = JSON.stringify(String(value ?? ""));
  const js =
    `(() => { ${WALK_JS(dir)}` +
    `n.focus(); ` +
    `const proto = n instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; ` +
    `const setter = Object.getOwnPropertyDescriptor(proto, 'value').set; ` +
    `if (setter) setter.call(n, ${v}); else n.value = ${v}; ` +
    `n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return { ok:true, value: n.value }; })()`;
  return js;
}

/** Emit focus: move keyboard focus to the node. Read-class, no mutation. */
function focusJs(path) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  return `(() => { ${WALK_JS(dir)}n.focus(); return { ok:true, tag: n.tagName }; })()`;
}

/** Emit scroll: bring the node into view. Read-class, no mutation. */
function scrollJs(path) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  return `(() => { ${WALK_JS(dir)}n.scrollIntoView({ block:'center', inline:'nearest' }); return { ok:true, tag: n.tagName }; })()`;
}

/** Emit check/uncheck: toggle a checkbox or radio. Runtime role-checked. */
function checkJs(path, checked) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  const want = checked ? "true" : "false";
  return (
    `(() => { ${WALK_JS(dir)}` +
    `const t = (n.getAttribute && n.getAttribute('type')) || ''; ` +
    `if (!((n.tagName === 'INPUT' && (t === 'checkbox' || t === 'radio')))) return { ok:false, reason:'wrong-role' }; ` +
    `n.checked = ${want}; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); ` +
    `return { ok:true, checked: n.checked }; })()`
  );
}

/**
 * Emit select: choose the option whose value or visible text matches.
 * Runtime role-checked against SELECT; no match is ok:false, never a guess.
 */
function selectJs(path, value) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  const v = JSON.stringify(String(value ?? ""));
  return (
    `(() => { ${WALK_JS(dir)}` +
    `if (n.tagName !== 'SELECT') return { ok:false, reason:'wrong-role' }; ` +
    `const want = ${v}; let idx = -1; ` +
    `for (let i = 0; i < n.options.length; i++) { if (n.options[i].value === want || (n.options[i].text || '').trim() === want.trim()) { idx = i; break; } } ` +
    `if (idx < 0) return { ok:false, reason:'no-such-option' }; ` +
    `n.selectedIndex = idx; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); ` +
    `return { ok:true, selected: n.options[idx].value }; })()`
  );
}

/**
 * Emit press: dispatch a named key on the node. The key allowlist is enforced
 * host-side in classify(); the emitter re-checks because defense in depth is
 * cheap and emitted strings are the trust edge.
 */
const PRESS_KEYS_JS = [...PRESS_KEYS];
function pressJs(path, key) {
  const dir = JSON.stringify(path.map((i) => String(Number(i))));
  const k = JSON.stringify(String(key ?? ""));
  const allow = JSON.stringify(PRESS_KEYS_JS);
  return (
    `(() => { ${WALK_JS(dir)}` +
    `const key = ${k}; if (!${allow}.includes(key)) return { ok:false, reason:'invalid-key' }; ` +
    `for (const type of ['keydown', 'keypress', 'keyup']) n.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true })); ` +
    `return { ok:true, key }; })()`
  );
}

module.exports = { VALID_VERBS, WRITE_VERBS, PRESS_KEYS: [...PRESS_KEYS], REASON, classify, guardNode, clickJs, typeJs, focusJs, scrollJs, checkJs, selectJs, pressJs };