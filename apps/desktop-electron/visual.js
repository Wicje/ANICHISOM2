/**
 * visual.js — planning rules for the agent's visual channel.
 *
 * The agent track's "see" was accessibility-only: structure and labels, no
 * pixels. That is the right primitive for extraction and form-filling, and the
 * wrong one for judging an interface — a full-height drawer and a compact dialog
 * are identical to an AX observer. So there is a second, bounded visual read:
 * a downscaled viewport capture returned inline.
 *
 * Bounds are the point. A screenshot of a page is data the agent could already
 * read semantically, so it is classified as a **read** (no approval). But it is
 * also a compact exfiltration channel if left unbounded, so every capture is
 * planned here: capped dimensions, a byte budget, JPEG only, viewport only.
 * Pure logic, unit-tested — the capture itself is Electron's job.
 */

/** Defaults chosen for "an agent can see the page", not "an agent can archive it". */
const DEFAULTS = {
  maxWidth: 1280,
  maxHeight: 1600,
  maxBytes: 1_500_000,
  quality: 72,
  format: "jpeg",
};

/** Integer box, floor 1. */
function clampDim(n, fallback) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Fit a capture inside the caps without upscaling.
 * @returns {{width:number, height:number, scale:number, scaled:boolean}}
 */
function fitWithin(width, height, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const w = clampDim(width, o.maxWidth);
  const h = clampDim(height, o.maxHeight);
  const capW = clampDim(o.maxWidth, DEFAULTS.maxWidth);
  const capH = clampDim(o.maxHeight, DEFAULTS.maxHeight);
  const scale = Math.min(1, capW / w, capH / h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
    scaled: scale < 1,
  };
}

/**
 * Plan a capture. `viewport` is the content area of the tab, not the window.
 * @returns {{width:number, height:number, quality:number, format:string, maxBytes:number}}
 */
function planCapture({ viewportWidth, viewportHeight, opts = {} } = {}) {
  const o = { ...DEFAULTS, ...opts };
  const fit = fitWithin(viewportWidth, viewportHeight, o);
  return {
    width: fit.width,
    height: fit.height,
    quality: clampDim(o.quality, DEFAULTS.quality),
    format: o.format === "png" ? "png" : "jpeg",
    maxBytes: clampDim(o.maxBytes, DEFAULTS.maxBytes),
    scaled: fit.scaled,
  };
}

/**
 * Verify an encoded capture against its budget.
 * @returns {{ok:boolean, bytes:number, tooBig:boolean}}
 */
function checkBudget(bytes, maxBytes = DEFAULTS.maxBytes) {
  const b = Number(bytes) || 0;
  const cap = clampDim(maxBytes, DEFAULTS.maxBytes);
  return { ok: b > 0 && b <= cap, bytes: b, tooBig: b > cap };
}

/**
 * Validate a point against the viewport. Used by the approval-gated
 * coordinate-input path: a click outside the content area is refused rather
 * than clamped, because clamping silently aims somewhere the caller did not ask
 * for — on a consent surface that would be its own bug.
 * @returns {{x:number, y:number}|null}
 */
function normalizePoint({ x, y, viewportWidth, viewportHeight }) {
  const px = Number(x);
  const py = Number(y);
  const w = Number(viewportWidth);
  const h = Number(viewportHeight);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  if (px < 0 || py < 0 || px > w || py > h) return null;
  return { x: Math.round(px), y: Math.round(py) };
}

module.exports = { DEFAULTS, fitWithin, planCapture, checkBudget, normalizePoint };