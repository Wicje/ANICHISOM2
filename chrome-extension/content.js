// Inject a meta tag or set a global window variable to notify the OS that the extension is active.
// We use a script tag to set the variable in the main page context.
const script = document.createElement('script');
script.textContent = `
  window.__CONTINUA_EXTENSION_ACTIVE__ = true;
  window.dispatchEvent(new CustomEvent('continua-extension-ready'));
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Also add an invisible div marker just in case
const marker = document.createElement('div');
marker.id = 'continua-extension-marker';
marker.style.display = 'none';
document.documentElement.appendChild(marker);

// ─── Download capture (embedded frames only) ─────────────────────────────
// When ContinuaOS renders this site in an iframe, intercept download links
// and hand them to the OS so files stay inside the OS instead of escaping
// to the machine's default Downloads folder.
(function () {
  if (window === window.top) return; // only act when embedded

  const FILE_EXT_RE = /\.(pdf|zip|tar|gz|tgz|rar|7z|bz2|png|jpe?g|gif|webp|svg|bmp|ico|tiff?|mp[34]|mov|webm|mkv|avi|flac|wav|ogg|aac|docx?|xlsx?|pptx?|odt|ods|csv|txt|rtf|md|psd|ai|fig|figma|sketch|ttf|otf|woff2?|eot|json|xml|apk|ipa|exe|msi|dmg|deb|rpm)([?#]|$)/i;

  const MAX_BLOB_BYTES = 50 * 1024 * 1024;

  function filenameFromUrl(url, fallback) {
    try {
      const pathname = new URL(url, location.href).pathname;
      const base = pathname.split('/').filter(Boolean).pop();
      if (base && base.indexOf('.') !== -1) return decodeURIComponent(base);
    } catch (e) { /* ignore */ }
    return fallback || 'download';
  }

  function sendToOS(url, filename, mimeType) {
    try {
      window.parent.postMessage({
        source: 'continua-extension',
        type: 'continua-download',
        url: url || '',
        filename: filename || undefined,
        mimeType: mimeType || undefined,
      }, '*');
    } catch (e) { /* ignore */ }
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    var anchor = null;
    while (target && target !== document && !(anchor = target.closest ? target.closest('a[href]') : null)) {
      target = target.parentNode;
    }
    if (!anchor) return;

    var isExplicitDownload = anchor.hasAttribute('download');
    var href = anchor.href || '';
    var looksLikeFile = false;
    try {
      looksLikeFile = FILE_EXT_RE.test(new URL(href).pathname);
    } catch (e) { /* ignore */ }
    if (!isExplicitDownload && !looksLikeFile) return;

    // Don't hijack links that open new tabs on purpose.
    if (anchor.target && (anchor.target === '_blank' || anchor.target === '_top')) return;

    event.preventDefault();
    event.stopPropagation();

    var filename = anchor.getAttribute('download') || filenameFromUrl(href, 'download');
    var isBlob = href.indexOf('blob:') === 0;

    if (isBlob) {
      // Blob URLs can't be re-fetched by the OS — grab the bytes here.
      fetch(href).then(function (res) {
        return res.blob();
      }).then(function (blob) {
        if (blob.size > MAX_BLOB_BYTES) return sendToOS(null, filename, blob.type);
        return blob.arrayBuffer().then(function (buf) {
          try {
            window.parent.postMessage({
              source: 'continua-extension',
              type: 'continua-download',
              url: '',
              filename: filename,
              mimeType: blob.type,
              blob: buf,
              blobType: blob.type,
            }, '*');
          } catch (e) {
            // Payload too large to clone — let the OS name it from the blob.
            sendToOS(null, filename, blob.type);
          }
        });
      }).catch(function () {
        sendToOS(null, filename, '');
      });
      return;
    }

    sendToOS(href, filename, '');
  }, true);
})();
