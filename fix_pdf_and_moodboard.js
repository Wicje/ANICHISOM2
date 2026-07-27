const fs = require('fs');

// PDF Reader
const pdfPath = 'components/apps/pdf-reader.tsx';
let pdfCode = fs.readFileSync(pdfPath, 'utf-8');

pdfCode = pdfCode.replace(
  `className="w-full h-full rounded shadow-2xl bg-white"`,
  `className="rounded shadow-2xl bg-white origin-top"\n            style={{\n              width: \`\${100 / (zoom / 100)}%\`,\n              height: \`\${100 / (zoom / 100)}%\`,\n              transform: \`scale(\${zoom / 100})\`,\n              transformOrigin: 'top left',\n            }}`
);
pdfCode = pdfCode.replace(
  `<button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Print">`,
  `<button onClick={() => { const iframe = document.querySelector('iframe[title="' + title + '"]'); if(iframe) (iframe as any).contentWindow?.print(); }} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Print">`
);
pdfCode = pdfCode.replace(
  `<button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Download">`,
  `<button onClick={() => { if (pdfUrl) { const a = document.createElement('a'); a.href = pdfUrl; a.download = title; a.click(); }}} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Download">`
);

fs.writeFileSync(pdfPath, pdfCode);
console.log('Fixed PDF Reader');

// Moodboard
const mbPath = 'components/apps/moodboard/index.tsx';
let mbCode = fs.readFileSync(mbPath, 'utf-8');

if (!mbCode.includes('presentDivRef')) {
  mbCode = mbCode.replace(
    `const [presentMode, setPresentMode] = useState(false);`,
    `const [presentMode, setPresentMode] = useState(false);\n  const presentDivRef = useRef<HTMLDivElement>(null);\n  useEffect(() => { if (presentMode) presentDivRef.current?.focus(); }, [presentMode]);`
  );
  mbCode = mbCode.replace(
    `<div\n        className="w-full h-full bg-[#111] overflow-hidden relative outline-none flex items-center justify-center"`,
    `<div\n        ref={presentDivRef}\n        className="w-full h-full bg-[#111] overflow-hidden relative outline-none flex items-center justify-center"`
  );
  console.log('Fixed Moodboard presentMode autoFocus');
}

fs.writeFileSync(mbPath, mbCode);
