/**
 * Single source of truth for hosts that aggressively block iframe embedding.
 *
 * These require the Continua extension (or Tauri's native webview) to render
 * in-OS. Both Power Browser and the Web App launcher must use this list so the
 * two never drift apart.
 */
export const KNOWN_BLOCKED_HOSTS = new Set([
  // Design / creative
  'figma.com', 'www.figma.com',
  'canva.com', 'www.canva.com',
  'spline.design', 'app.spline.design',
  'rive.app', 'editor.rive.app',
  'miro.com', 'www.miro.com',
  // Docs & productivity
  'docs.google.com', 'drive.google.com', 'workspace.google.com',
  'notion.so', 'www.notion.so',
  'airtable.com', 'www.airtable.com',
  'trello.com', 'www.trello.com',
  'asana.com', 'app.asana.com',
  'linear.app',
  'app.grammarly.com', 'grammarly.com',
  'scrivener.com', 'literatureandlatte.com', 'www.literatureandlatte.com',
  '750words.com', 'www.750words.com',
  // Dev & Cloud IDEs
  'github.com', 'codespaces.new', 'gitlab.com',
  'replit.com',
  'web.postman.co', 'postman.com',
  'vercel.com', 'app.vercel.com',
  'netlify.com', 'app.netlify.com',
  'vscode.dev',
  // Student & Reference
  'quizlet.com', 'www.quizlet.com',
  'wolframalpha.com', 'www.wolframalpha.com',
  'mendeley.com', 'www.mendeley.com',
  'forestapp.cc', 'www.forestapp.cc',
  // Social & communication
  'slack.com', 'app.slack.com',
  'discord.com',
  'youtube.com', 'www.youtube.com',
  'twitter.com', 'x.com', 'www.x.com',
  'facebook.com', 'www.facebook.com',
  'instagram.com', 'www.instagram.com',
  'linkedin.com', 'www.linkedin.com',
  'reddit.com', 'www.reddit.com',
  'medium.com',
  'spotify.com', 'open.spotify.com',
  // Search engines (all send X-Frame-Options: SAMEORIGIN — must proxy/extension)
  'duckduckgo.com', 'www.duckduckgo.com',
  'google.com', 'www.google.com',
  'bing.com', 'www.bing.com',
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
