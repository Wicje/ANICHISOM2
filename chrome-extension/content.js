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
