/**
 * Continua Context Bridge — Tool-Specific Context Detectors
 *
 * Each detector extracts tool-specific metadata from the page DOM.
 * Used by the background script to enrich captured context.
 */

const DETECTORS = {
  // ─── Design Tools ───────────────────────────────────────────────────────
  figma: {
    match: (url) => url.includes('figma.com'),
    extract: () => {
      const fileKey = window.location.pathname.match(/file\/([^/]+)/)?.[1] || '';
      const fileName = document.querySelector('[data-testid="file-name"]')?.textContent || document.title;
      const pageName = document.querySelector('[data-testid="page-name"]')?.textContent || '';
      return {
        tool: 'figma',
        fileKey,
        fileName,
        pageName,
        isEditor: url.includes('/design/'),
        isPrototype: url.includes('/prototype/'),
      };
    },
  },

  canva: {
    match: (url) => url.includes('canva.com'),
    extract: () => ({
      tool: 'canva',
      designName: document.title.replace(' - Canva', ''),
      isEditor: window.location.pathname.includes('/design/'),
    }),
  },

  // ─── AI Tools ───────────────────────────────────────────────────────────
  claude: {
    match: (url) => url.includes('claude.ai'),
    extract: () => {
      const messages = document.querySelectorAll('[data-testid="message"]');
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      return {
        tool: 'claude',
        conversationLength: messages.length,
        lastMessagePreview: lastMessage?.textContent?.slice(0, 500) || '',
        isStreaming: !!document.querySelector('[data-testid="stop-button"]'),
      };
    },
  },

  chatgpt: {
    match: (url) => url.includes('chat.openai.com') || url.includes('chatgpt.com'),
    extract: () => {
      const messages = document.querySelectorAll('[data-message-author-role]');
      return {
        tool: 'chatgpt',
        conversationLength: messages.length,
        lastMessagePreview: messages.length > 0
          ? messages[messages.length - 1].textContent?.slice(0, 500) || ''
          : '',
      };
    },
  },

  // ─── Adobe ──────────────────────────────────────────────────────────────
  adobeExpress: {
    match: (url) => url.includes('express.adobe.com'),
    extract: () => ({
      tool: 'adobe-express',
      projectName: document.title.replace(' | Adobe Express', ''),
      isEditor: window.location.pathname.includes('/edit/'),
    }),
  },

  adobeLightroom: {
    match: (url) => url.includes('lightroom.adobe.com'),
    extract: () => ({
      tool: 'adobe-lightroom',
      photoCount: document.querySelectorAll('[data-testid="photo-grid-item"]').length,
    }),
  },

  // ─── Project Management ─────────────────────────────────────────────────
  notion: {
    match: (url) => url.includes('notion.so'),
    extract: () => ({
      tool: 'notion',
      pageTitle: document.querySelector('.notion-page-content')?.textContent?.slice(0, 200) || document.title,
      pageType: window.location.pathname.includes('/docs/') ? 'doc' : 'page',
    }),
  },

  linear: {
    match: (url) => url.includes('linear.app'),
    extract: () => {
      const issueId = window.location.pathname.match(/\/([A-Z]+-\d+)/)?.[1] || '';
      return {
        tool: 'linear',
        issueId,
        issueTitle: document.querySelector('[data-testid="issue-title"]')?.textContent || document.title,
      };
    },
  },

  github: {
    match: (url) => url.includes('github.com'),
    extract: () => {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      return {
        tool: 'github',
        owner: pathParts[0] || '',
        repo: pathParts[1] || '',
        isIssue: pathParts[2] === 'issues',
        isPR: pathParts[2] === 'pull',
        title: document.querySelector('.js-issue-title')?.textContent || document.title,
      };
    },
  },

  // ─── Social / Media ─────────────────────────────────────────────────────
  youtube: {
    match: (url) => url.includes('youtube.com'),
    extract: () => ({
      tool: 'youtube',
      videoTitle: document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || document.title,
      channel: document.querySelector('#channel-name a')?.textContent || '',
      duration: document.querySelector('.ytp-time-duration')?.textContent || '',
    }),
  },

  instagram: {
    match: (url) => url.includes('instagram.com'),
    extract: () => ({
      tool: 'instagram',
      isPost: window.location.pathname.includes('/p/'),
      isProfile: window.location.pathname.match(/^\/[^/]+\/?$/),
      username: window.location.pathname.split('/').filter(Boolean)[0] || '',
      caption: document.querySelector('span[class*="Caption"]')?.textContent?.slice(0, 500) || '',
    }),
  },

  twitter: {
    match: (url) => url.includes('twitter.com') || url.includes('x.com'),
    extract: () => ({
      tool: 'twitter',
      tweetText: document.querySelector('[data-testid="tweetText"]')?.textContent?.slice(0, 500) || '',
      author: document.querySelector('[data-testid="User-Name"]')?.textContent || '',
    }),
  },

  // ─── Collaboration ──────────────────────────────────────────────────────
  miro: {
    match: (url) => url.includes('miro.com'),
    extract: () => ({
      tool: 'miro',
      boardName: document.title.replace(' | Miro', ''),
    }),
  },

  googleDocs: {
    match: (url) => url.includes('docs.google.com/document'),
    extract: () => ({
      tool: 'google-docs',
      docTitle: document.title.replace(' - Google Docs', ''),
      wordCount: document.querySelector('.kix-appview-editor')?.textContent?.split(/\s+/).length || 0,
    }),
  },

  googleSheets: {
    match: (url) => url.includes('docs.google.com/spreadsheets'),
    extract: () => ({
      tool: 'google-sheets',
      sheetTitle: document.title.replace(' - Google Sheets', ''),
    }),
  },

  googleSlides: {
    match: (url) => url.includes('docs.google.com/presentation'),
    extract: () => ({
      tool: 'google-slides',
      presentationTitle: document.title.replace(' - Google Slides', ''),
    }),
  },

  // ─── Development ────────────────────────────────────────────────────────
  vercel: {
    match: (url) => url.includes('vercel.com'),
    extract: () => ({
      tool: 'vercel',
      projectName: window.location.pathname.split('/').filter(Boolean).pop() || '',
    }),
  },

  netlify: {
    match: (url) => url.includes('netlify.com'),
    extract: () => ({
      tool: 'netlify',
      siteName: window.location.pathname.split('/').filter(Boolean).pop() || '',
    }),
  },

  stackblitz: {
    match: (url) => url.includes('stackblitz.com'),
    extract: () => ({
      tool: 'stackblitz',
      projectTitle: document.title,
    }),
  },

  codepen: {
    match: (url) => url.includes('codepen.io'),
    extract: () => ({
      tool: 'codepen',
      penTitle: document.title.replace(' - CodePen', ''),
    }),
  },

  vscodeWeb: {
    match: (url) => url.includes('vscode.dev') || url.includes('github.dev'),
    extract: () => ({
      tool: 'vscodeWeb',
      workspace: document.title.split('—')[0]?.trim() || document.title,
      isEditor: true,
    }),
  },

  gemini: {
    match: (url) => url.includes('gemini.google.com'),
    extract: () => ({
      tool: 'gemini',
      chatTitle: document.title.replace(' - Gemini', '').replace('Google Gemini', ''),
    }),
  },

  perplexity: {
    match: (url) => url.includes('perplexity.ai'),
    extract: () => ({
      tool: 'perplexity',
      query: document.title.replace(' - Perplexity', ''),
    }),
  },

  v0: {
    match: (url) => url.includes('v0.dev'),
    extract: () => ({
      tool: 'v0',
      projectTitle: document.title.replace(' - v0 by Vercel', ''),
    }),
  },

  replit: {
    match: (url) => url.includes('replit.com'),
    extract: () => ({
      tool: 'replit',
      replName: document.title.replace(' - Replit', ''),
    }),
  },

  huggingface: {
    match: (url) => url.includes('huggingface.co'),
    extract: () => ({
      tool: 'huggingface',
      modelOrDataset: window.location.pathname.slice(1),
    }),
  },
};

/**
 * Detect what tool the user is using and extract tool-specific context.
 */
function detectToolContext(url) {
  for (const [key, detector] of Object.entries(DETECTORS)) {
    if (detector.match(url)) {
      try {
        return detector.extract();
      } catch {
        return { tool: key, error: 'Context extraction failed' };
      }
    }
  }
  return null;
}

if (typeof self !== 'undefined') {
  self.detectToolContext = detectToolContext;
  self.DETECTORS = DETECTORS;
}
if (typeof window !== 'undefined') {
  window.detectToolContext = detectToolContext;
  window.DETECTORS = DETECTORS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectToolContext, DETECTORS };
}
