/**
 * Read-aloud (medium) — page text-to-speech via the renderer's
 * speechSynthesis (no dependency, works offline with OS voices).
 *
 * Pure logic, unit-tested (no Electron). The host extracts article text with
 * the reader extractor, chunks it here, and speaks chunk-by-chunk from the
 * main world so Stop works even when the page navigates. Chunking keeps each
 * utterance under the platform length limits where voices cut off (~200
 * chars is the safe boundary for en-US voices).
 */

const MAX_CHUNK = 200;

/**
 * Split text into speakable chunks: sentence boundaries first, then word
 * boundaries, never mid-word unless a single token exceeds the cap.
 */
function chunkText(text, max = MAX_CHUNK) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [clean];
  const out = [];
  let cur = "";
  const push = (s) => { if (s.trim()) out.push(s.trim()); };
  for (const sent of sentences) {
    const s = sent.trim();
    if (!s) continue;
    if ((cur + " " + s).trim().length <= max) {
      cur = (cur + " " + s).trim();
      continue;
    }
    push(cur);
    cur = "";
    if (s.length <= max) {
      cur = s;
      continue;
    }
    // Long sentence: split on words.
    let line = "";
    for (const w of s.split(" ")) {
      if ((line + " " + w).trim().length <= max) {
        line = (line + " " + w).trim();
      } else {
        push(line);
        line = w;
        while (line.length > max) {
          push(line.slice(0, max));
          line = line.slice(max);
        }
      }
    }
    cur = line;
  }
  push(cur);
  return out.filter(Boolean);
}

/** Clamp a speech rate into the safe range. */
function clampRate(rate) {
  const r = Number(rate);
  if (!Number.isFinite(r)) return 1;
  return Math.min(2, Math.max(0.5, r));
}

module.exports = { MAX_CHUNK, chunkText, clampRate };
