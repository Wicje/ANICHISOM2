/**
 * Continua Context Bridge — Background Service Worker
 *
 * Captures tab context (URL, title, metadata, screenshots) and
 * syncs it to the Continua workspace via the Context Layer API.
 */

let CONTINUA_URL = 'http://localhost:3000';
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['continuaUrl'], (result) => {
    if (result.continuaUrl) CONTINUA_URL = result.continuaUrl;
    syncEmbedRules();
  });
}

// ─── Dynamic DNR Rule ────────────────────────────────────────────────────────
// The static rules.json covers localhost / 127.0.0.1 / vercel.app, but the OS
// may be served from any domain (custom domain, LAN IP, etc.). Register a
// dynamic rule that strips framing headers for frames initiated from whichever
// host the OS is actually reachable on, so Notion/Figma/GitHub/etc. embed even
// on non-whitelisted origins.

const EMBED_RULE_ID = 1001;

function embedRule() {
  let host = 'localhost';
  try {
    host = new URL(CONTINUA_URL).hostname;
  } catch (e) {
    // Invalid configured URL — fall back to localhost
  }
  return {
    id: EMBED_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'cross-origin-embedder-policy', operation: 'remove' },
        { header: 'cross-origin-opener-policy', operation: 'remove' }
      ]
    },
    condition: {
      urlFilter: '*',
      resourceTypes: ['sub_frame', 'main_frame', 'xmlhttprequest'],
      initiatorDomains: [host, 'localhost', '127.0.0.1']
    }
  };
}

async function syncEmbedRules() {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) return;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [EMBED_RULE_ID],
      addRules: [embedRule()]
    });
  } catch (e) {
    // Non-fatal: static rules still cover the common dev hosts
  }
}
syncEmbedRules();

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

    // Inject tool-specific context detection via detectors.js
    let toolContext = null;
    try {
      const toolResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: (url) => {
          // detectors.js defines DETECTORS and detectToolContext in self scope.
          // We replicate the detection logic here because executeScript runs in
          // the page context where document/window are available.
          const hostname = new URL(url).hostname;

          // Figma
          if (hostname.includes('figma.com')) {
            const fileKey = window.location.pathname.match(/file\/([^/]+)/)?.[1] || '';
            return { tool: 'figma', fileKey, fileName: document.title, isEditor: url.includes('/design/'), isPrototype: url.includes('/prototype/') };
          }
          // Claude
          if (hostname.includes('claude.ai')) {
            const msgs = document.querySelectorAll('[data-testid="message"]');
            return { tool: 'claude', conversationLength: msgs.length, lastMessagePreview: msgs.length > 0 ? msgs[msgs.length - 1].textContent?.slice(0, 500) || '' : '', isStreaming: !!document.querySelector('[data-testid="stop-button"]') };
          }
          // ChatGPT
          if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
            const msgs = document.querySelectorAll('[data-message-author-role]');
            return { tool: 'chatgpt', conversationLength: msgs.length, lastMessagePreview: msgs.length > 0 ? msgs[msgs.length - 1].textContent?.slice(0, 500) || '' : '' };
          }
          // Canva
          if (hostname.includes('canva.com')) {
            return { tool: 'canva', designName: document.title.replace(' - Canva', ''), isEditor: url.includes('/design/') };
          }
          // Adobe Express
          if (hostname.includes('express.adobe.com')) {
            return { tool: 'adobe-express', projectName: document.title.replace(' | Adobe Express', ''), isEditor: url.includes('/edit/') };
          }
          // Adobe Lightroom
          if (hostname.includes('lightroom.adobe.com')) {
            return { tool: 'adobe-lightroom', photoCount: document.querySelectorAll('[data-testid="photo-grid-item"]').length };
          }
          // Notion
          if (hostname.includes('notion.so')) {
            return { tool: 'notion', pageTitle: document.title, pageType: url.includes('/docs/') ? 'doc' : 'page' };
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
            return { tool: 'youtube', videoTitle: document.title.replace(' - YouTube', ''), channel: document.querySelector('#channel-name a')?.textContent || '', duration: document.querySelector('.ytp-time-duration')?.textContent || '' };
          }
          // Instagram
          if (hostname.includes('instagram.com')) {
            return { tool: 'instagram', isPost: url.includes('/p/'), isProfile: url.match(/instagram\.com\/[^/]+\/?$/), username: window.location.pathname.split('/').filter(Boolean)[0] || '' };
          }
          // Twitter/X
          if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            return { tool: 'twitter', tweetText: document.querySelector('[data-testid="tweetText"]')?.textContent?.slice(0, 500) || '', author: document.querySelector('[data-testid="User-Name"]')?.textContent || '' };
          }
          // Google Docs
          if (hostname.includes('docs.google.com/document')) {
            return { tool: 'google-docs', docTitle: document.title.replace(' - Google Docs', '') };
          }
          // Google Sheets
          if (hostname.includes('docs.google.com/spreadsheets')) {
            return { tool: 'google-sheets', sheetTitle: document.title.replace(' - Google Sheets', '') };
          }
          // Google Slides
          if (hostname.includes('docs.google.com/presentation')) {
            return { tool: 'google-slides', presentationTitle: document.title.replace(' - Google Slides', '') };
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
          // Vercel
          if (hostname.includes('vercel.com')) {
            return { tool: 'vercel', projectName: window.location.pathname.split('/').filter(Boolean).pop() || '' };
          }
          // Netlify
          if (hostname.includes('netlify.com')) {
            return { tool: 'netlify', siteName: window.location.pathname.split('/').filter(Boolean).pop() || '' };
          }
          // StackBlitz
          if (hostname.includes('stackblitz.com')) {
            return { tool: 'stackblitz', projectTitle: document.title };
          }
          // CodePen
          if (hostname.includes('codepen.io')) {
            return { tool: 'codepen', penTitle: document.title.replace(' - CodePen', '') };
          }
          // VS Code Web
          if (hostname.includes('vscode.dev') || hostname.includes('github.dev')) {
            return { tool: 'vscodeWeb', workspace: document.title.split('\u2014')[0]?.trim() || document.title, isEditor: true };
          }
          // Gemini
          if (hostname.includes('gemini.google.com')) {
            return { tool: 'gemini', chatTitle: document.title.replace(' - Gemini', '').replace('Google Gemini', '') };
          }
          // Perplexity
          if (hostname.includes('perplexity.ai')) {
            return { tool: 'perplexity', query: document.title.replace(' - Perplexity', '') };
          }
          // v0
          if (hostname.includes('v0.dev')) {
            return { tool: 'v0', projectTitle: document.title.replace(' - v0 by Vercel', '') };
          }
          // Replit
          if (hostname.includes('replit.com')) {
            return { tool: 'replit', replName: document.title.replace(' - Replit', '') };
          }
          // HuggingFace
          if (hostname.includes('huggingface.co')) {
            return { tool: 'huggingface', modelOrDataset: window.location.pathname.slice(1) };
          }

          return null;
        },
        args: [tab.url || ''],
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

// ─── Periodic Sync via chrome.alarms ─────────────────────────────────────────
// setInterval dies when Chrome terminates the service worker.
// chrome.alarms survives worker restarts.

const PERIODIC_ALARM = 'continua-periodic-sync';

chrome.alarms.create(PERIODIC_ALARM, { periodInMinutes: 0.5 }); // ~30 seconds (minimum is 0.5)

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PERIODIC_ALARM) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const context = await captureTabContext(tab.id);
      if (context) await syncContextToContinua(context);
    }
  } catch {
    // Alarm fire on inactive worker — non-fatal
  }
});

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
    if (typeof message.url === 'string' && message.url) {
      CONTINUA_URL = message.url;
      syncEmbedRules();
    }
    sendResponse({ success: true });
    return true;
  }
});
