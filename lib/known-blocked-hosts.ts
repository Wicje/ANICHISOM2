/**
 * Single source of truth for hosts that aggressively block iframe embedding.
 *
 * These require the Continua extension (or Tauri's native webview) to render
 * in-OS. Both Power Browser and the Web App launcher must use this list so the
 * two never drift apart.
 */
export const KNOWN_BLOCKED_HOSTS = new Set([
  // Design / docs
  'figma.com', 'www.figma.com',
  'docs.google.com', 'drive.google.com',
  'notion.so', 'www.notion.so',
  'canva.com', 'www.canva.com',
  'airtable.com', 'www.airtable.com',
  'trello.com', 'www.trello.com',
  'linear.app',
  // Dev / deploy
  'github.com', 'gitlab.com',
  'vercel.com', 'app.vercel.com',
  'netlify.com', 'app.netlify.com',
  'vscode.dev',
  // Social / media
  'youtube.com', 'www.youtube.com',
  'twitter.com', 'x.com', 'www.x.com',
  'facebook.com', 'www.facebook.com',
  'instagram.com', 'www.instagram.com',
  'linkedin.com', 'www.linkedin.com',
  'reddit.com', 'www.reddit.com',
  'medium.com',
  'spotify.com', 'open.spotify.com',
  'slack.com', 'app.slack.com',
]);

/** Get the hostname of a URL, or '' on failure. */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * True if the host is known to block iframing and therefore needs the
 * extension (or Tauri) to render in-OS.
 */
export function isKnownBlocked(url: string): boolean {
  return KNOWN_BLOCKED_HOSTS.has(getHostname(url));
}

/** Whether an installed custom web app points at a known-blocked host. */
export function isCatalogItemKnownBlocked(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return KNOWN_BLOCKED_HOSTS.has(host);
  } catch {
    return false;
  }
}
