const fs = require('fs');

function applyFix(filePath, searchValue, replaceValue) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  let code = fs.readFileSync(filePath, 'utf-8');
  if (code.includes(searchValue)) {
    code = code.replace(searchValue, replaceValue);
    fs.writeFileSync(filePath, code);
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`Could not find target in ${filePath}`);
  }
}

// 1. Screen Recorder
applyFix(
  'components/apps/screen-recorder.tsx',
  `displayStream.getVideoTracks()[0]!.onended = () => {`,
  `displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {`
);
applyFix(
  'components/apps/screen-recorder.tsx',
  `    const recording = isRecordingRef.current;
    if (recording) stopRecording();
    streamRef.current = null;
    setStream(null);
  };`,
  `    const recording = isRecordingRef.current;
    if (recording) stopRecording();
    streamRef.current = null;
    setStream(null);
  });`
);
applyFix(
  'components/apps/screen-recorder.tsx',
  `recorder.start();`,
  `recorder.start(1000);`
);

// 2. Client Portal
applyFix(
  'components/apps/client-portal.tsx',
  `<button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-bold rounded transition-colors flex items-center gap-1.5">`,
  `<button onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Proposal Approved', description: 'Client approved the proposal for ' + campaign.name, type: 'success' }}))} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-bold rounded transition-colors flex items-center gap-1.5">`
);
applyFix(
  'components/apps/client-portal.tsx',
  `<button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded transition-colors border border-white/10">`,
  `<button onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Changes Requested', description: 'Change request sent to the team', type: 'info' }}))} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded transition-colors border border-white/10">`
);
applyFix(
  'components/apps/client-portal.tsx',
  `{Object.entries(node.reactions).map(([emoji, count]) => (
                    <span key={emoji} className="text-[9px] text-white/40">{emoji} {count as number}</span>
                  ))}`,
  `{Object.entries(node.reactions).map(([emoji, users]) => (
                    <span key={emoji} className="text-[9px] text-white/40">{emoji} {Array.isArray(users) ? users.length : users as number}</span>
                  ))}`
);
applyFix(
  'components/apps/client-portal.tsx',
  `author: 'Client',`,
  `author: 'Client', // TODO: sync with user`
);

// 3. Calls App
applyFix(
  'components/apps/calls.tsx',
  `const link = \`https://meet.google.com/new\`;`,
  `const link = roomCode.trim() ? \`https://meet.google.com/\${roomCode.trim()}\` : \`https://meet.google.com/new\`;`
);
// Replace iframe in calls
const callsPath = 'components/apps/calls.tsx';
let callsCode = fs.readFileSync(callsPath, 'utf-8');
const iframeRegex = /<iframe[^>]*src="https:\/\/meet\.google\.com\/new"[^>]*><\/iframe>/g;
if (iframeRegex.test(callsCode)) {
  callsCode = callsCode.replace(iframeRegex, 
    `<div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center bg-black/20">
        <Video className="w-16 h-16 text-blue-400" />
        <h2 className="text-xl font-medium">Meeting Ready</h2>
        <p className="text-white/50 text-sm">Room: <span className="text-white font-mono">{activeRoom}</span></p>
        <p className="text-white/40 text-xs max-w-xs">Google Meet cannot be embedded due to browser security restrictions. Open it in a new tab to join your call.</p>
        <button onClick={() => window.open(\`https://meet.google.com/\${roomCode.trim() || 'new'}\`, '_blank')} className="px-6 py-3 bg-blue-500 hover:bg-blue-400 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <ExternalLink className="w-4 h-4" /> Open in Google Meet
        </button>
        <button onClick={() => setActiveRoom(null)} className="text-xs text-white/40 hover:text-white">← Back</button>
      </div>`
  );
  fs.writeFileSync(callsPath, callsCode);
  console.log('Fixed calls iframe');
}

// 4. Terminal App
applyFix(
  'components/apps/terminal.tsx',
  `const PROMPT = () => \`\\x1b[36m\${currentUser?.name || 'user'}\\x1b[0m:\\x1b[35m~\\x1b[0m$ \`;`,
  `const currentUserRef = useRef(currentUser); useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]); const PROMPT = () => \`\\x1b[36m\${currentUserRef.current?.name || 'user'}\\x1b[0m:\\x1b[35m~\\x1b[0m$ \`;`
);

// 5. Proposal Generator
applyFix(
  'components/apps/proposal-generator.tsx',
  `<button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70">`,
  `<button onClick={() => { const content = aiContent || projectScope; const blob = new Blob([\`PROPOSAL FOR: \${clientName}\\n\\n\${content}\`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = \`Proposal-\${clientName.replace(/\\s+/g, '_')}.txt\`; a.click(); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70">`
);
applyFix(
  'components/apps/proposal-generator.tsx',
  `alert(\`Proposal sent to \${clientName}!\`);`,
  `window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Proposal Sent', description: \`Proposal delivered to \${clientName}\`, type: 'success' } }));`
);
applyFix(
  'components/apps/proposal-generator.tsx',
  `setPhases([]);`,
  `const lines = text.split('\\n').filter(l => l.trim().length > 5).slice(0, 6); setPhases(lines);`
);

// 6. Media Player
applyFix(
  'components/apps/media-player.tsx',
  `if (!currentFileUrl && mediaFiles.length > 0) {
      setCurrentFileUrl(mediaFiles[0]!.content || mediaFiles[0]!.id);
      setCurrentMimeType(mediaFiles[0]!.mimeType);
      setCurrentTitle(mediaFiles[0]!.name);
    }`,
  `useEffect(() => { if (!currentFileUrl && mediaFiles.length > 0 && mediaFiles[0]) { setCurrentFileUrl(mediaFiles[0].content || mediaFiles[0].id); setCurrentMimeType(mediaFiles[0].mimeType); setCurrentTitle(mediaFiles[0].name); } }, [mediaFiles, currentFileUrl]);`
);
applyFix(
  'components/apps/media-player.tsx',
  `playlistArray.push([JSON.stringify({`,
  `playlistArray.push([{`
);
applyFix(
  'components/apps/media-player.tsx',
  `}])`,
  `}])` // wait, I can just fix this by replacing the exact line, but it spans multiple lines. Let's do it below
);

// Custom Media Player playlist fix
let mpCode = fs.readFileSync('components/apps/media-player.tsx', 'utf-8');
mpCode = mpCode.replace(/playlistArray\.push\(\[JSON\.stringify\(\{([\s\S]*?)\}\)\]\);/g, "playlistArray.push([{$1}]);");
fs.writeFileSync('components/apps/media-player.tsx', mpCode);
console.log('Fixed media player array push');

// 7. Campaign Lab
applyFix(
  'components/apps/campaign-lab/index.tsx',
  `<button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">`,
  `<button onClick={() => {
    const email = (document.getElementById('invite-email-input') as HTMLInputElement)?.value;
    const permission = (document.getElementById('invite-permission-select') as HTMLSelectElement)?.value;
    if (!email || !activePage) return;
    updatePage(activePage.id, {
      share: {
        ...activePage.share || { shareLinks: [], invitedUsers: [] },
        invitedUsers: [
          ...(activePage.share?.invitedUsers || []),
          { id: crypto.randomUUID(), name: email, email, permission: permission as any || 'viewer' },
        ],
      },
    });
    const el = document.getElementById('invite-email-input') as HTMLInputElement;
    if (el) el.value = '';
  }} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">`
);
applyFix(
  'components/apps/campaign-lab/index.tsx',
  `<button className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors" title="Copy Link">`,
  `<button onClick={() => navigator.clipboard.writeText(\`https://os.continuaos.com/c/\${activePage.id}\`)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors" title="Copy Link">`
);
applyFix(
  'components/apps/campaign-lab/index.tsx',
  `left-5.5`,
  `left-[22px]`
);
applyFix(
  'components/apps/campaign-lab/index.tsx',
  `<button className="p-1 hover:bg-black/5 rounded relative" title={\`\${unreadCount} unread notifications\`}>`,
  `<button onClick={() => alert('Notifications panel toggled')} className="p-1 hover:bg-black/5 rounded relative" title={\`\${unreadCount} unread notifications\`}>`
);

// 8. Desktop / Clipboard Shortcut
let desktopCode = fs.readFileSync('components/desktop/index.tsx', 'utf-8');
if (!desktopCode.includes('useScreenshotStore')) {
  desktopCode = desktopCode.replace(
    `import { useWindowStore } from '@/lib/stores/window.store';`,
    `import { useWindowStore } from '@/lib/stores/window.store';\nimport { useScreenshotStore } from '@/lib/stores/screenshot.store';\nimport { useClipboardUIStore } from '@/lib/stores/clipboard.store';`
  );
  desktopCode = desktopCode.replace(
    `const { currentScale } = useInterfaceScale();`,
    `const { currentScale } = useInterfaceScale();\n  const startScreenshot = useScreenshotStore((s) => s.start);\n  const openClipboard = useClipboardUIStore((s) => s.open);\n  useEffect(() => {\n    const handleKey = (e: KeyboardEvent) => {\n      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '3') {\n        e.preventDefault();\n        startScreenshot();\n      }\n      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {\n        e.preventDefault();\n        openClipboard();\n      }\n    };\n    window.addEventListener('keydown', handleKey);\n    return () => window.removeEventListener('keydown', handleKey);\n  }, [startScreenshot, openClipboard]);`
  );
  fs.writeFileSync('components/desktop/index.tsx', desktopCode);
  console.log('Fixed desktop shortcuts');
}

