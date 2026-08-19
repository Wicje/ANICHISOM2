document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const saveBtn = document.getElementById('saveBtn');
  const captureBtn = document.getElementById('captureBtn');

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['continuaUrl'], (result) => {
      if (result.continuaUrl) {
        urlInput.value = result.continuaUrl;
      } else {
        urlInput.value = 'http://localhost:3000';
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim() || 'http://localhost:3000';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ continuaUrl: url }, () => {
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'setContinuaUrl', url });
        }
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
          saveBtn.textContent = 'Save Workspace URL';
        }, 1500);
      });
    }
  });

  captureBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      captureBtn.textContent = 'Capturing...';
      chrome.runtime.sendMessage({ type: 'captureNow' }, (response) => {
        if (response && response.success) {
          captureBtn.textContent = 'Context Synced!';
        } else {
          captureBtn.textContent = 'Capture Failed';
        }
        setTimeout(() => {
          captureBtn.textContent = 'Capture Current Tab Context';
        }, 1500);
      });
    }
  });
});
