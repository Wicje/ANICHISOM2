const fs = require('fs');
const path = '/home/zk3/workstation/experiments/ANICHISOM2/components/apps/productivity-suite.tsx';
let code = fs.readFileSync(path, 'utf-8');

// 1. Add states to ProductivitySuite
code = code.replace(
  `const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');`,
  `const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');\n  const [activeSheetCell, setActiveSheetCell] = useState<string>('A1');\n  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);\n  const [totalSlides, setTotalSlides] = useState<number>(1);`
);

// 2. Pass props to SheetsEditor & SlidesEditor
code = code.replace(
  `<SheetsEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} dataRef={sheetsDataRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} />`,
  `<SheetsEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} dataRef={sheetsDataRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} activeCell={activeSheetCell} setActiveCell={setActiveSheetCell} />`
);
code = code.replace(
  `<SlidesEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} canvasRef={fabricCanvasRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} />`,
  `<SlidesEditor workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} canvasRef={fabricCanvasRef} collab={collab} onDirty={() => setSaveStatus('unsaved')} onSlideChange={(idx, total) => { setActiveSlideIndex(idx); setTotalSlides(total); }} />`
);

// 3. Fix Sheets status bar
code = code.replace(
  `{activeTab === 'sheets' && <span>Cell: B4</span>}`,
  `{activeTab === 'sheets' && <span>Cell: {activeSheetCell || 'A1'}</span>}`
);
code = code.replace(
  `{activeTab === 'slides' && <span>Slide 1 of 5</span>}`,
  `{activeTab === 'slides' && <span>Slide {activeSlideIndex + 1} of {totalSlides}</span>}`
);

// 4. Fix Formula Bar
code = code.replace(
  `               <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1">\n                 <span className="text-slate-400">fx</span>\n                 <input type="text" className="bg-transparent outline-none flex-1 font-mono text-slate-700" placeholder="=SUM(A1:A10)" />\n               </div>`,
  `               <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1">
                 <span className="text-slate-400">fx</span>
                 <input 
                   type="text" 
                   className="bg-transparent outline-none flex-1 font-mono text-slate-700" 
                   value={sheetsDataRef.current?.[activeSheetCell] || ''}
                   onChange={(e) => {
                      const cellsMap = collab.sharedTypesRef.current.cells;
                      if (cellsMap) {
                         cellsMap.set(activeSheetCell, e.target.value);
                         setSaveStatus('unsaved');
                      }
                   }}
                   placeholder="=SUM(A1:A10)" 
                 />
               </div>`
);

// 5. Update SheetsEditor props
code = code.replace(
  `function SheetsEditor({ workspaceMode, projectId, currentUser, dataRef, collab, onDirty }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, dataRef: React.MutableRefObject<Record<string, string>>, collab: CollaborativeDocState, onDirty?: () => void }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [activeCell, setActiveCell] = useState<string | null>(null);`,
  `function SheetsEditor({ workspaceMode, projectId, currentUser, dataRef, collab, onDirty, activeCell, setActiveCell }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, dataRef: React.MutableRefObject<Record<string, string>>, collab: CollaborativeDocState, onDirty?: () => void, activeCell: string, setActiveCell: (c: string) => void }) {
  const [data, setData] = useState<Record<string, string>>({});`
);

// 6. Update SlidesEditor props
code = code.replace(
  `function SlidesEditor({ workspaceMode, projectId, currentUser, canvasRef, collab, onDirty }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, canvasRef: React.MutableRefObject<any>, collab: CollaborativeDocState, onDirty?: () => void }) {`,
  `function SlidesEditor({ workspaceMode, projectId, currentUser, canvasRef, collab, onDirty, onSlideChange }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, canvasRef: React.MutableRefObject<any>, collab: CollaborativeDocState, onDirty?: () => void, onSlideChange?: (idx: number, total: number) => void }) {`
);

code = code.replace(
  `  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);`,
  `  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  
  useEffect(() => {
     if (onSlideChange) {
        onSlideChange(slideOrder.indexOf(activeSlideId || '') || 0, slideOrder.length || 1);
     }
  }, [activeSlideId, slideOrder.length]);`
);

fs.writeFileSync(path, code);
console.log('ProductivitySuite MIN fixes applied.');
