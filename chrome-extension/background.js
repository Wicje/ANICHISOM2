/**
 * Continua Context Bridge — Background Service Worker
 *
 * Captures tab context (URL, title, metadata, screenshots) and
 * syncs it to the Continua workspace via the Context Layer API.
 */

let CONTINUA_URL = 'http://localhost:3000';
if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
  chrome.storage.sync.get(['continuaUrl'], (result) => {
    if (result.continuaUrl) CONTINUA_URL = result.continuaUrl;
  });
}
const SYNC_INTERVAL = 30000; // Sync every 30 seconds

// Tool-specific context detectors (loaded from detectors.js via importScripts)
importScripts('detectors.js');

// ─── Tab Context Capture ────────────────────────────────────────────────────

async function captureTabContext(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return null;
    }

    // Inject content script to extract DOM context + tool-specific context
    let domContext = {};
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (tabUrl) => {
          // Extract page metadata
          const meta = {};
          document.querySelectorAll('meta[name], meta[property]').forEach(el => {
            const key = el.getAttribute('name') || el.getAttribute('property');
            const value = el.getAttribute('content');
            if (key && value) meta[key] = value;
          });

          // Extract headings
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .slice(0, 10)
            .map(h => ({ tag: h.tagName, text: h.textContent?.trim() || '' }));

          // Extract selected text
          const selection = window.getSelection()?.toString()?.slice(0, 500) || '';

          // Extract page colors (computed from key elements, capped to top 100)
          const colors = new Set();
          Array.from(document.querySelectorAll('body, header, nav, main, section, footer, button, a, h1, h2, h3'))
            .slice(0, 100)
            .forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.color && style.color !== 'rgb(0, 0, 0)') colors.add(style.color);
              if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(style.backgroundColor);
            });

          return {
            title: document.title,
            description: meta['og:description'] || meta.description || '',
            image: meta['og:image'] || '',
            author: meta.author || '',
            keywords: meta.keywords || '',
            headings,
            selectedText: selection,
            colors: Array.from(colors).slice(0, 20),
            lang: document.documentElement.lang || 'en',
            wordCount: document.body?.textContent?.split(/\s+/).length || 0,
          };
        },
        args: [tab.url || ''],
      });

      if (results?.[0]?.result) {
        domContext = results[0].result;
      }
    } catch {
      // Content script injection failed (restricted page)
    }

    // Inject tool-specific context detection
    let toolContext = null;
    try {
      const toolResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const url = window.location.href;
          const hostname = window.location.hostname;

          // Figma
          if (hostname.includes('figma.com')) {
            const fileKey = window.location.pathname.match(/file\/([^/]+)/)?.[1] || '';
            return { tool: 'figma', fileKey, fileName: document.title, isEditor: url.includes('/design/') };
          }
          // Claude
          if (hostname.includes('claude.ai')) {
            const msgs = document.querySelectorAll('[data-testid="message"]');
            return { tool: 'claude', conversationLength: msgs.length, lastMessage: msgs.length > 0 ? msgs[msgs.length - 1].textContent?.slice(0, 500) || '' : '' };
          }
          // ChatGPT
          if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
            const msgs = document.querySelectorAll('[data-message-author-role]');
            return { tool: 'chatgpt', conversationLength: msgs.length };
          }
          // Canva
          if (hostname.includes('canva.com')) {
            return { tool: 'canva', designName: document.title.replace(' - Canva', ''), isEditor: url.includes('/design/') };
          }
          // Adobe Express
          if (hostname.includes('express.adobe.com')) {
            return { tool: 'adobe-express', projectName: document.title.replace(' | Adobe Express', ''), isEditor: url.includes('/edit/') };
          }
          // Notion
          if (hostname.includes('notion.so')) {
            return { tool: 'notion', pageTitle: document.title, isPage: url.includes('/notion.so/') };
          }
          // Linear
          if (hostname.includes('linear.app')) {
            const issueId = window.location.pathname.match(/\/([A-Z]+-\d+)/)?.[1] || '';
            return { tool: 'linear', issueId, issueTitle: document.title };
          }
          // GitHub
          if (hostname.includes('github.com')) {
            const parts = window.location.pathname.split('/').filter(Boolean);
            return { tool: 'github', owner: parts[0] || '', repo: parts[1] || '', isIssue: parts[2] === 'issues', isPR: parts[2] === 'pull' };
          }
          // YouTube
          if (hostname.includes('youtube.com')) {
            return { tool: 'youtube', videoTitle: document.title.replace(' - YouTube', ''), channel: '' };
          }
          // Instagram
          if (hostname.includes('instagram.com')) {
            return { tool: 'instagram', isPost: url.includes('/p/'), username: window.location.pathname.split('/').filter(Boolean)[0] || '' };
          }
          // Twitter/X
          if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            return { tool: 'twitter', tweetText: document.querySelector('[data-testid="tweetText"]')?.textContent?.slice(0, 500) || '' };
          }
          // Google Docs
          if (hostname.includes('docs.google.com/document')) {
            return { tool: 'google-docs', docTitle: document.title.replace(' - Google Docs', '') };
          }
          // Google Sheets
          if (hostname.includes('docs.google.com/spreadsheets')) {
            return { tool: 'google-sheets', sheetTitle: document.title.replace(' - Google Sheets', '') };
          }
          // Miro
          if (hostname.includes('miro.com')) {
            return { tool: 'miro', boardName: document.title.replace(' | Miro', '') };
          }
          // Framer
          if (hostname.includes('framer.com') || hostname.includes('framerusercontent.com')) {
            return { tool: 'framer', siteName: document.title };
          }
          // Spotify
          if (hostname.includes('spotify.com')) {
            return { tool: 'spotify', track: document.title.replace(' - Spotify', '') };
          }

          return null;
        },
      });

      if (toolResults?.[0]?.result) {
        toolContext = toolResults[0].result;
      }
    } catch {
      // Tool detection failed — non-fatal
    }

    return {
      url: tab.url,
      title: tab.title || '',
      favIconUrl: tab.favIconUrl || '',
      active: tab.active,
      ...domContext,
      toolContext,
      capturedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Sync to Continua ───────────────────────────────────────────────────────

async function syncContextToContinua(context) {
  try {
    // Store in chrome.storage for the popup to display
    const existing = await chrome.storage.local.get('continuaContext');
    const contexts = existing.continuaContext || [];
    contexts.unshift(context);

    // Keep last 50 entries
    if (contexts.length > 50) contexts.length = 50;

    await chrome.storage.local.set({ continuaContext: contexts });

    // Try to push to Continua API
    try {
      await fetch(`${CONTINUA_URL}/api/context/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'browser',
          data: {
            tabContext: {
              url: context.url,
              title: context.title,
              selectedText: context.selectedText,
              colors: context.colors,
              headings: context.headings,
              capturedAt: context.capturedAt,
            },
          },
        }),
        credentials: 'include',
      });
    } catch {
      // Continua not running — context stored locally only
    }
  } catch {
    // Storage error — non-fatal
  }
}

// ─── Tab Tracking ───────────────────────────────────────────────────────────

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const context = await captureTabContext(activeInfo.tabId);
  if (context) await syncContextToContinua(context);
});

// Track tab updates (URL changes, navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    const context = await captureTabContext(tabId);
    if (context) await syncContextToContinua(context);
  }
});

// ─── Periodic Sync ──────────────────────────────────────────────────────────

setInterval(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const context = await captureTabContext(tab.id);
    if (context) await syncContextToContinua(context);
  }
}, SYNC_INTERVAL);

// ─── Message Handling ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'captureNow') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        const context = await captureTabContext(tabs[0].id);
        if (context) {
          await syncContextToContinua(context);
          sendResponse({ success: true, context });
        } else {
          sendResponse({ success: false, error: 'Could not capture tab context' });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'getContexts') {
    chrome.storage.local.get('continuaContext').then(data => {
      sendResponse({ contexts: data.continuaContext || [] });
    });
    return true;
  }

  if (message.type === 'setContinuaUrl') {
    // Store custom Continua URL
    chrome.storage.local.set({ continuaUrl: message.url });
    sendResponse({ success: true });
    return true;
  }
});
