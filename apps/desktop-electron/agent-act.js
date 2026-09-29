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

const REASON = {
  unknownVerb: "not-a-known-action",
  badNode: "invalid-node-id",
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
  if (act.id !== undefined && act.id !== null && !/^\d+(\.\d+)*$/.test(String(act.id))) {
    return { ok: false, tier: "write", needsApproval: true, approved: false, reason: REASON.badNode };
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
  `if (!ok || !n) return { ok:false }; `;

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

module.exports = { VALID_VERBS, WRITE_VERBS, REASON, classify, guardNode, clickJs, typeJs };