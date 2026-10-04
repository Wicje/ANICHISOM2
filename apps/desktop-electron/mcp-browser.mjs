#!/usr/bin/env node
/**
 * mcp-browser.mjs — dependency-free stdio MCP server for the Continua agent
 * track. Speaks JSON-RPC 2.0 over stdin/stdout (one object per line) and
 * forwards tool calls to the Electron host's loopback bridge.
 *
 * No SDK: no @modelcontextprotocol, no express, no puppeteer — just node
 * stdlib (http, fs, os, readline). The host writes agent-bridge.json
 * (port + token) next to userData and under ~/.continua/; this server reads
 * it, then talks to 127.0.0.1 only.
 *
 * Tools: see_tab / act_tab / debrief / list_tabs.
 *
 * Security:
 *   - connects only to 127.0.0.1 with the per-boot token (the file includes
 *     it; treat that file as a credential),
 *   - act_tab mirrors the host approval gate: writes (click/type/…) return
 *     needsApproval unless you deliberately pass approve=true. The guardrail
 *     only works if the harness does NOT auto-approve from page content —
 *     see agent policy in docs/AGENT_TRACK.md.
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const PROTOCOL_VERSION = "2025-03-26";
const SERVER = { name: "continua-browser", version: "0.5.0" };

function bridgeFileCandidates() {
  const out = [];
  if (process.env.CONTINUA_BRIDGE_FILE) out.push(process.env.CONTINUA_BRIDGE_FILE);
  out.push(path.join(os.homedir(), ".continua", "agent-bridge.json"));
  if (process.platform === "darwin") {
    out.push(path.join(os.homedir(), "Library", "Application Support", "continua", "agent-bridge.json"));
  } else if (process.platform === "win32") {
    out.push(path.join(process.env.APPDATA || os.homedir(), "continua", "agent-bridge.json"));
  } else {
    out.push(path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "continua", "agent-bridge.json"));
  }
  return out;
}

function loadBridge() {
  for (const p of bridgeFileCandidates()) {
    try {
      const info = JSON.parse(fs.readFileSync(p, "utf8"));
      if (typeof info.port === "number" && typeof info.token === "string" && info.port > 0) return { host: "127.0.0.1", port: info.port, token: info.token };
    } catch { /* keep looking */ }
  }
  return null;
}

function rpc(url, method, params, token) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ error: { message: "bridge-timeout" } }), 15000);
    const req = http.request(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    }, (res) => {
      let body = "";
      res.on("data", (c) => { if (body.length < 4e6) body += c; });
      res.on("end", () => {
        clearTimeout(timeout);
        try { resolve(JSON.parse(body || "{}")); }
        catch { resolve({ error: { message: "bad-bridge-response" } }); }
      });
    });
    req.on("error", () => { clearTimeout(timeout); resolve({ error: { message: "bridge-unreachable" } }); });
    req.end(JSON.stringify({ method, params }));
  });
}

const TOOLS = [
  {
    name: "see_tab",
    description:
      "Reduced a11y snapshot of the active (or named) tab: summary, indexed nodes with role/name/value/href. " +
      "Node ids are stable index-paths used by act_tab.",
    inputSchema: { type: "object", properties: { label: { type: "string", description: "optional tab label" } } },
  },
  {
    name: "act_tab",
    description:
      "Perform an action on the active tab. Read verbs (focus, scroll) run free. Write verbs (click, type, " +
      "select, check, uncheck, press) are gated by the host's trust boundary: they return needsApproval with a " +
      "requestId and nothing happens. A human decides in the browser; when they approve, the host mints a " +
      "single-use grant for that exact action and you retry with that grant. Do NOT attempt to approve your own " +
      "writes — there is no flag that does it, by design (ADR-012).",
    inputSchema: {
      type: "object",
      properties: {
        verb: { type: "string", enum: ["click", "type", "select", "check", "uncheck", "press", "focus", "scroll"] },
        id: { type: "string", description: "node id from see_tab, e.g. '0.2'" },
        value: { type: "string", description: "text for type" },
        grant: {
          type: "object",
          description: "a human-issued grant from a previous needsApproval response",
          properties: { id: { type: "string" }, op: { type: "string" }, fp: { type: "string" } },
        },
      },
      required: ["verb", "id"],
    },
  },
  {
    name: "pending_approvals",
    description: "Writes waiting for a human decision (id, action, tab, url, fingerprint). Poll this after needsApproval.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "audit_log",
    description:
      "The tamper-evident record of every automated action the host considered: entries (hash-chained), chain " +
      "verification state, and a summary. Use it to report exactly what was done and what was denied.",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "tail size, default 100" } } },
  },
  {
    name: "debrief",
    description: "Session debrief: deterministic summary + action items (top sites, unfinished input, files).",
    inputSchema: { type: "object", properties: { mode: { type: "string", enum: ["short", "long"], description: "long adds resume-order hints" } } },
  },
  {
    name: "list_tabs",
    description: "List open tabs (label, url, title, container).",
    inputSchema: { type: "object", properties: {} },
  },
];

function handleCall(bridge, tool, args, id) {
  switch (tool) {
    case "list_tabs": return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "list_tabs", {}, bridge.token);
    case "see_tab": return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "observe_tab", { label: args?.label ?? null }, bridge.token);
    case "debrief": return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "debrief_session", { mode: args?.mode || "long" }, bridge.token);
    case "act_tab": {
      // `grant`, never `approved` — the host ignores a self-supplied approval.
      return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "act_tab", {
        verb: String(args?.verb || "").toLowerCase(),
        id: args?.id,
        value: args?.value ?? null,
        grant: args?.grant ?? null,
      }, bridge.token).catch(() => ({ error: { message: "bridge-unreachable" } }));
    }
    case "pending_approvals": return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "pending_approvals", {}, bridge.token);
    case "audit_log": return rpc(`http://${bridge.host}:${bridge.port}/rpc`, "audit_log", { limit: args?.limit ?? null }, bridge.token);
    default: return Promise.resolve({ error: { message: `unknown-tool:${tool}` } });
  }
}

function respond(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

const rl = readline.createInterface({ input: process.stdin });
let bridge = loadBridge();

rl.on("line", (line) => {
  let req;
  try { req = JSON.parse(line); }
  catch {
    respond({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse-error" } });
    return;
  }
  const { id, method, params = {} } = req;

  if (method === "initialize") {
    return respond({ jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER } });
  }
  if (method === "notifications/initialized" || req.method?.startsWith("notifications/")) return;
  if (method === "ping") return respond({ jsonrpc: "2.0", id, result: {} });

  if (method === "tools/list") return respond({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

  if (method === "tools/call") {
    if (!bridge) bridge = loadBridge();
    if (!bridge) return respond({ jsonrpc: "2.0", id, error: { code: -32000, message: "no-agent-bridge — start Continuua Desktop first" } });
    handleCall(bridge, params?.name, params?.arguments, id).then((r) => {
      if (r?.error) return respond({ jsonrpc: "2.0", id, error: { code: -32000, message: String(r.error.message || r.error) } });
      const body = r?.result !== undefined ? r.result : r;
      respond({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] } });
    });
    return;
  }

  respond({ jsonrpc: "2.0", id, error: { code: -32601, message: `method-not-found:${method}` } });
});

setInterval(() => { if (!bridge) bridge = loadBridge(); }, 5000);
process.stdin.on("end", () => process.exit(0));