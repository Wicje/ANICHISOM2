/**
 * On-device translation — H8 feasibility-first spike.
 *
 * Pure logic, unit-tested (no Electron, no network). Verdict (see
 * docs/TRANSLATE_FEASIBILITY.md): Electron/Chromium ships NO page-translate
 * API (the Chrome Translate element needs Google API keys; Firefox
 * Translations needs its own WASM models). Honest options ranked:
 *
 *   1. Bergamot WASM (Firefox's engine, on-device, ~30–50 MB per language
 *      pair) — real on-device translation, heavy to ship. Recommended
 *      long-term path, behind an explicit per-language download.
 *   2. User-configured LibreTranslate-compatible endpoint (local LAN or
 *      self-hosted) — not on-device, but private and cheap. Shipped as an
 *      opt-in setting (default OFF, empty endpoint = disabled).
 *   3. External link-out (translate.google.com / DeepL URL) — zero privacy,
 *      offered only as an explicit user action, never automatic.
 *
 * What ships now: language detection heuristics (script + stopword signals),
 * an endpoint client shape with redaction, and a stub result type so the
 * chrome can show "unavailable offline" truthfully instead of pretending.
 */

const SUPPORTED_ENDPOINT_HINT = "http(s) LibreTranslate-compatible base URL, e.g. http://localhost:5000";

/** Script ranges that identify a language family without any model. */
function scriptOf(text) {
  const s = String(text || "");
  // Japanese mixes kanji with kana — check kana first, or kanji-heavy
  // Japanese misreads as Chinese.
  if (/[\u3040-\u30ff]/.test(s)) return "Jpan";
  if (/[\u4e00-\u9fff]/.test(s)) return "Hans"; // CJK unified (zh-leaning)
  if (/[\uac00-\ud7af]/.test(s)) return "Kore";
  if (/[\u0400-\u04ff]/.test(s)) return "Cyrl";
  if (/[\u0600-\u06ff]/.test(s)) return "Arab";
  if (/[\u0900-\u097f]/.test(s)) return "Deva";
  if (/[\u0e00-\u0e7f]/.test(s)) return "Thai";
  if (/[\u0370-\u03ff]/.test(s)) return "Grek";
  return "Latn";
}

// Tiny stopword signals for the Latin-script languages we claim to detect.
// Deliberately conservative: unknown → "unknown", never a confident lie.
const SIGNALS = [
  ["en", [" the ", " and ", " of ", " to ", " you ", " that ", " with ", " for "]],
  ["de", [" der ", " die ", " und ", " den ", " von ", " mit ", " nicht ", " ist "]],
  ["fr", [" les ", " des ", " une ", " est ", " pour ", " vous ", " avec ", " dans "]],
  ["es", [" los ", " las ", " una ", " para ", " con ", " este ", " pero ", " como "]],
  ["it", [" che ", " della ", " una ", " per ", " con ", " sono ", " come ", " dal "]],
  ["pt", [" dos ", " uma ", " para ", " com ", " como ", " mas ", " foi ", " pela "]],
  ["nl", [" van ", " een ", " het ", " met ", " voor ", " dat ", " niet ", " zijn "]],
];

/**
 * Best-effort language guess for Latin-script text. Returns a 2-letter code
 * or "unknown". Non-Latin scripts map to their dominant language family
 * conservatively (Hans→zh, Jpan→ja, Kore→ko, Cyrl→ru, Arab→ar, Deva→hi,
 * Thai→th, Grek→el); Latn with no signal → "unknown".
 */
function detectLanguage(text) {
  const raw = String(text || "");
  if (raw.trim().length < 12) return "unknown";
  const script = scriptOf(raw);
  if (script !== "Latn") {
    // Non-Latin scripts carry their own signal; require enough CJK-scale
    // content (chars, not bytes) before claiming a language.
    if (raw.replace(/\s/g, "").length < 20) return "unknown";
    return { Hans: "zh", Jpan: "ja", Kore: "ko", Cyrl: "ru", Arab: "ar", Deva: "hi", Thai: "th", Grek: "el" }[script] || "unknown";
  }
  const s = ` ${raw.toLowerCase().replace(/[^a-z\u00e4\u00f6\u00fc\u00df\u00e0-\u00ff\s]/g, " ").replace(/\s+/g, " ")} `;
  if (s.trim().length < 40) return "unknown";
  let best = null;
  let bestHits = 0;
  for (const [code, words] of SIGNALS) {
    let hits = 0;
    for (const w of words) if (s.includes(w)) hits++;
    if (hits > bestHits) { bestHits = hits; best = code; }
  }
  return bestHits >= 2 ? best : "unknown";
}

/**
 * Should the chrome offer translation for a page? Conservative: only when
 * the detected language is known AND differs from the UI locale AND the
 * page has enough text to trust the guess.
 */
function shouldOffer(pageLang, uiLocale, charCount) {
  if (!pageLang || pageLang === "unknown") return false;
  const ui = String(uiLocale || "en").slice(0, 2).toLowerCase();
  if (pageLang === ui) return false;
  return Number(charCount || 0) >= 200;
}

/** Validate a user-configured translate endpoint (http(s) URL, no query). */
function validEndpoint(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Build a LibreTranslate-compatible request (never called automatically —
 * the chrome only fires it on explicit user action). Redacts nothing (the
 * text IS the payload); the privacy story is "your endpoint, your LAN".
 */
function buildTranslateRequest(endpoint, text, source, target) {
  if (!validEndpoint(endpoint)) return { error: "no-endpoint" };
  const t = String(text || "").slice(0, 20000);
  if (!t.trim()) return { error: "empty" };
  return {
    url: `${String(endpoint).replace(/\/$/, "")}/translate`,
    body: { q: t, source: source || "auto", target: target || "en", format: "text" },
  };
}

module.exports = {
  SUPPORTED_ENDPOINT_HINT, scriptOf, detectLanguage, shouldOffer,
  validEndpoint, buildTranslateRequest,
};
