/**
 * Continua Context Bridge — Popup Script
 */

const continuaUrlInput = document.getElementById('continuaUrl');
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');
const contextList = document.getElementById('contextList');

// Load saved URL
chrome.storage.local.get('continuaUrl', (data) => {
  if (data.continuaUrl) {
    continuaUrlInput.value = data.continuaUrl;
  }
});

// Save URL on change
continuaUrlInput.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'setContinuaUrl', url: continuaUrlInput.value });
});

// Capture button
captureBtn.addEventListener('click', () => {
  captureBtn.textContent = 'Capturing...';
  captureBtn.disabled = true;

  chrome.runtime.sendMessage({ type: 'captureNow' }, (response) => {
    captureBtn.textContent = 'Capture Current Tab';
    captureBtn.disabled = false;

    if (response?.success) {
      loadContexts();
    }
  });
});

// Load contexts
function loadContexts() {
  chrome.runtime.sendMessage({ type: 'getContexts' }, (response) => {
    const contexts = response?.contexts || [];

    if (contexts.length === 0) {
      contextList.innerHTML = '<div class="empty">No captured contexts yet.</div>';
      return;
    }

    contextList.innerHTML = contexts.slice(0, 10).map(ctx => `
      <div class="context-item">
        <div class="url">${escapeHtml(ctx.url || '')}</div>
        <div class="title">${escapeHtml(ctx.title || '')}</div>
        <div class="meta">${ctx.selectedText ? 'Has selection' : ''} ${ctx.colors?.length || 0} colors detected</div>
      </div>
    `).join('');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Check connection status against the configured Continua URL
const continuaBase = (continuaUrlInput.value || 'http://localhost:3000').replace(/\/$/, '');
fetch(`${continuaBase}/api/context/stats`, { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      statusEl.textContent = 'Connected';
      statusEl.className = 'status connected';
    } else {
      statusEl.textContent = 'Not connected';
    }
  })
  .catch(() => {
    statusEl.textContent = 'Offline';
  });

// Initial load
loadContexts();
