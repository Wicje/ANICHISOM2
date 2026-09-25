/**
 * Tracker-query stripping + HTTPS-Only upgrade — pure logic, unit-tested
 * (no Electron imports). Wired into the shields onBeforeRequest handler.
 */

// Exact query keys that only ever carry click/ad attribution. Deliberately
// conservative: functional keys like `ref`, `q`, `id`, `page` are untouched.
const TRACKER_PARAMS = new Set([
  // Meta / Facebook
  "fbclid", "fb_action_ids", "fb_action_types", "fb_source", "fb_ref",
  // Google ads
  "gclid", "gbraid", "wbraid", "gclsrc", "dclid",
  // Microsoft / TikTok / Twitter / Yahoo / Mailchimp
  "msclkid", "ttclid", "twclid", "yclid", "mc_cid", "mc_eid", "mc_tc",
  // Oracle Eloqua / Vero / Marketo / Matomo / Piwik / Custom
  "oly_anonymous_id", "oly_enc_id", "vero_conv", "vero_id", "mkt_tok",
  "pk_campaign", "pk_keyword", "pk_kwd",
  "piwik_campaign", "piwik_kwd", "matomo_campaign", "matomo_kwd",
  "stm_source", "stm_medium", "stm_campaign",
  // Misc share/click trackers
  "_openstat", "igshid", "epik",
  "sc_campaign", "sc_channel", "sc_content", "sc_medium", "sc_trk",
]);
// Prefix families (matched case-insensitively): the whole utm_* zoo.
const TRACKER_PREFIXES = ["utm_", "utm-"];

function isTrackerKey(key) {
  const k = String(key || "").toLowerCase();
  if (TRACKER_PARAMS.has(k)) return true;
  return TRACKER_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Remove attribution params from an http(s) URL.
 * @returns {url, removed} when anything was stripped, else null.
 */
function stripTrackingParams(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const removed = [];
  for (const key of [...u.searchParams.keys()]) {
    if (isTrackerKey(key)) {
      removed.push(key);
      u.searchParams.delete(key);
    }
  }
  if (!removed.length) return null;
  return { url: u.toString(), removed };
}

/**
 * HTTPS-Only upgrade for an http: URL, or null when it must be left alone
 * (already https, loopback/LAN, .local, .onion, IP literals — none of those
 * can be blindly upgraded).
 */
function httpsUpgradeable(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:") return null;
  const host = (u.hostname || "").toLowerCase();
  if (!host || host === "localhost") return null;
  if (host.endsWith(".local") || host.endsWith(".onion") || host.endsWith(".localhost")) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null; // IPv4 (usually LAN)
  if (host.includes(":")) return null; // IPv6 literal
  u.protocol = "https:";
  if (u.port === "80") u.port = "";
  const out = u.toString();
  return out === rawUrl ? null : out;
}

module.exports = { stripTrackingParams, httpsUpgradeable, isTrackerKey };
