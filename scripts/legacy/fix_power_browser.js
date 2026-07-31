const fs = require('fs');

const filePath = 'components/apps/power-browser.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// Bug 1: Split View loads nothing
if (!code.includes('splitUrl')) {
  code = code.replace(
    `const [splitViewTarget, setSplitViewTarget] = useState<string | null>(null);`,
    `const [splitViewTarget, setSplitViewTarget] = useState<string | null>(null);\n  const [splitUrl, setSplitUrl] = useState('https://duckduckgo.com/');\n  const [splitInputUrl, setSplitInputUrl] = useState('');`
  );

  const splitViewPlaceholder = `{/* Split View Panel */}`;
  // Let's replace the whole splitView div
  const splitViewRegex = /\{splitView && \([\s\S]*?<Columns className="w-8 h-8 mx-auto mb-2 opacity-50" \/>[\s\S]*?<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*\)}/;
  code = code.replace(splitViewRegex, `{splitView && (
          <div className="w-1/2 border-l border-black/10 flex flex-col">
            <div className="h-10 flex items-center gap-2 px-3 border-b border-black/10 bg-slate-50 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); if (splitInputUrl) setSplitUrl(splitInputUrl.startsWith('http') ? splitInputUrl : \`https://\${splitInputUrl}\`); }} className="flex-1 flex items-center gap-2 bg-white border border-black/10 px-3 py-1 rounded-full text-sm">
                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                <input value={splitInputUrl} onChange={e => setSplitInputUrl(e.target.value)} placeholder="Enter URL" className="flex-1 outline-none text-sm text-slate-700 bg-transparent" />
              </form>
              <button onClick={() => toggleSplitView()} className="p-1 rounded hover:bg-black/5 text-slate-400"><X className="w-3.5 h-3.5" /></button>
            </div>
            <iframe
              src={splitUrl.startsWith('http') ? \`/api/proxy?url=\${encodeURIComponent(splitUrl)}\` : splitUrl}
              className="flex-1 border-none bg-white"
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
            />
          </div>
        )}`);
  console.log('Fixed split view');
}

// Bug 2: handleIframeError
code = code.replace(
  `const handleIframeError = (tabId: string) => {\n    setBlockedTabs(prev => new Set([...prev, tabId]));\n  };`,
  `const handleIframeError = (tabId: string) => {\n    setLoading(false);\n    setBlockedTabs(prev => new Set([...prev, tabId]));\n  };`
);

// Bug 3: sandbox allow-same-origin
code = code.replace(
  `sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"`,
  `sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"`
);

// Bug 4: Smart URLs
if (!code.includes('getSmartUrl')) {
  code = code.replace(
    `const handleSubmit = (e: React.FormEvent) => {`,
    `function getSmartUrl(rawUrl: string): string {
    if (rawUrl.includes('figma.com/file/') || rawUrl.includes('figma.com/design/')) {
      return \`https://www.figma.com/embed?embed_host=continuaos&url=\${encodeURIComponent(rawUrl)}\`;
    }
    const ytMatch = rawUrl.match(/youtube\\.com\\/watch\\?v=([^&]+)/);
    if (ytMatch) return \`https://www.youtube.com/embed/\${ytMatch[1]}\`;
    const spMatch = rawUrl.match(/open\\.spotify\\.com\\/(track|playlist|album)\\/([^?]+)/);
    if (spMatch) return \`https://open.spotify.com/embed/\${spMatch[1]}/\${spMatch[2]}\`;
    return rawUrl;
  }
  
  const handleSubmit = (e: React.FormEvent) => {`
  );
  
  code = code.replace(
    `navigateTab(activeTabId, finalUrl, '');`,
    `const smartUrl = getSmartUrl(finalUrl);\n    navigateTab(activeTabId, smartUrl, '');`
  );
  console.log('Fixed smart URLs');
}

fs.writeFileSync(filePath, code);
