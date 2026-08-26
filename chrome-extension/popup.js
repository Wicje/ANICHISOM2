document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const saveBtn = document.getElementById('saveBtn');
  const captureBtn = document.getElementById('captureBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load saved URL
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['continuaUrl'], (result) => {
      if (result.continuaUrl) {
        urlInput.value = result.continuaUrl;
      } else {
        urlInput.value = 'http://localhost:3000';
      }
      checkBackendStatus(urlInput.value);
    });
  }

  // Check if Continua backend is reachable
  async function checkBackendStatus(url) {
    if (!statusDot || !statusText) return;
    const badge = document.getElementById('backendStatus');
    statusDot.className = 'w-2 h-2 rounded-full bg-yellow-400 animate-pulse';
    statusText.textContent = 'Checking...';
    if (badge) badge.className = 'status-badge checking';

    try {
      const resp = await fetch(`${url}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        statusText.textContent = 'Connected';
        if (badge) badge.className = 'status-badge';
      } else {
        statusDot.className = 'w-2 h-2 rounded-full bg-red-400';
        statusText.textContent = 'Backend error';
        if (badge) badge.className = 'status-badge offline';
      }
    } catch {
      statusDot.className = 'w-2 h-2 rounded-full bg-red-400';
      statusText.textContent = 'Offline';
      if (badge) badge.className = 'status-badge offline';
    }
  }

  // Save workspace URL
  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim() || 'http://localhost:3000';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ continuaUrl: url }, () => {
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'setContinuaUrl', url });
        }
        saveBtn.textContent = 'Saved!';
        checkBackendStatus(url);
        setTimeout(() => {
          saveBtn.textContent = 'Save Workspace URL';
        }, 1500);
      });
    }
  });

  // Capture current tab
  captureBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      captureBtn.textContent = 'Capturing...';
      captureBtn.disabled = true;
      chrome.runtime.sendMessage({ type: 'captureNow' }, (response) => {
        captureBtn.disabled = false;
        if (response && response.success) {
          captureBtn.textContent = 'Context Synced!';
          // Show context count
          chrome.storage.local.get('continuaContext', (data) => {
            const count = (data.continuaContext || []).length;
            if (count > 0) {
              setTimeout(() => {
                captureBtn.textContent = `${count} context${count !== 1 ? 's' : ''} captured`;
                setTimeout(() => {
                  captureBtn.textContent = 'Capture Current Tab';
                }, 2000);
              }, 1500);
            }
          });
        } else {
          captureBtn.textContent = 'Capture Failed';
          setTimeout(() => {
            captureBtn.textContent = 'Capture Current Tab';
          }, 1500);
        }
      });
    }
  });
});
